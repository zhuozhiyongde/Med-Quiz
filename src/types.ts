export interface Question {
    type: 'single' | 'multiple';
    title: string;
    options: Record<string, string>;
    answers: string[];
    explanation: string;
    image?: string; // 题目配图路径
}

export interface QuizData {
    title: string;
    description: string;
    questions: Question[];
}

export interface CourseInfo {
    slug: string;
    title: string;
    source?: string;
    hasChapters?: boolean;
}

export interface CourseIndex {
    courses: CourseInfo[];
}

export interface ChapterInfo {
    id: string;
    title: string;
    questionCount: number;
}

export interface CourseChapterIndex {
    title: string;
    description: string;
    totalQuestions: number;
    chapters: ChapterInfo[];
}

export interface AnswerRecord {
    questionIndex: number;
    userAnswers: string[];
    isCorrect: boolean;
}
