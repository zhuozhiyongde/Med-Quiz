import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { BookOpen, ChevronRight, ArrowLeft, Download, List } from 'lucide-react';
import { Quiz } from '../components/Quiz';
import { ThemeToggle } from '../components/ThemeToggle';
import { Footer } from '../components/Footer';
import type { QuizData, CourseChapterIndex, CourseIndex, CourseInfo } from '../types';

type PageState = 'loading' | 'chapter-select' | 'quiz' | 'error';

export function CoursePage() {
    const { courseSlug, chapterId } = useParams<{ courseSlug: string; chapterId?: string }>();
    const navigate = useNavigate();
    const [pageState, setPageState] = useState<PageState>('loading');
    const [quizData, setQuizData] = useState<QuizData | null>(null);
    const [chapterIndex, setChapterIndex] = useState<CourseChapterIndex | null>(null);
    const [courseInfo, setCourseInfo] = useState<CourseInfo | null>(null);
    const [error, setError] = useState<string | null>(null);

    // 加载课程信息
    useEffect(() => {
        if (!courseSlug) {
            navigate('/');
            return;
        }

        const loadCourseInfo = async () => {
            try {
                const indexModule = await import('../data/index.json');
                const index = indexModule.default as CourseIndex;
                const course = index.courses.find((c) => c.slug === courseSlug);

                if (!course) {
                    setError('找不到该课程');
                    setPageState('error');
                    return;
                }

                setCourseInfo(course);

                // 根据课程类型加载数据
                if (course.hasChapters) {
                    if (chapterId) {
                        // 加载特定章节或全部题目
                        await loadChapterQuiz(courseSlug, chapterId);
                    } else {
                        // 显示章节选择
                        await loadChapterIndex(courseSlug);
                    }
                } else {
                    // 无章节，直接加载题目
                    await loadFlatQuiz(courseSlug);
                }
            } catch (err) {
                console.error('Failed to load course:', err);
                setError('加载课程失败');
                setPageState('error');
            }
        };

        loadCourseInfo();
    }, [courseSlug, chapterId, navigate]);

    const loadFlatQuiz = async (slug: string) => {
        try {
            const module = await import(`../data/${slug}.json`);
            setQuizData(module.default as QuizData);
            setPageState('quiz');
        } catch (err) {
            console.error('Failed to load quiz data:', err);
            setError('加载题目失败');
            setPageState('error');
        }
    };

    const loadChapterIndex = async (slug: string) => {
        try {
            const module = await import(`../data/${slug}/index.json`);
            setChapterIndex(module.default as CourseChapterIndex);
            setPageState('chapter-select');
        } catch (err) {
            console.error('Failed to load chapter index:', err);
            setError('加载章节索引失败');
            setPageState('error');
        }
    };

    const loadChapterQuiz = async (slug: string, chapter: string) => {
        try {
            const module = await import(`../data/${slug}/${chapter}.json`);
            setQuizData(module.default as QuizData);
            setPageState('quiz');
        } catch (err) {
            console.error('Failed to load chapter quiz:', err);
            setError('加载章节题目失败');
            setPageState('error');
        }
    };

    // 加载状态
    if (pageState === 'loading') {
        return (
            <div className="min-h-screen bg-theme-bg flex items-center justify-center">
                <div className="text-theme-text-muted">加载中...</div>
            </div>
        );
    }

    // 错误状态
    if (pageState === 'error') {
        return (
            <div className="min-h-screen bg-theme-bg flex items-center justify-center p-6">
                <div className="text-center">
                    <div className="text-theme-text-muted mb-4">{error || '加载失败'}</div>
                    <button
                        onClick={() => navigate('/')}
                        className="px-4 py-2 bg-theme-text text-theme-bg rounded-md hover:opacity-90 transition-opacity">
                        返回课程列表
                    </button>
                </div>
            </div>
        );
    }

    // 章节选择界面
    if (pageState === 'chapter-select' && chapterIndex) {
        return (
            <div className="min-h-screen bg-theme-bg flex items-center justify-center p-6">
                <div className="w-full max-w-lg">
                    <div className="flex justify-between items-center mb-4">
                        <button
                            onClick={() => navigate('/')}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-theme-text-secondary hover:text-theme-text transition-colors">
                            <ArrowLeft className="w-4 h-4" />
                            返回课程列表
                        </button>
                        <ThemeToggle />
                    </div>

                    <div className="border border-theme-border rounded-lg bg-theme-card p-8">
                        <div className="flex items-center justify-center gap-3 mb-2">
                            <BookOpen className="w-8 h-8 text-theme-accent" />
                            <h1 className="text-2xl font-semibold text-theme-text">{chapterIndex.title}</h1>
                        </div>

                        <p className="text-theme-text-secondary text-center text-sm mb-2">{chapterIndex.description}</p>

                        <p className="text-theme-text-muted text-center text-xs mb-6">
                            共 {chapterIndex.totalQuestions} 题 · {chapterIndex.chapters.length} 个章节
                        </p>

                        <div className="space-y-3">
                            {/* 全部题目入口 */}
                            <Link
                                to={`/course/${courseSlug}/all`}
                                className="flex items-center gap-3 p-4 rounded-lg border-2 border-theme-accent/30 bg-theme-accent/5 hover:border-theme-accent/50 hover:bg-theme-accent/10 transition-all group">
                                <div className="w-10 h-10 rounded-lg bg-theme-accent/20 flex items-center justify-center">
                                    <List className="w-5 h-5 text-theme-accent" />
                                </div>
                                <div className="flex-1">
                                    <span className="text-theme-text font-medium">全部题目</span>
                                    <span className="text-theme-text-muted text-sm ml-2">
                                        ({chapterIndex.totalQuestions} 题)
                                    </span>
                                </div>
                                <ChevronRight className="w-5 h-5 text-theme-accent group-hover:translate-x-1 transition-transform" />
                            </Link>

                            {/* 分隔线 */}
                            <div className="flex items-center gap-3 py-2">
                                <div className="flex-1 h-px bg-theme-border" />
                                <span className="text-theme-text-muted text-xs">选择章节</span>
                                <div className="flex-1 h-px bg-theme-border" />
                            </div>

                            {/* 各章节入口 */}
                            {chapterIndex.chapters.map((chapter) => (
                                <Link
                                    key={chapter.id}
                                    to={`/course/${courseSlug}/${chapter.id}`}
                                    className="flex items-center gap-3 p-4 rounded-lg border border-theme-border bg-theme-elevated hover:border-theme-border-light hover:bg-theme-card transition-all group">
                                    <div className="w-10 h-10 rounded-lg bg-theme-accent/10 flex items-center justify-center">
                                        <span className="text-theme-accent font-medium">{chapter.id}</span>
                                    </div>
                                    <div className="flex-1">
                                        <span className="text-theme-text font-medium">{chapter.title}</span>
                                        <span className="text-theme-text-muted text-sm ml-2">
                                            ({chapter.questionCount} 题)
                                        </span>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-theme-text-muted group-hover:text-theme-text group-hover:translate-x-1 transition-all" />
                                </Link>
                            ))}
                        </div>

                        {/* 下载原始题库 */}
                        {courseInfo?.source && (
                            <div className="mt-6 pt-4 border-t border-theme-border">
                                <a
                                    href={`/data/${courseInfo.source}`}
                                    download={courseInfo.source}
                                    className="flex items-center justify-center gap-2 text-sm text-theme-text-muted hover:text-theme-accent transition-colors">
                                    <Download className="w-4 h-4" />
                                    下载原始题库
                                </a>
                            </div>
                        )}
                    </div>

                    <Footer showShortcuts={true} />
                </div>
            </div>
        );
    }

    // 答题界面
    if (pageState === 'quiz' && quizData) {
        return <Quiz data={quizData} />;
    }

    return null;
}
