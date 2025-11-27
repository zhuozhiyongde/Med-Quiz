#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
解析健康教育与健康促进选择题库，生成JSON格式
输出到 Med-Quiz/src/data 目录
"""

import re
import json
import os
from pathlib import Path


def get_course_slug(title: str) -> str:
    """从标题生成URL友好的slug"""
    slug = re.sub(r"[^\w\u4e00-\u9fff]", "", title)
    return slug


def parse_quiz_file(filepath: str) -> list[dict]:
    """解析题库文件，返回题目列表"""
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # 过滤掉以 # 开头的行
    lines = content.split("\n")
    filtered_lines = [line for line in lines if not line.strip().startswith("#")]
    content = "\n".join(filtered_lines)

    # 以2个换行分割题目块
    blocks = re.split(r"\n\s*\n", content)

    questions = []

    for block in blocks:
        block = block.strip()
        if not block:
            continue

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
                current_question["answer"] = stripped.replace(
                    "【参考答案】", ""
                ).strip()
                continue

            # 检查是否是解析行
            if stripped.startswith("【解析】"):
                current_question["explanation"] = stripped.replace(
                    "【解析】", ""
                ).strip()
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

        # 保存有效的题目（必须有选项和答案）
        if current_question["options"] and current_question["answer"]:
            questions.append(current_question)

    # 转换为最终格式
    result = []
    for q in questions:
        answers = re.findall(r"[A-E]", q["answer"])
        q_type = "multiple" if len(answers) > 1 else "single"

        result.append(
            {
                "type": q_type,
                "title": q["title"],
                "options": q["options"],
                "answers": answers,
                "explanation": q["explanation"],
            }
        )

    return result


def update_course_index(output_dir: str, slug: str, title: str):
    """更新课程索引文件"""
    index_path = os.path.join(output_dir, "index.json")

    if os.path.exists(index_path):
        with open(index_path, "r", encoding="utf-8") as f:
            index = json.load(f)
    else:
        index = {"courses": []}

    existing = next((c for c in index["courses"] if c["slug"] == slug), None)
    if existing:
        existing["title"] = title
    else:
        index["courses"].append({"slug": slug, "title": title})

    with open(index_path, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)


def main():
    script_dir = Path(__file__).parent

    input_file = script_dir / "公共卫生传播学.md"
    output_dir = script_dir / "Med-Quiz" / "src" / "data"

    os.makedirs(output_dir, exist_ok=True)

    questions = parse_quiz_file(str(input_file))

    # 课程信息
    title = "公共卫生传播学"
    description = "本解析依据「公共卫生传播学 Mooc 选择题库标准答案」整理"
    slug = get_course_slug(title)

    # 保存 JSON
    output_file = output_dir / f"{slug}.json"
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

    # 更新索引
    update_course_index(str(output_dir), slug, title)
    print(f"已更新课程索引")


if __name__ == "__main__":
    main()
