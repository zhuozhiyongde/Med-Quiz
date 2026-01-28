import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft,
    ArrowRight,
    Check,
    X,
    LogOut,
    RotateCcw,
    Shuffle,
    ListOrdered,
    AlertCircle,
    Send,
    Home,
    PlayCircle,
    Copy,
    CheckCheck,
    BookOpen,
    Eye,
    EyeOff,
} from 'lucide-react';
import type { QuizData, Question, AnswerRecord } from '../types';
import { ThemeToggle } from './ThemeToggle';
import { Footer } from './Footer';

type QuizMode = 'sequential' | 'random' | 'recite';
type QuizState = 'start' | 'quiz' | 'result';

interface SavedProgress {
    state: QuizState;
    mode: QuizMode;
    currentIndex: number;
    questions: Question[];
    answersMap: [number, AnswerRecord][];
    optionsOrderMap: [number, string[]][];
    isPartialSubmit?: boolean; // 是否为提前交卷（部分提交）
}

function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

interface QuizProps {
    data: QuizData;
}

export function Quiz({ data }: QuizProps) {
    const navigate = useNavigate();
    const { courseSlug, chapterId } = useParams<{ courseSlug: string; chapterId?: string }>();
    const STORAGE_KEY = chapterId ? `quiz-progress-${courseSlug}-${chapterId}` : `quiz-progress-${courseSlug}`;

    const [state, setState] = useState<QuizState>('start');
    const [mode, setMode] = useState<QuizMode>('sequential');
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [answersMap, setAnswersMap] = useState<Map<number, AnswerRecord>>(new Map());
    const [optionsOrderMap, setOptionsOrderMap] = useState<Map<number, string[]>>(new Map());
    const [isLoaded, setIsLoaded] = useState(false);
    const [isPartialSubmit, setIsPartialSubmit] = useState(false); // 是否为提前交卷
    const [hideWrongOptions, setHideWrongOptions] = useState(false); // 背诵模式下是否隐藏错误选项
    const [copied, setCopied] = useState(false); // 复制成功状态
    const [copiedWrongIndex, setCopiedWrongIndex] = useState<number | null>(null); // 复制成功的错题索引

    const currentQuestion = questions[currentIndex];
    const currentOptionsOrder = optionsOrderMap.get(currentIndex) || [];
    const currentRecord = answersMap.get(currentIndex);
    const hasSubmitted = !!currentRecord;

    // 计算统计数据
    const quizStats = useMemo(() => {
        const singleCount = data.questions.filter((q) => q.type === 'single').length;
        const multipleCount = data.questions.filter((q) => q.type === 'multiple').length;
        return { singleCount, multipleCount, total: data.questions.length };
    }, [data.questions]);

    // 从 localStorage 加载进度
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const progress: SavedProgress = JSON.parse(saved);
                if ((progress.state === 'quiz' || progress.isPartialSubmit) && progress.questions.length > 0) {
                    setState(progress.state);
                    setMode(progress.mode);
                    setCurrentIndex(progress.currentIndex);
                    setQuestions(progress.questions);
                    setAnswersMap(new Map(progress.answersMap));
                    setOptionsOrderMap(new Map(progress.optionsOrderMap));
                    setIsPartialSubmit(progress.isPartialSubmit || false);
                }
            }
        } catch (e) {
            console.error('Failed to load progress:', e);
        }
        setIsLoaded(true);
    }, [STORAGE_KEY]);

    // 保存进度到 localStorage
    useEffect(() => {
        if (!isLoaded) return;
        if (state === 'quiz' && questions.length > 0) {
            const progress: SavedProgress = {
                state,
                mode,
                currentIndex,
                questions,
                answersMap: Array.from(answersMap.entries()),
                optionsOrderMap: Array.from(optionsOrderMap.entries()),
                isPartialSubmit: false,
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
        } else if (state === 'result' && isPartialSubmit && questions.length > 0) {
            // 提前交卷时保存进度，以便下次继续
            const progress: SavedProgress = {
                state: 'quiz', // 保存为 quiz 状态以便继续
                mode,
                currentIndex,
                questions,
                answersMap: Array.from(answersMap.entries()),
                optionsOrderMap: Array.from(optionsOrderMap.entries()),
                isPartialSubmit: true,
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
        } else if (state === 'start') {
            localStorage.removeItem(STORAGE_KEY);
        }
    }, [isLoaded, state, mode, currentIndex, questions, answersMap, optionsOrderMap, isPartialSubmit, STORAGE_KEY]);

    const startQuiz = useCallback(
        (selectedMode: QuizMode, customQuestions?: Question[]) => {
            setMode(selectedMode);
            const baseQuestions = customQuestions || data.questions;
            const qs = selectedMode === 'random' ? shuffleArray(baseQuestions) : baseQuestions;
            setQuestions(qs);
            setCurrentIndex(0);
            setSelectedAnswers([]);
            setAnswersMap(new Map());

            const newOptionsOrderMap = new Map<number, string[]>();
            qs.forEach((q, idx) => {
                const optionKeys = Object.keys(q.options);
                newOptionsOrderMap.set(idx, shuffleArray(optionKeys));
            });
            setOptionsOrderMap(newOptionsOrderMap);
            setState('quiz');
        },
        [data.questions]
    );

    const startWrongQuiz = useCallback(() => {
        const wrongQuestionIndices = Array.from(answersMap.values())
            .filter((r) => !r.isCorrect)
            .map((r) => r.questionIndex);
        const wrongQuestions = wrongQuestionIndices.map((idx) => questions[idx]);
        if (wrongQuestions.length > 0) {
            startQuiz('random', wrongQuestions);
        }
    }, [answersMap, questions, startQuiz]);

    const handleExit = useCallback(() => {
        localStorage.removeItem(STORAGE_KEY);
        setState('start');
        setQuestions([]);
        setAnswersMap(new Map());
        setOptionsOrderMap(new Map());
        setCurrentIndex(0);
        setSelectedAnswers([]);
    }, [STORAGE_KEY]);

    const handleBackToCourses = useCallback(() => {
        // 如果有章节ID，返回到章节选择页面；否则返回到课程列表
        if (chapterId) {
            navigate(`/course/${courseSlug}`);
        } else {
            navigate('/');
        }
    }, [navigate, courseSlug, chapterId]);

    useEffect(() => {
        if (currentRecord) {
            setSelectedAnswers(currentRecord.userAnswers);
        } else {
            setSelectedAnswers([]);
        }
        setCopied(false); // 切换题目时重置复制状态
    }, [currentIndex, currentRecord]);

    const submitAnswer = (answers: string[]) => {
        const correct = currentQuestion.answers;
        const isAnswerCorrect = answers.length === correct.length && answers.every((a) => correct.includes(a));

        setAnswersMap((prev) => {
            const newMap = new Map(prev);
            newMap.set(currentIndex, {
                questionIndex: currentIndex,
                userAnswers: answers,
                isCorrect: isAnswerCorrect,
            });
            return newMap;
        });
    };

    const handleSelect = (option: string) => {
        // 已提交后点击任意选项跳到下一题
        if (hasSubmitted) {
            handleNext();
            return;
        }

        if (currentQuestion.type === 'single') {
            setSelectedAnswers([option]);
            setTimeout(() => submitAnswer([option]), 0);
        } else {
            setSelectedAnswers((prev) =>
                prev.includes(option) ? prev.filter((a) => a !== option) : [...prev, option].sort()
            );
        }
    };

    const handleConfirmMultiple = () => {
        if (selectedAnswers.length === 0 || hasSubmitted) return;
        submitAnswer(selectedAnswers);
    };

    const handlePrev = useCallback(() => {
        if (currentIndex > 0) setCurrentIndex((prev) => prev - 1);
    }, [currentIndex]);

    const handleNext = useCallback(() => {
        if (currentIndex < questions.length - 1) setCurrentIndex((prev) => prev + 1);
    }, [currentIndex, questions.length]);

    const handleFinish = () => {
        setIsPartialSubmit(false);
        setState('result');
    };

    // 提前交卷（保存进度）
    const handleEarlySubmit = useCallback(() => {
        if (answersMap.size === 0) return; // 至少要答一题
        setIsPartialSubmit(true);
        setState('result');
    }, [answersMap.size]);

    // 继续答题（从提前交卷的状态恢复）
    const handleContinueQuiz = useCallback(() => {
        setIsPartialSubmit(false);
        setState('quiz');
        // 找到第一个未回答的题目
        for (let i = 0; i < questions.length; i++) {
            if (!answersMap.has(i)) {
                setCurrentIndex(i);
                return;
            }
        }
        // 如果都答完了，回到第一题
        setCurrentIndex(0);
    }, [questions.length, answersMap]);

    // 复制题目和答案到剪贴板
    const handleCopyQuestion = useCallback(() => {
        if (!currentQuestion) return;

        const optionLines = Object.entries(currentQuestion.options)
            .map(([key, value]) => `${key}. ${value}`)
            .join('\n');

        const answerText = currentQuestion.answers.join('');
        const explanationText = currentQuestion.explanation ? `\n【解析】${currentQuestion.explanation}` : '';

        // 如果答错了，带上用户选择的错误选项
        const userAnswerText =
            currentRecord && !currentRecord.isCorrect ? `\n【我的答案】${currentRecord.userAnswers.join('')}` : '';

        const text = `${currentQuestion.title}\n${optionLines}${userAnswerText}\n【参考答案】${answerText}${explanationText}`;

        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }, [currentQuestion, currentRecord]);

    // 复制错题（包含用户的错误答案）
    const handleCopyWrongQuestion = useCallback((questionIndex: number, question: Question, userAnswers: string[]) => {
        const optionLines = Object.entries(question.options)
            .map(([key, value]) => `${key}. ${value}`)
            .join('\n');

        const userAnswerText = userAnswers.join('');
        const correctAnswerText = question.answers.join('');
        const explanationText = question.explanation ? `\n【解析】${question.explanation}` : '';

        const text = `${question.title}\n${optionLines}\n【我的答案】${userAnswerText}\n【参考答案】${correctAnswerText}${explanationText}`;

        navigator.clipboard.writeText(text).then(() => {
            setCopiedWrongIndex(questionIndex);
            setTimeout(() => setCopiedWrongIndex(null), 2000);
        });
    }, []);

    useEffect(() => {
        if (state !== 'quiz') return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'ArrowLeft') {
                e.preventDefault();
                handlePrev();
                return;
            }
            if (e.code === 'ArrowRight') {
                e.preventDefault();
                handleNext();
                return;
            }

            // 背诵模式下，空格键用于切换下一题，其他快捷键无效
            if (mode === 'recite') {
                if (e.code === 'Space') {
                    e.preventDefault();
                    handleNext();
                }
                return;
            }

            // 正常答题模式
            if (e.code === 'Space') {
                e.preventDefault();
                if (hasSubmitted) {
                    handleNext();
                } else if (currentQuestion.type === 'single' && selectedAnswers.length === 0) {
                    // 单选题：空格跳过，自动选择正确答案
                    const correctAnswer = currentQuestion.answers[0];
                    setSelectedAnswers([correctAnswer]);
                    submitAnswer([correctAnswer]);
                } else if (currentQuestion.type === 'multiple') {
                    if (selectedAnswers.length === 0) {
                        // 多选题：没有选择时，空格全选正确答案
                        const correctAnswers = currentQuestion.answers;
                        setSelectedAnswers(correctAnswers);
                        submitAnswer(correctAnswers);
                    } else {
                        // 多选题：已有选择时，提交当前选择
                        submitAnswer(selectedAnswers);
                    }
                }
                return;
            }

            const indexMap: Record<string, number> = {
                Digit1: 0,
                Numpad1: 0,
                KeyA: 0,
                Digit2: 1,
                Numpad2: 1,
                KeyS: 1,
                Digit3: 2,
                Numpad3: 2,
                KeyD: 2,
                Digit4: 3,
                Numpad4: 3,
                KeyF: 3,
                Digit5: 4,
                Numpad5: 4,
                KeyG: 4,
            };

            const idx = indexMap[e.code];
            if (idx !== undefined) {
                // 已提交后按任意选择键跳到下一题
                if (hasSubmitted) {
                    handleNext();
                } else if (currentOptionsOrder[idx]) {
                    handleSelect(currentOptionsOrder[idx]);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [state, mode, hasSubmitted, currentQuestion, selectedAnswers, currentOptionsOrder, handlePrev, handleNext]);

    const handleRestart = () => {
        localStorage.removeItem(STORAGE_KEY);
        setState('start');
        setAnswersMap(new Map());
        setIsPartialSubmit(false);
    };

    const stats = useMemo(() => {
        const records = Array.from(answersMap.values());
        const correct = records.filter((r) => r.isCorrect).length;
        const total = records.length;
        const rate = total > 0 ? ((correct / total) * 100).toFixed(1) : '0';
        return { correct, total, rate };
    }, [answersMap]);

    const allAnswered = answersMap.size === questions.length;

    const replaceOptionLetters = (text: string, optionsOrder: string[]) => {
        return text.replace(/(?<![A-Za-z])([A-E])(?![A-Za-z])/g, (match, letter) => {
            const idx = optionsOrder.indexOf(letter);
            if (idx !== -1) {
                return String(idx + 1);
            }
            return match;
        });
    };

    // 加载中
    if (!isLoaded) {
        return (
            <div className="min-h-screen bg-theme-bg flex items-center justify-center">
                <div className="text-theme-text-muted">加载中...</div>
            </div>
        );
    }

    // 开始界面
    if (state === 'start') {
        return (
            <div className="min-h-screen bg-theme-bg flex items-center justify-center p-6">
                <div className="w-full max-w-lg">
                    <div className="flex justify-between items-center mb-4">
                        <button
                            onClick={handleBackToCourses}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-theme-text-secondary hover:text-theme-text transition-colors">
                            <ArrowLeft className="w-4 h-4" />
                            {chapterId ? '返回章节列表' : '返回课程列表'}
                        </button>
                        <ThemeToggle />
                    </div>

                    <div className="border border-theme-border rounded-lg bg-theme-card p-8">
                        <h1 className="text-2xl font-semibold text-theme-text text-center mb-2">{data.title}</h1>
                        <p className="text-theme-text-secondary text-center text-sm mb-8">{data.description}</p>

                        <div className="flex justify-center gap-6 mb-8 text-sm">
                            <div className="text-center">
                                <div className="text-theme-text font-medium">{quizStats.singleCount}</div>
                                <div className="text-theme-text-muted">单选题</div>
                            </div>
                            <div className="w-px bg-theme-border" />
                            <div className="text-center">
                                <div className="text-theme-text font-medium">{quizStats.multipleCount}</div>
                                <div className="text-theme-text-muted">多选题</div>
                            </div>
                            <div className="w-px bg-theme-border" />
                            <div className="text-center">
                                <div className="text-theme-text font-medium">{quizStats.total}</div>
                                <div className="text-theme-text-muted">总计</div>
                            </div>
                        </div>

                        <div className="flex gap-3 mb-3">
                            <button
                                onClick={() => startQuiz('sequential')}
                                className="flex-1 h-10 bg-theme-text text-theme-bg font-medium rounded-md hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                                <ListOrdered className="w-4 h-4" />
                                顺序练习
                            </button>
                            <button
                                onClick={() => startQuiz('random')}
                                className="flex-1 h-10 border border-theme-border text-theme-text font-medium rounded-md hover:bg-theme-elevated transition-colors flex items-center justify-center gap-2">
                                <Shuffle className="w-4 h-4" />
                                随机练习
                            </button>
                        </div>
                        <button
                            onClick={() => startQuiz('recite')}
                            className="w-full h-10 border border-green-500/50 text-green-500 font-medium rounded-md hover:bg-green-500/10 transition-colors flex items-center justify-center gap-2">
                            <BookOpen className="w-4 h-4" />
                            背诵模式（直接显示答案）
                        </button>
                    </div>

                    <Footer showShortcuts={true} />
                </div>
            </div>
        );
    }

    // 结果界面
    if (state === 'result') {
        const records = Array.from(answersMap.values());
        const wrongRecords = records.filter((r) => !r.isCorrect);
        const unansweredCount = questions.length - answersMap.size;

        return (
            <div className="min-h-screen bg-theme-bg p-4 md:p-6">
                <div className="max-w-3xl mx-auto">
                    <div className="flex justify-between items-center mb-4">
                        <button
                            onClick={() => navigate('/')}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-theme-text-secondary hover:text-theme-text transition-colors">
                            <Home className="w-4 h-4" />
                            返回首页
                        </button>
                        <ThemeToggle />
                    </div>

                    <div className="border border-theme-border rounded-lg bg-theme-card p-6 md:p-8 mb-6">
                        <h1 className="text-xl font-semibold text-theme-text text-center mb-6">
                            {isPartialSubmit ? '提前交卷' : '练习完成'}
                        </h1>

                        {isPartialSubmit && unansweredCount > 0 && (
                            <div className="mb-4 p-3 rounded-md bg-yellow-500/10 border border-yellow-500/20 text-center">
                                <span className="text-yellow-500 text-sm">
                                    还有 {unansweredCount} 题未作答，进度已保存
                                </span>
                            </div>
                        )}

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
                            <div className="text-center p-3 md:p-4 rounded-md bg-theme-elevated border border-theme-border">
                                <div className="text-xl md:text-2xl font-semibold text-theme-text">{stats.total}</div>
                                <div className="text-[10px] md:text-xs text-theme-text-muted mt-1">已答题数</div>
                            </div>
                            <div className="text-center p-3 md:p-4 rounded-md bg-theme-elevated border border-theme-border">
                                <div className="text-xl md:text-2xl font-semibold text-green-500">{stats.correct}</div>
                                <div className="text-[10px] md:text-xs text-theme-text-muted mt-1">正确</div>
                            </div>
                            <div className="text-center p-3 md:p-4 rounded-md bg-theme-elevated border border-theme-border">
                                <div className="text-xl md:text-2xl font-semibold text-red-500">
                                    {stats.total - stats.correct}
                                </div>
                                <div className="text-[10px] md:text-xs text-theme-text-muted mt-1">错误</div>
                            </div>
                            <div className="text-center p-3 md:p-4 rounded-md bg-theme-elevated border border-theme-border">
                                <div className="text-xl md:text-2xl font-semibold text-theme-accent">{stats.rate}%</div>
                                <div className="text-[10px] md:text-xs text-theme-text-muted mt-1">正确率</div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {/* 继续答题按钮（仅在提前交卷且有未答题目时显示） */}
                            {isPartialSubmit && unansweredCount > 0 && (
                                <button
                                    onClick={handleContinueQuiz}
                                    className="w-full h-10 bg-theme-accent text-white font-medium rounded-md hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                                    <PlayCircle className="w-4 h-4" />
                                    <span>继续答题 ({unansweredCount} 题)</span>
                                </button>
                            )}
                            {wrongRecords.length > 0 && (
                                <button
                                    onClick={startWrongQuiz}
                                    className="w-full h-10 bg-red-500 text-white font-medium rounded-md hover:bg-red-600 transition-colors flex items-center justify-center gap-2">
                                    <AlertCircle className="w-4 h-4" />
                                    <span>错题训练 ({wrongRecords.length} 题)</span>
                                </button>
                            )}
                            <div className="flex gap-3">
                                <button
                                    onClick={handleRestart}
                                    className="flex-1 h-10 bg-theme-text text-theme-bg font-medium rounded-md hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                                    <RotateCcw className="w-4 h-4" />
                                    <span>重新开始</span>
                                </button>
                                <button
                                    onClick={handleBackToCourses}
                                    className="flex-1 h-10 border border-theme-border text-theme-text font-medium rounded-md hover:bg-theme-elevated transition-colors flex items-center justify-center gap-2">
                                    <ArrowLeft className="w-4 h-4" />
                                    <span>{chapterId ? '返回章节' : '返回列表'}</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {wrongRecords.length > 0 && (
                        <div className="border border-theme-border rounded-lg bg-theme-card">
                            <div className="px-4 md:px-6 py-4 border-b border-theme-border">
                                <h2 className="text-sm font-medium text-theme-text">
                                    错题回顾 ({wrongRecords.length})
                                </h2>
                            </div>

                            <div className="divide-y divide-theme-border">
                                {wrongRecords.map((record) => {
                                    const q = questions[record.questionIndex];
                                    return (
                                        <div key={record.questionIndex} className="p-4 md:p-6">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-xs text-theme-text-muted">
                                                        第 {record.questionIndex + 1} 题
                                                    </span>
                                                    {q.type === 'multiple' && (
                                                        <span className="px-2 py-0.5 text-xs rounded bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                                                            多选
                                                        </span>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() =>
                                                        handleCopyWrongQuestion(
                                                            record.questionIndex,
                                                            q,
                                                            record.userAnswers
                                                        )
                                                    }
                                                    className="flex items-center gap-1 px-2 py-1 text-[10px] md:text-xs rounded bg-theme-elevated text-theme-text-muted border border-theme-border hover:text-theme-text hover:border-theme-border-light transition-colors"
                                                    title="复制题目和答案">
                                                    {copiedWrongIndex === record.questionIndex ? (
                                                        <>
                                                            <CheckCheck className="w-3 h-3 text-green-500" />
                                                            <span className="text-green-500">已复制</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Copy className="w-3 h-3" />
                                                            <span>复制本题</span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>

                                            <p className="text-theme-text mb-4 text-sm md:text-base">{q.title}</p>

                                            {q.image && (
                                                <div className="mb-4">
                                                    <img
                                                        src={q.image}
                                                        alt="题目配图"
                                                        className="max-w-full h-auto rounded-md border border-theme-border mx-auto"
                                                        style={{ maxHeight: '250px', objectFit: 'contain' }}
                                                    />
                                                </div>
                                            )}

                                            <div className="space-y-2 mb-4">
                                                {Object.entries(q.options).map(([key, value]) => {
                                                    const isCorrectAnswer = q.answers.includes(key);
                                                    const isUserAnswer = record.userAnswers.includes(key);
                                                    const isWrongAnswer = isUserAnswer && !isCorrectAnswer;

                                                    return (
                                                        <div
                                                            key={key}
                                                            className={`flex items-start gap-3 p-3 rounded-md text-sm ${
                                                                isCorrectAnswer
                                                                    ? 'bg-green-500/10 border border-green-500/20'
                                                                    : isWrongAnswer
                                                                    ? 'bg-red-500/10 border border-red-500/20'
                                                                    : 'bg-theme-elevated border border-theme-border'
                                                            }`}>
                                                            <span
                                                                className={`font-medium flex-shrink-0 ${
                                                                    isCorrectAnswer
                                                                        ? 'text-green-500'
                                                                        : isWrongAnswer
                                                                        ? 'text-red-500'
                                                                        : 'text-theme-text-secondary'
                                                                }`}>
                                                                {key}
                                                            </span>
                                                            <span
                                                                className={`flex-1 break-words ${
                                                                    isCorrectAnswer
                                                                        ? 'text-green-400'
                                                                        : isWrongAnswer
                                                                        ? 'text-red-400'
                                                                        : 'text-theme-text-secondary'
                                                                }`}>
                                                                {value}
                                                            </span>
                                                            {isCorrectAnswer && (
                                                                <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                                                            )}
                                                            {isWrongAnswer && (
                                                                <X className="w-4 h-4 text-red-500 flex-shrink-0" />
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            <div className="text-sm space-y-1 mb-3">
                                                <p className="text-theme-text-secondary">
                                                    你的答案：
                                                    <span className="text-red-500 ml-1">
                                                        {record.userAnswers.join(', ')}
                                                    </span>
                                                </p>
                                                <p className="text-theme-text-secondary">
                                                    正确答案：
                                                    <span className="text-green-500 ml-1">{q.answers.join(', ')}</span>
                                                </p>
                                            </div>

                                            {q.explanation && (
                                                <div className="text-sm text-theme-text-muted bg-theme-elevated rounded-md p-3 border border-theme-border">
                                                    <span className="text-theme-text-secondary">解析：</span>
                                                    {q.explanation}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // 答题界面
    const isCorrect = currentRecord?.isCorrect ?? false;

    return (
        <div className="min-h-screen bg-theme-bg p-4 md:p-6">
            <div className="max-w-2xl mx-auto">
                {/* 进度条 */}
                <div className="h-1 bg-theme-elevated rounded-full mb-4 md:mb-6 overflow-hidden">
                    <div
                        className={`h-full transition-all duration-300 ${mode === 'recite' ? 'bg-green-500' : 'bg-theme-text'}`}
                        style={{ width: `${mode === 'recite' ? ((currentIndex + 1) / questions.length) * 100 : (answersMap.size / questions.length) * 100}%` }}
                    />
                </div>

                {/* 头部信息 */}
                <div className="flex items-center justify-between mb-4 md:mb-6">
                    <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                        {mode === 'recite' ? (
                            <button
                                onClick={handleExit}
                                className="px-2 py-1 text-[10px] md:text-xs rounded bg-theme-elevated text-theme-text-muted border border-theme-border hover:text-theme-accent hover:border-theme-accent/30 transition-colors flex items-center gap-1"
                                title="退出背诵模式">
                                <LogOut className="w-3 h-3" />
                                退出
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={handleExit}
                                    className="px-2 py-1 text-[10px] md:text-xs rounded bg-theme-elevated text-theme-text-muted border border-theme-border hover:text-red-500 hover:border-red-500/30 transition-colors flex items-center gap-1"
                                    title="放弃回答，重置进度">
                                    <LogOut className="w-3 h-3" />
                                    放弃
                                </button>
                                <button
                                    onClick={handleEarlySubmit}
                                    disabled={answersMap.size === 0}
                                    className="px-2 py-1 text-[10px] md:text-xs rounded bg-theme-elevated text-theme-text-muted border border-theme-border hover:text-theme-accent hover:border-theme-accent/30 transition-colors flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed"
                                    title="提前交卷，保存进度">
                                    <Send className="w-3 h-3" />
                                    交卷
                                </button>
                            </>
                        )}
                        <span className="text-xs md:text-sm text-theme-text">
                            {currentIndex + 1}
                            <span className="text-theme-text-muted"> / {questions.length}</span>
                        </span>
                        <span
                            className={`px-1.5 md:px-2 py-0.5 text-[10px] md:text-xs rounded border ${
                                currentQuestion.type === 'multiple'
                                    ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                                    : 'bg-theme-elevated text-theme-text-secondary border-theme-border'
                            }`}>
                            {currentQuestion.type === 'single' ? '单选' : '多选'}
                        </span>
                        {mode === 'recite' && (
                            <span className="px-1.5 md:px-2 py-0.5 text-[10px] md:text-xs rounded border bg-green-500/10 text-green-500 border-green-500/30">
                                背诵模式
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 md:gap-3">
                        {mode === 'recite' && (
                            <button
                                onClick={() => setHideWrongOptions((prev) => !prev)}
                                className={`flex items-center gap-1 px-2 py-1 text-[10px] md:text-xs rounded border transition-colors ${
                                    hideWrongOptions
                                        ? 'bg-green-500/10 text-green-500 border-green-500/30'
                                        : 'bg-theme-elevated text-theme-text-muted border-theme-border hover:text-theme-text'
                                }`}
                                title={hideWrongOptions ? '显示所有选项' : '隐藏错误选项'}>
                                {hideWrongOptions ? (
                                    <EyeOff className="w-3 h-3" />
                                ) : (
                                    <Eye className="w-3 h-3" />
                                )}
                                <span className="hidden sm:inline">{hideWrongOptions ? '仅显示答案' : '显示全部'}</span>
                            </button>
                        )}
                        {mode !== 'recite' && (
                            <div className="text-xs md:text-sm">
                                <span className="text-green-500">{stats.correct}</span>
                                <span className="text-theme-text-muted"> / {stats.total}</span>
                            </div>
                        )}
                        <ThemeToggle />
                    </div>
                </div>

                {/* 题目卡片 */}
                <div className="border border-theme-border rounded-lg bg-theme-card mb-4">
                    <div className="p-4 md:p-6 border-b border-theme-border">
                        <h2 className="text-base md:text-lg text-theme-text leading-relaxed">
                            {currentQuestion.title}
                        </h2>
                        {currentQuestion.image && (
                            <div className="mt-4">
                                <img
                                    src={currentQuestion.image}
                                    alt="题目配图"
                                    className="max-w-full h-auto rounded-md border border-theme-border mx-auto"
                                    style={{ maxHeight: '300px', objectFit: 'contain' }}
                                />
                            </div>
                        )}
                    </div>

                    <div className="p-3 md:p-4 space-y-2">
                        {currentOptionsOrder.map((key, idx) => {
                            const value = currentQuestion.options[key];
                            const isSelected = selectedAnswers.includes(key);
                            const isCorrectAnswer = currentQuestion.answers.includes(key);
                            const displayKey = String(idx + 1);
                            const isReciteMode = mode === 'recite';

                            // 背诵模式下隐藏错误选项
                            if (isReciteMode && hideWrongOptions && !isCorrectAnswer) {
                                return null;
                            }

                            let optionStyle =
                                'border-theme-border hover:border-theme-border-light hover:bg-theme-elevated';

                            // 背诵模式：直接标注正确答案
                            if (isReciteMode) {
                                if (isCorrectAnswer) {
                                    optionStyle = 'border-green-500 bg-green-500/10';
                                }
                            } else {
                                // 正常答题模式
                                if (isSelected && !hasSubmitted) {
                                    optionStyle = 'border-theme-text bg-theme-text/5';
                                }
                                if (hasSubmitted) {
                                    if (isCorrectAnswer) {
                                        optionStyle = 'border-green-500 bg-green-500/10';
                                    } else if (isSelected) {
                                        optionStyle = 'border-red-500 bg-red-500/10';
                                    }
                                }
                            }

                            return (
                                <button
                                    key={key}
                                    onClick={() => !isReciteMode && handleSelect(key)}
                                    className={`w-full flex items-center gap-4 p-3 md:p-4 rounded-md border transition-all text-left ${optionStyle} ${isReciteMode ? 'cursor-default' : 'cursor-pointer'}`}>
                                    <span
                                        className={`flex items-center justify-center w-6 h-6 md:w-7 md:h-7 rounded-full text-xs md:text-sm font-medium flex-shrink-0 ${
                                            isReciteMode && isCorrectAnswer
                                                ? 'bg-green-500 text-white'
                                                : hasSubmitted && isCorrectAnswer
                                                ? 'bg-green-500 text-white'
                                                : hasSubmitted && isSelected
                                                ? 'bg-red-500 text-white'
                                                : isSelected
                                                ? 'bg-theme-text text-theme-bg'
                                                : 'bg-theme-elevated text-theme-text-secondary border border-theme-border'
                                        }`}>
                                        {displayKey}
                                    </span>
                                    <span
                                        className={`flex-1 text-sm md:text-base ${
                                            isReciteMode && isCorrectAnswer
                                                ? 'text-green-500'
                                                : hasSubmitted && isCorrectAnswer
                                                ? 'text-green-500'
                                                : hasSubmitted && isSelected && !isCorrectAnswer
                                                ? 'text-red-500'
                                                : 'text-theme-text'
                                        }`}>
                                        {value}
                                    </span>
                                    {(isReciteMode && isCorrectAnswer) && (
                                        <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                                    )}
                                    {!isReciteMode && hasSubmitted && isCorrectAnswer && (
                                        <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                                    )}
                                    {!isReciteMode && hasSubmitted && isSelected && !isCorrectAnswer && (
                                        <X className="w-5 h-5 text-red-500 flex-shrink-0" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* 操作提示 */}
                <div className="text-[10px] md:text-xs text-theme-text-muted mb-3 md:mb-4 px-1">
                    {mode === 'recite' ? (
                        <span>
                            💡 背诵模式：答案已直接标出，使用左右方向键或点击按钮切换题目。
                            {currentQuestion.explanation && ' 下方有解析。'}
                        </span>
                    ) : currentQuestion.type === 'single' ? (
                        <span>
                            💡 点击选项作答（未选情况下空格自动选出正确答案），出结果后，点击任意选项或空格继续下一题
                        </span>
                    ) : (
                        <span>💡 多选题：点击勾选（未选情况下空格自动勾选所有正确答案），完成后点击「确认选择」</span>
                    )}
                </div>

                {/* 反馈区域 - 正常答题模式 */}
                {mode !== 'recite' && hasSubmitted && (
                    <div
                        className={`rounded-lg p-4 md:p-5 mb-4 md:mb-6 border ${
                            isCorrect ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'
                        }`}>
                        <div className="flex items-center justify-between mb-2 md:mb-3">
                            <div
                                className={`font-medium text-sm md:text-base flex items-center gap-2 ${
                                    isCorrect ? 'text-green-500' : 'text-red-500'
                                }`}>
                                {isCorrect ? (
                                    <>
                                        <Check className="w-5 h-5" />
                                        回答正确
                                    </>
                                ) : (
                                    <>
                                        <X className="w-5 h-5" />
                                        回答错误
                                    </>
                                )}
                            </div>
                            <button
                                onClick={handleCopyQuestion}
                                className="flex items-center gap-1 px-2 py-1 text-[10px] md:text-xs rounded bg-theme-elevated text-theme-text-muted border border-theme-border hover:text-theme-text hover:border-theme-border-light transition-colors"
                                title="复制题目和答案">
                                {copied ? (
                                    <>
                                        <CheckCheck className="w-3 h-3 text-green-500" />
                                        <span className="text-green-500">已复制</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-3 h-3" />
                                        <span>复制本题</span>
                                    </>
                                )}
                            </button>
                        </div>
                        <div className="text-xs md:text-sm text-theme-text-secondary mb-2">
                            正确答案：
                            <span className="text-green-500 ml-1">
                                {currentQuestion.answers
                                    .map((ans) => {
                                        const idx = currentOptionsOrder.indexOf(ans);
                                        return `${idx + 1}. ${currentQuestion.options[ans]}`;
                                    })
                                    .join('；')}
                            </span>
                        </div>
                        {currentQuestion.explanation && (
                            <div className="text-xs md:text-sm text-theme-text-muted">
                                <span className="text-theme-text-secondary">解析：</span>
                                {replaceOptionLetters(currentQuestion.explanation, currentOptionsOrder)}
                            </div>
                        )}
                    </div>
                )}

                {/* 反馈区域 - 背诵模式 */}
                {mode === 'recite' && currentQuestion.explanation && (
                    <div className="rounded-lg p-4 md:p-5 mb-4 md:mb-6 border bg-green-500/5 border-green-500/20">
                        <div className="flex items-center justify-between mb-2 md:mb-3">
                            <div className="font-medium text-sm md:text-base flex items-center gap-2 text-green-500">
                                <BookOpen className="w-5 h-5" />
                                答案解析
                            </div>
                            <button
                                onClick={handleCopyQuestion}
                                className="flex items-center gap-1 px-2 py-1 text-[10px] md:text-xs rounded bg-theme-elevated text-theme-text-muted border border-theme-border hover:text-theme-text hover:border-theme-border-light transition-colors"
                                title="复制题目和答案">
                                {copied ? (
                                    <>
                                        <CheckCheck className="w-3 h-3 text-green-500" />
                                        <span className="text-green-500">已复制</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-3 h-3" />
                                        <span>复制本题</span>
                                    </>
                                )}
                            </button>
                        </div>
                        <div className="text-xs md:text-sm text-theme-text-muted">
                            {replaceOptionLetters(currentQuestion.explanation, currentOptionsOrder)}
                        </div>
                    </div>
                )}

                {/* 操作按钮 */}
                <div className="flex items-center justify-between gap-2 md:gap-3">
                    <button
                        onClick={handlePrev}
                        disabled={currentIndex === 0}
                        className="h-9 md:h-10 px-3 md:px-4 text-xs md:text-sm border border-theme-border text-theme-text rounded-md hover:bg-theme-elevated transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1">
                        <ArrowLeft className="w-4 h-4" />
                        <span className="hidden sm:inline">上一题</span>
                    </button>

                    <div className="flex gap-2 md:gap-3">
                        {mode !== 'recite' && !hasSubmitted && currentQuestion.type === 'multiple' && (
                            <button
                                onClick={handleConfirmMultiple}
                                disabled={selectedAnswers.length === 0}
                                className="h-9 md:h-10 px-4 md:px-6 text-xs md:text-sm bg-theme-text text-theme-bg font-medium rounded-md hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2">
                                <Check className="w-4 h-4" />
                                确认选择
                            </button>
                        )}
                    </div>

                    {currentIndex < questions.length - 1 ? (
                        <button
                            onClick={handleNext}
                            className="h-9 md:h-10 px-3 md:px-4 text-xs md:text-sm border border-theme-border text-theme-text rounded-md hover:bg-theme-elevated transition-colors flex items-center gap-1">
                            <span className="hidden sm:inline">下一题</span>
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    ) : mode === 'recite' ? (
                        <button
                            onClick={handleExit}
                            className="h-9 md:h-10 px-4 md:px-6 text-xs md:text-sm bg-theme-text text-theme-bg font-medium rounded-md hover:opacity-90 transition-opacity">
                            完成背诵
                        </button>
                    ) : (
                        <button
                            onClick={handleFinish}
                            disabled={!allAnswered}
                            className="h-9 md:h-10 px-4 md:px-6 text-xs md:text-sm bg-theme-text text-theme-bg font-medium rounded-md hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed">
                            查看结果
                        </button>
                    )}
                </div>

                {/* 未答题提示 - 仅在非背诵模式下显示 */}
                {mode !== 'recite' && !allAnswered && (
                    <p className="text-center text-theme-text-muted text-xs md:text-sm mt-3 md:mt-4">
                        还有 {questions.length - answersMap.size} 题未作答
                    </p>
                )}

                <Footer compact={true} />
            </div>
        </div>
    );
}
