export type Track = "frontend" | "backend";

export type Difficulty = "Easy" | "Medium" | "Hard" | "EASY" | "MEDIUM" | "HARD";

export type Question = {
  id: string | number;

  question: string;

  category: string;

  options: string[];

  optionIds?: string[];

  correctAnswer?: number;

  explanation?: string;

  xp: number;
};

export type Mission = {
  id: string;

  title: string;

  topic : string;

  track: Track | string;

  difficulty: Difficulty;

  xpReward: number;

  estimatedTime: number;

  description: string;

  objectives: string[];

  questions: Question[];
};

export type QuestionResult = {
  questionId: string | number;

  question: string;

  selectedAnswer: string;

  correctAnswer: string;

  isCorrect: boolean;

  unanswered: boolean;

  explanation?: string | null;
};

export type MissionResult = {
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  accuracy: number;
  xpEarned: number;
  questionResults: QuestionResult[];
};