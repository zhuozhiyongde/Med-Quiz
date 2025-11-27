import { Link } from 'react-router-dom';
import { BookOpen, ChevronRight } from 'lucide-react';
import type { CourseInfo } from '../types';
import { ThemeToggle } from './ThemeToggle';

interface CourseSelectorProps {
    courses: CourseInfo[];
}

export function CourseSelector({ courses }: CourseSelectorProps) {
    return (
        <div className="min-h-screen bg-theme-bg flex items-center justify-center p-6">
            <div className="w-full max-w-lg">
                <div className="flex justify-end mb-4">
                    <ThemeToggle />
                </div>

                <div className="border border-theme-border rounded-lg bg-theme-card p-8">
                    <div className="flex items-center justify-center gap-3 mb-6">
                        <BookOpen className="w-8 h-8 text-theme-accent" />
                        <h1 className="text-2xl font-semibold text-theme-text">选择课程</h1>
                    </div>

                    <p className="text-theme-text-secondary text-center text-sm mb-6">请选择要练习的课程题库</p>

                    <div className="space-y-3">
                        {courses.map((course) => (
                            <Link
                                key={course.slug}
                                to={`/course/${course.slug}`}
                                className="flex items-center justify-between p-4 rounded-lg border border-theme-border bg-theme-elevated hover:border-theme-border-light hover:bg-theme-card transition-all group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-theme-accent/10 flex items-center justify-center">
                                        <BookOpen className="w-5 h-5 text-theme-accent" />
                                    </div>
                                    <span className="text-theme-text font-medium">{course.title}</span>
                                </div>
                                <ChevronRight className="w-5 h-5 text-theme-text-muted group-hover:text-theme-text transition-colors" />
                            </Link>
                        ))}
                    </div>
                </div>

                <p className="text-theme-text-muted text-xs text-center mt-4">
                    快捷键：1-5 或 ASDFG 选择 · ← → 切换题目 · 空格 下一题/跳过
                </p>

                <p className="text-theme-text-muted text-xs text-center mt-4">
                    如果你想投稿更多题目，欢迎联系我：
                    <a
                        href="mailto:zhuozhiyongde@126.com"
                        className="text-theme-text-muted hover:text-theme-text transition-colors">
                        <code>zhuozhiyongde@126.com</code>
                    </a>
                </p>

                <p className="text-theme-text-muted text-xs text-center mt-4">
                    网站制作：21 级预防医学{' '}
                    <a
                        href="https://arthals.ink"
                        className="text-theme-text-muted hover:text-theme-text transition-colors">
                        卓致用
                    </a>
                </p>
            </div>
        </div>
    );
}
