import { useState, useMemo, useCallback, useEffect } from 'react';
import quizData from './quiz_data.json';
import type { QuizData, Question, AnswerRecord } from './types';

const data = quizData as QuizData;
const STORAGE_KEY = 'quiz-progress';

type QuizMode = 'sequential' | 'random';
type QuizState = 'start' | 'quiz' | 'result';

interface SavedProgress {
    state: QuizState;
    mode: QuizMode;
    currentIndex: number;
    questions: Question[];
    answersMap: [number, AnswerRecord][];
    optionsOrderMap: [number, string[]][];
}

function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function App() {
    const [state, setState] = useState<QuizState>('start');
    const [mode, setMode] = useState<QuizMode>('sequential');
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [answersMap, setAnswersMap] = useState<Map<number, AnswerRecord>>(new Map());
    const [optionsOrderMap, setOptionsOrderMap] = useState<Map<number, string[]>>(new Map());
    const [isLoaded, setIsLoaded] = useState(false);

    const currentQuestion = questions[currentIndex];
    const currentOptionsOrder = optionsOrderMap.get(currentIndex) || [];
    const currentRecord = answersMap.get(currentIndex);
    const hasSubmitted = !!currentRecord;

    // 从 localStorage 加载进度
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const progress: SavedProgress = JSON.parse(saved);
                if (progress.state === 'quiz' && progress.questions.length > 0) {
                    setState(progress.state);
                    setMode(progress.mode);
                    setCurrentIndex(progress.currentIndex);
                    setQuestions(progress.questions);
                    setAnswersMap(new Map(progress.answersMap));
                    setOptionsOrderMap(new Map(progress.optionsOrderMap));
                }
            }
        } catch (e) {
            console.error('Failed to load progress:', e);
        }
        setIsLoaded(true);
    }, []);

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
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
        } else if (state === 'start') {
            localStorage.removeItem(STORAGE_KEY);
        }
    }, [isLoaded, state, mode, currentIndex, questions, answersMap, optionsOrderMap]);

    const startQuiz = useCallback((selectedMode: QuizMode, customQuestions?: Question[]) => {
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
    }, []);

    const startWrongQuiz = useCallback(() => {
        const wrongQuestionIds = Array.from(answersMap.values())
            .filter((r) => !r.isCorrect)
            .map((r) => r.questionId);
        const wrongQuestions = questions.filter((q) => wrongQuestionIds.includes(q.id));
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
    }, []);

    useEffect(() => {
        if (currentRecord) {
            setSelectedAnswers(currentRecord.userAnswers);
        } else {
            setSelectedAnswers([]);
        }
    }, [currentIndex, currentRecord]);

    const submitAnswer = (answers: string[]) => {
        const correct = currentQuestion.answers;
        const isAnswerCorrect = answers.length === correct.length && answers.every((a) => correct.includes(a));

        setAnswersMap((prev) => {
            const newMap = new Map(prev);
            newMap.set(currentIndex, {
                questionId: currentQuestion.id,
                userAnswers: answers,
                isCorrect: isAnswerCorrect,
            });
            return newMap;
        });
    };

    const handleSelect = (option: string) => {
        if (hasSubmitted) return;

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

    const handleFinish = () => setState('result');

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
            if (e.code === 'Space') {
                e.preventDefault();
                if (hasSubmitted) {
                    handleNext();
                } else if (currentQuestion.type === 'single' && selectedAnswers.length === 0) {
                    const correctAnswer = currentQuestion.answers[0];
                    setSelectedAnswers([correctAnswer]);
                    submitAnswer([correctAnswer]);
                } else if (currentQuestion.type === 'multiple' && selectedAnswers.length > 0) {
                    submitAnswer(selectedAnswers);
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
            if (idx !== undefined && currentOptionsOrder[idx]) {
                handleSelect(currentOptionsOrder[idx]);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [state, hasSubmitted, currentQuestion, selectedAnswers, currentOptionsOrder, handlePrev, handleNext]);

    const handleRestart = () => {
        localStorage.removeItem(STORAGE_KEY);
        setState('start');
        setAnswersMap(new Map());
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
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-vercel-text-muted">加载中...</div>
            </div>
        );
    }

    // 开始界面
    if (state === 'start') {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-6">
                <div className="w-full max-w-lg">
                    <div className="border border-vercel-border rounded-lg bg-vercel-card p-8">
                        <h1 className="text-2xl font-semibold text-vercel-text text-center mb-2">{data.title}</h1>
                        <p className="text-vercel-text-secondary text-center text-sm mb-8">{data.description}</p>

                        <div className="flex justify-center gap-6 mb-8 text-sm">
                            <div className="text-center">
                                <div className="text-vercel-text font-medium">{data.single_count}</div>
                                <div className="text-vercel-text-muted">单选题</div>
                            </div>
                            <div className="w-px bg-vercel-border" />
                            <div className="text-center">
                                <div className="text-vercel-text font-medium">{data.multiple_count}</div>
                                <div className="text-vercel-text-muted">多选题</div>
                            </div>
                            <div className="w-px bg-vercel-border" />
                            <div className="text-center">
                                <div className="text-vercel-text font-medium">{data.total}</div>
                                <div className="text-vercel-text-muted">总计</div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => startQuiz('sequential')}
                                className="flex-1 h-10 bg-white text-black font-medium rounded-md hover:bg-gray-200 transition-colors">
                                顺序练习
                            </button>
                            <button
                                onClick={() => startQuiz('random')}
                                className="flex-1 h-10 border border-vercel-border text-vercel-text font-medium rounded-md hover:bg-vercel-elevated transition-colors">
                                随机练习
                            </button>
                        </div>
                    </div>

                    <p className="text-vercel-text-muted text-xs text-center mt-4">
                        快捷键：1-5 或 ASDFG 选择 · ← → 切换题目 · 空格 下一题/跳过
                    </p>
                </div>
            </div>
        );
    }

    // 结果界面
    if (state === 'result') {
        const records = Array.from(answersMap.values());
        const wrongRecords = records.filter((r) => !r.isCorrect);

        return (
            <div className="min-h-screen bg-black p-6">
                <div className="max-w-3xl mx-auto">
                    <div className="border border-vercel-border rounded-lg bg-vercel-card p-8 mb-6">
                        <h1 className="text-xl font-semibold text-vercel-text text-center mb-6">练习完成</h1>

                        <div className="grid grid-cols-4 gap-4 mb-6">
                            <div className="text-center p-4 rounded-md bg-vercel-elevated border border-vercel-border">
                                <div className="text-2xl font-semibold text-vercel-text">{stats.total}</div>
                                <div className="text-xs text-vercel-text-muted mt-1">总题数</div>
                            </div>
                            <div className="text-center p-4 rounded-md bg-vercel-elevated border border-vercel-border">
                                <div className="text-2xl font-semibold text-green-500">{stats.correct}</div>
                                <div className="text-xs text-vercel-text-muted mt-1">正确</div>
                            </div>
                            <div className="text-center p-4 rounded-md bg-vercel-elevated border border-vercel-border">
                                <div className="text-2xl font-semibold text-red-500">{stats.total - stats.correct}</div>
                                <div className="text-xs text-vercel-text-muted mt-1">错误</div>
                            </div>
                            <div className="text-center p-4 rounded-md bg-vercel-elevated border border-vercel-border">
                                <div className="text-2xl font-semibold text-vercel-accent">{stats.rate}%</div>
                                <div className="text-xs text-vercel-text-muted mt-1">正确率</div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            {wrongRecords.length > 0 && (
                                <button
                                    onClick={startWrongQuiz}
                                    className="flex-1 h-10 bg-red-500 text-white font-medium rounded-md hover:bg-red-600 transition-colors">
                                    错题训练 ({wrongRecords.length})
                                </button>
                            )}
                            <button
                                onClick={handleRestart}
                                className="flex-1 h-10 bg-white text-black font-medium rounded-md hover:bg-gray-200 transition-colors">
                                重新开始
                            </button>
                        </div>
                    </div>

                    {wrongRecords.length > 0 && (
                        <div className="border border-vercel-border rounded-lg bg-vercel-card">
                            <div className="px-6 py-4 border-b border-vercel-border">
                                <h2 className="text-sm font-medium text-vercel-text">
                                    错题回顾 ({wrongRecords.length})
                                </h2>
                            </div>

                            <div className="divide-y divide-vercel-border">
                                {wrongRecords.map((record) => {
                                    const q = questions.find((q) => q.id === record.questionId)!;
                                    return (
                                        <div key={record.questionId} className="p-6">
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="px-2 py-0.5 text-xs rounded bg-vercel-elevated text-vercel-text-secondary border border-vercel-border">
                                                    {q.part}
                                                </span>
                                                <span className="text-xs text-vercel-text-muted">第 {q.number} 题</span>
                                                {q.type === 'multiple' && (
                                                    <span className="px-2 py-0.5 text-xs rounded bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                                                        多选
                                                    </span>
                                                )}
                                            </div>

                                            <p className="text-vercel-text mb-4">{q.title}</p>

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
                                                                    : 'bg-vercel-elevated border border-vercel-border'
                                                            }`}>
                                                            <span
                                                                className={`font-medium ${
                                                                    isCorrectAnswer
                                                                        ? 'text-green-500'
                                                                        : isWrongAnswer
                                                                        ? 'text-red-500'
                                                                        : 'text-vercel-text-secondary'
                                                                }`}>
                                                                {key}
                                                            </span>
                                                            <span
                                                                className={
                                                                    isCorrectAnswer
                                                                        ? 'text-green-400'
                                                                        : isWrongAnswer
                                                                        ? 'text-red-400'
                                                                        : 'text-vercel-text-secondary'
                                                                }>
                                                                {value}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            <div className="text-sm space-y-1 mb-3">
                                                <p className="text-vercel-text-secondary">
                                                    你的答案：
                                                    <span className="text-red-500 ml-1">
                                                        {record.userAnswers.join(', ')}
                                                    </span>
                                                </p>
                                                <p className="text-vercel-text-secondary">
                                                    正确答案：
                                                    <span className="text-green-500 ml-1">{q.answers.join(', ')}</span>
                                                </p>
                                            </div>

                                            <div className="text-sm text-vercel-text-muted bg-vercel-elevated rounded-md p-3 border border-vercel-border">
                                                <span className="text-vercel-text-secondary">解析：</span>
                                                {q.explanation}
                                            </div>
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
        <div className="min-h-screen bg-black p-6">
            <div className="max-w-2xl mx-auto">
                {/* 进度条 */}
                <div className="h-1 bg-vercel-elevated rounded-full mb-6 overflow-hidden">
                    <div
                        className="h-full bg-white transition-all duration-300"
                        style={{ width: `${(answersMap.size / questions.length) * 100}%` }}
                    />
                </div>

                {/* 头部信息 */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleExit}
                            className="px-2 py-0.5 text-xs rounded bg-vercel-elevated text-vercel-text-muted border border-vercel-border hover:text-vercel-text hover:border-vercel-border-light transition-colors">
                            ✕ 退出
                        </button>
                        <span className="px-2 py-0.5 text-xs rounded bg-vercel-elevated text-vercel-text-secondary border border-vercel-border">
                            {currentQuestion.part}
                        </span>
                        <span className="text-sm text-vercel-text">
                            {currentIndex + 1}
                            <span className="text-vercel-text-muted"> / {questions.length}</span>
                        </span>
                        <span
                            className={`px-2 py-0.5 text-xs rounded border ${
                                currentQuestion.type === 'multiple'
                                    ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                                    : 'bg-vercel-elevated text-vercel-text-secondary border-vercel-border'
                            }`}>
                            {currentQuestion.type === 'single' ? '单选' : '多选'}
                        </span>
                    </div>
                    <div className="text-sm">
                        <span className="text-green-500">{stats.correct}</span>
                        <span className="text-vercel-text-muted"> / {stats.total}</span>
                    </div>
                </div>

                {/* 题目卡片 */}
                <div className="border border-vercel-border rounded-lg bg-vercel-card mb-4">
                    <div className="p-6 border-b border-vercel-border">
                        <h2 className="text-lg text-vercel-text leading-relaxed">{currentQuestion.title}</h2>
                    </div>

                    <div className="p-4 space-y-2">
                        {currentOptionsOrder.map((key, idx) => {
                            const value = currentQuestion.options[key];
                            const isSelected = selectedAnswers.includes(key);
                            const isCorrectAnswer = currentQuestion.answers.includes(key);
                            const displayKey = String(idx + 1);

                            let optionStyle =
                                'border-vercel-border hover:border-vercel-border-light hover:bg-vercel-elevated';
                            if (isSelected && !hasSubmitted) {
                                optionStyle = 'border-white bg-white/5';
                            }
                            if (hasSubmitted) {
                                if (isCorrectAnswer) {
                                    optionStyle = 'border-green-500 bg-green-500/10';
                                } else if (isSelected) {
                                    optionStyle = 'border-red-500 bg-red-500/10';
                                }
                            }

                            return (
                                <button
                                    key={key}
                                    onClick={() => handleSelect(key)}
                                    disabled={hasSubmitted}
                                    className={`w-full flex items-start gap-4 p-4 rounded-md border transition-all text-left ${optionStyle} ${
                                        hasSubmitted ? 'cursor-default' : 'cursor-pointer'
                                    }`}>
                                    <span
                                        className={`flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium flex-shrink-0 ${
                                            hasSubmitted && isCorrectAnswer
                                                ? 'bg-green-500 text-black'
                                                : hasSubmitted && isSelected
                                                ? 'bg-red-500 text-white'
                                                : isSelected
                                                ? 'bg-white text-black'
                                                : 'bg-vercel-elevated text-vercel-text-secondary border border-vercel-border'
                                        }`}>
                                        {displayKey}
                                    </span>
                                    <span
                                        className={`flex-1 ${
                                            hasSubmitted && isCorrectAnswer
                                                ? 'text-green-400'
                                                : hasSubmitted && isSelected && !isCorrectAnswer
                                                ? 'text-red-400'
                                                : 'text-vercel-text'
                                        }`}>
                                        {value}
                                    </span>
                                    {hasSubmitted && isCorrectAnswer && (
                                        <span className="text-green-500 font-medium">✓</span>
                                    )}
                                    {hasSubmitted && isSelected && !isCorrectAnswer && (
                                        <span className="text-red-500 font-medium">✗</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* 操作提示 */}
                <div className="text-xs text-vercel-text-muted mb-4 px-1">
                    {currentQuestion.type === 'single' ? (
                        <span>💡 单选题：点击选项或按 1-5/ASDFG 立即作答，按空格跳过并显示答案</span>
                    ) : (
                        <span>💡 多选题：点击选项或按 1-5/ASDFG 勾选，完成后点击「确认选择」或按空格提交</span>
                    )}
                </div>

                {/* 反馈区域 */}
                {hasSubmitted && (
                    <div
                        className={`rounded-lg p-5 mb-6 border ${
                            isCorrect ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'
                        }`}>
                        <div className={`font-medium mb-3 ${isCorrect ? 'text-green-500' : 'text-red-500'}`}>
                            {isCorrect ? '✓ 回答正确' : '✗ 回答错误'}
                        </div>
                        <div className="text-sm text-vercel-text-secondary mb-2">
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
                        <div className="text-sm text-vercel-text-muted">
                            <span className="text-vercel-text-secondary">解析：</span>
                            {replaceOptionLetters(currentQuestion.explanation, currentOptionsOrder)}
                        </div>
                    </div>
                )}

                {/* 操作按钮 */}
                <div className="flex items-center justify-between gap-3">
                    <button
                        onClick={handlePrev}
                        disabled={currentIndex === 0}
                        className="h-10 px-4 border border-vercel-border text-vercel-text rounded-md hover:bg-vercel-elevated transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                        ← 上一题
                    </button>

                    <div className="flex gap-3">
                        {!hasSubmitted && currentQuestion.type === 'multiple' && (
                            <button
                                onClick={handleConfirmMultiple}
                                disabled={selectedAnswers.length === 0}
                                className="h-10 px-6 bg-white text-black font-medium rounded-md hover:bg-gray-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                                确认选择
                            </button>
                        )}
                    </div>

                    {currentIndex < questions.length - 1 ? (
                        <button
                            onClick={handleNext}
                            className="h-10 px-4 border border-vercel-border text-vercel-text rounded-md hover:bg-vercel-elevated transition-colors">
                            下一题 →
                        </button>
                    ) : (
                        <button
                            onClick={handleFinish}
                            disabled={!allAnswered}
                            className="h-10 px-6 bg-white text-black font-medium rounded-md hover:bg-gray-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                            查看结果
                        </button>
                    )}
                </div>

                {/* 未答题提示 */}
                {!allAnswered && (
                    <p className="text-center text-vercel-text-muted text-sm mt-4">
                        还有 {questions.length - answersMap.size} 题未作答
                    </p>
                )}
            </div>
        </div>
    );
}

export default App;
