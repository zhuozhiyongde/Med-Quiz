export interface Question {
  id: string;
  part: string;
  number: number;
  type: "single" | "multiple";
  title: string;
  options: Record<string, string>;
  answers: string[];
  explanation: string;
}

export interface QuizData {
  title: string;
  description: string;
  total: number;
  single_count: number;
  multiple_count: number;
  questions: Question[];
}

export interface AnswerRecord {
  questionId: string;
  userAnswers: string[];
  isCorrect: boolean;
}

