export interface Question {
  type: "single" | "multiple";
  title: string;
  options: Record<string, string>;
  answers: string[];
  explanation: string;
}

export interface QuizData {
  title: string;
  description: string;
  questions: Question[];
}

export interface CourseInfo {
  slug: string;
  title: string;
}

export interface CourseIndex {
  courses: CourseInfo[];
}

export interface AnswerRecord {
  questionIndex: number;
  userAnswers: string[];
  isCorrect: boolean;
}
