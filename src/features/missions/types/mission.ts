export type Track = "frontend" | "backend";

export type Difficulty = "Easy" | "Medium" | "Hard";

export type Question = {
  id: number;

  question: string;

  category: string;

  options: string[];

  correctAnswer: number;

  explanation: string;

  xp: number;
};

export type Mission = {
  id: string;

  title: string;

  topic : string;

  track: Track;

  difficulty: Difficulty;

  xpReward: number;

  estimatedTime: number;

  description: string;

  objectives: string[];

  questions: Question[];
};