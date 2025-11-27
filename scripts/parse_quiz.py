#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
解析选择题库，生成JSON格式
支持单级课程和带章节的二级课程
输出到 Med-Quiz/src/data 目录
"""

import re
import json
import os
from pathlib import Path
from dataclasses import dataclass, field


@dataclass
class Chapter:
    """章节数据结构"""

    title: str
    questions: list = field(default_factory=list)


def get_course_slug(title: str) -> str:
    """从标题生成URL友好的slug"""
    slug = re.sub(r"[^\w\u4e00-\u9fff]", "", title)
    return slug


def parse_question_block(block: str) -> dict | None:
    """解析单个题目块，返回题目字典或None"""
    block = block.strip()
    if not block:
        return None

    current_question = {
        "title": "",
        "options": {},
        "answer": "",
        "explanation": "",
    }

    block_lines = block.split("\n")

    for line in block_lines:
        stripped = line.strip()
        if not stripped:
            continue

        # 跳过部分标题
        if stripped.startswith("第") and "部分" in stripped:
            continue

        # 检查是否是选项行
        opt_match = re.match(r"^([A-E])\.\s*(.+)$", stripped)

        # 检查是否是答案行
        if stripped.startswith("【参考答案】"):
            current_question["answer"] = stripped.replace("【参考答案】", "").strip()
            continue

        # 检查是否是解析行
        if stripped.startswith("【解析】"):
            current_question["explanation"] = stripped.replace("【解析】", "").strip()
            continue

        # 如果是选项
        if opt_match:
            current_question["options"][opt_match.group(1)] = opt_match.group(2)
            continue

        # 否则是题目内容
        if not current_question["title"]:
            current_question["title"] = stripped
        elif not current_question["options"]:
            # 题目可能跨行
            current_question["title"] += " " + stripped

    # 验证题目有效性
    if not current_question["options"] or not current_question["answer"]:
        return None

    # 转换为最终格式
    answers = re.findall(r"[A-E]", current_question["answer"])
    q_type = "multiple" if len(answers) > 1 else "single"

    return {
        "type": q_type,
        "title": current_question["title"],
        "options": current_question["options"],
        "answers": answers,
        "explanation": current_question["explanation"],
    }


def parse_quiz_file(filepath: str) -> tuple[list[dict], list[Chapter]]:
    """
    解析题库文件，返回 (所有题目列表, 章节列表)
    如果文件中有 ## 开头的章节标题，则返回章节列表
    否则章节列表为空
    """
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    lines = content.split("\n")

    # 检查是否有章节标题 (## 开头)
    has_chapters = any(line.strip().startswith("## ") for line in lines)

    all_questions = []
    chapters = []

    if has_chapters:
        # 按章节分割内容
        current_chapter = None
        current_content = []

        for line in lines:
            stripped = line.strip()

            # 跳过一级标题
            if stripped.startswith("# ") and not stripped.startswith("## "):
                continue

            # 检测章节标题
            if stripped.startswith("## "):
                # 保存上一个章节
                if current_chapter is not None and current_content:
                    chapter_questions = parse_content_block("\n".join(current_content))
                    current_chapter.questions = chapter_questions
                    all_questions.extend(chapter_questions)
                    chapters.append(current_chapter)

                # 开始新章节
                chapter_title = stripped[3:].strip()
                current_chapter = Chapter(title=chapter_title)
                current_content = []
            else:
                current_content.append(line)

        # 保存最后一个章节
        if current_chapter is not None and current_content:
            chapter_questions = parse_content_block("\n".join(current_content))
            current_chapter.questions = chapter_questions
            all_questions.extend(chapter_questions)
            chapters.append(current_chapter)
    else:
        # 没有章节，按原有逻辑处理
        # 过滤掉以 # 开头的行
        filtered_lines = [line for line in lines if not line.strip().startswith("#")]
        content = "\n".join(filtered_lines)
        all_questions = parse_content_block(content)

    return all_questions, chapters


def parse_content_block(content: str) -> list[dict]:
    """解析内容块中的所有题目"""
    # 以2个换行分割题目块
    blocks = re.split(r"\n\s*\n", content)

    questions = []
    for block in blocks:
        question = parse_question_block(block)
        if question:
            questions.append(question)

    return questions


def save_course_with_chapters(
    output_dir: str,
    slug: str,
    title: str,
    description: str,
    all_questions: list[dict],
    chapters: list[Chapter],
):
    """保存带章节的课程数据"""
    course_dir = os.path.join(output_dir, slug)
    os.makedirs(course_dir, exist_ok=True)

    # 保存 all.json (所有题目)
    all_file = os.path.join(course_dir, "all.json")
    with open(all_file, "w", encoding="utf-8") as f:
        json.dump(
            {
                "title": title,
                "description": description,
                "questions": all_questions,
            },
            f,
            ensure_ascii=False,
            indent=2,
        )
    print(f"已保存到: {all_file}")

    # 保存各章节 JSON
    chapter_info = []
    for idx, chapter in enumerate(chapters, 1):
        chapter_file = os.path.join(course_dir, f"{idx}.json")
        with open(chapter_file, "w", encoding="utf-8") as f:
            json.dump(
                {
                    "title": f"{title} - {chapter.title}",
                    "description": f"{description} - {chapter.title}",
                    "questions": chapter.questions,
                },
                f,
                ensure_ascii=False,
                indent=2,
            )
        print(f"已保存到: {chapter_file}")

        chapter_info.append(
            {
                "id": str(idx),
                "title": chapter.title,
                "questionCount": len(chapter.questions),
            }
        )

    # 保存章节索引 index.json
    index_file = os.path.join(course_dir, "index.json")
    with open(index_file, "w", encoding="utf-8") as f:
        json.dump(
            {
                "title": title,
                "description": description,
                "totalQuestions": len(all_questions),
                "chapters": chapter_info,
            },
            f,
            ensure_ascii=False,
            indent=2,
        )
    print(f"已保存到: {index_file}")


def save_course_flat(
    output_dir: str, slug: str, title: str, description: str, questions: list[dict]
):
    """保存单层课程数据（无章节）"""
    output_file = os.path.join(output_dir, f"{slug}.json")
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(
            {
                "title": title,
                "description": description,
                "questions": questions,
            },
            f,
            ensure_ascii=False,
            indent=2,
        )
    print(f"已保存到: {output_file}")


def update_course_index(
    output_dir: str, slug: str, title: str, source: str, has_chapters: bool
):
    """更新课程索引文件"""
    index_path = os.path.join(output_dir, "index.json")

    if os.path.exists(index_path):
        with open(index_path, "r", encoding="utf-8") as f:
            index = json.load(f)
    else:
        index = {"courses": []}

    existing = next((c for c in index["courses"] if c["slug"] == slug), None)
    course_entry = {
        "slug": slug,
        "title": title,
        "source": source,
        "hasChapters": has_chapters,
    }

    if existing:
        existing.update(course_entry)
    else:
        index["courses"].append(course_entry)

    with open(index_path, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)

    print(f"已更新课程索引")


def process_course(
    input_file: Path,
    output_dir: Path,
    slug: str,
    title: str,
    description: str,
    enable_chapters: bool = True,
):
    """处理单个课程文件

    Args:
        enable_chapters: 是否启用章节解析。如果为 False，即使 MD 文件中有章节标题也会忽略
    """
    print(f"\n处理课程: {title}")
    print(f"输入文件: {input_file}")

    all_questions, chapters = parse_quiz_file(str(input_file))

    # 如果禁用章节解析，忽略检测到的章节
    if not enable_chapters:
        chapters = []

    has_chapters = len(chapters) > 0

    print(f"共解析 {len(all_questions)} 道题目")
    if has_chapters:
        print(f"共 {len(chapters)} 个章节")
        for idx, ch in enumerate(chapters, 1):
            print(f"  {idx}. {ch.title}: {len(ch.questions)} 题")
    else:
        print("单级课程（无章节）")

    os.makedirs(output_dir, exist_ok=True)

    if has_chapters:
        save_course_with_chapters(
            str(output_dir), slug, title, description, all_questions, chapters
        )
    else:
        save_course_flat(str(output_dir), slug, title, description, all_questions)

    source_file = input_file.name
    update_course_index(str(output_dir), slug, title, source_file, has_chapters)


def main():
    script_dir = Path(__file__).parent
    project_dir = script_dir.parent
    data_dir = project_dir / "public" / "data"
    output_dir = project_dir / "src" / "data"

    # 课程配置列表
    # enable_chapters: 是否启用章节解析，默认为 True
    courses = [
        {
            "input_file": data_dir / "公共卫生传播学.txt",
            "slug": "gwcb",
            "title": "公共卫生传播学",
            "description": "本解析依据「公共卫生传播学 Mooc 选择题库标准答案」整理",
            "enable_chapters": True,
        },
        {
            "input_file": data_dir / "健康教育与健康促进.txt",
            "slug": "jkjy",
            "title": "健康教育与健康促进",
            "description": "本解析依据「18级杨子铭」期末复习笔记及公共卫生专业知识整理",
            "enable_chapters": False,  # 不启用章节解析
        },
        {
            "input_file": data_dir / "系统解剖学.txt",
            "slug": "xtjp",
            "title": "系统解剖学",
            "description": "本解析依据「系统解剖学在线闯关网站」整理",
            "enable_chapters": True,
        },
        {
            "input_file": data_dir / "局部解剖学.txt",
            "slug": "jbjp",
            "title": "局部解剖学",
            "description": "本解析依据「局部解剖学在线闯关网站」整理",
            "enable_chapters": True,
        },
        {
            "input_file": data_dir / "病理学.txt",
            "slug": "bl",
            "title": "病理学",
            "description": "本解析依据「病理学题库」整理",
            "enable_chapters": True,
        }
    ]

    for course in courses:
        if course["input_file"].exists():
            process_course(
                course["input_file"],
                output_dir,
                course["slug"],
                course["title"],
                course["description"],
                course.get("enable_chapters", True),
            )
        else:
            print(f"警告: 文件不存在 - {course['input_file']}")


if __name__ == "__main__":
    main()
