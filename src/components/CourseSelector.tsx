import { Link } from 'react-router-dom';
import { BookOpen, ChevronRight, Download, ExternalLink } from 'lucide-react';
import type { CourseInfo } from '../types';
import { ThemeToggle } from './ThemeToggle';
import { Footer } from './Footer';

interface CourseSelectorProps {
    courses: CourseInfo[];
}

export function CourseSelector({ courses }: CourseSelectorProps) {
    return (
        <div className="min-h-screen bg-theme-bg flex items-center justify-center p-6">
            <div className="w-full max-w-lg">
                <div className="flex justify-between items-center mb-4">
                    <a
                        href="https://arthals.ink"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 text-sm text-theme-text-secondary hover:text-theme-text transition-colors">
                        <ExternalLink className="w-4 h-4" />
                        作者博客
                    </a>
                    <ThemeToggle />
                </div>

                <div className="border border-theme-border rounded-lg bg-theme-card p-8">
                    <div className="flex items-center justify-center gap-3 mb-6">
                        <BookOpen className="w-8 h-8 text-theme-accent flex-shrink-0" />
                        <h1 className="text-xl sm:text-2xl font-semibold text-theme-text whitespace-nowrap">
                            北京大学医学部刷题网站
                        </h1>
                    </div>

                    <p className="text-theme-text-secondary text-center text-sm mb-6">请选择要练习的课程题库</p>

                    <div className="space-y-3">
                        {courses.map((course) => (
                            <div
                                key={course.slug}
                                className="flex items-center gap-2 p-4 rounded-lg border border-theme-border bg-theme-elevated hover:border-theme-border-light hover:bg-theme-card transition-all group">
                                <Link to={`/course/${course.slug}`} className="flex items-center flex-1 gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-theme-accent/10 flex items-center justify-center">
                                        <BookOpen className="w-5 h-5 text-theme-accent" />
                                    </div>
                                    <span className="text-theme-text font-medium">{course.title}</span>
                                </Link>
                                <div className="flex items-center gap-2">
                                    {course.source && (
                                        <a
                                            href={`/data/${course.source}`}
                                            download={course.source}
                                            onClick={(e) => e.stopPropagation()}
                                            className="p-2 rounded-md text-theme-text-muted hover:text-theme-accent hover:bg-theme-accent/10 transition-colors"
                                            title="下载原始题库">
                                            <Download className="w-4 h-4" />
                                        </a>
                                    )}
                                    <ChevronRight className="w-5 h-5 text-theme-text-muted group-hover:text-theme-text transition-colors" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <Footer showShortcuts={true} />
            </div>
        </div>
    );
}
