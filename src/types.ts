/**
 * Types representing the Educational Quiz Platform models.
 */

export interface Question {
  id: string;
  text: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation?: string;
}

export interface Quiz {
  id: string;
  title: string;
  subject: string;
  description: string;
  questions: Question[];
  isPublished: boolean;
  createdBy: string;
  createdAt: string;
  duration: number; // in minutes
  subMenuId?: string; // Associated sub-menu identity for Classes 6-10
}

export interface QuizAttempt {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  quizId: string;
  quizTitle: string;
  subject: string;
  score: number; // percentage, e.g. 85
  correctCount: number;
  wrongCount: number;
  totalQuestions: number;
  answers: Record<string, 'A' | 'B' | 'C' | 'D' | ''>; // questionId -> selectedOption
  isPassed: boolean;
  createdAt: string;
  timeSpentSeconds: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: string;
}

export interface LeaderboardEntry {
  userId: string;
  userName: string;
  userEmail: string;
  quizzesTaken: number;
  averageScore: number;
  totalCorrectAnswers: number;
}

export type Language = 'en' | 'bn';

export interface QuizApproval {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  quizId: string;
  quizTitle: string;
  status: 'pending' | 'approved' | 'rejected' | 'used';
  requestedAt: string;
  resolvedAt?: string;
}

export interface SubMenu {
  id: string;
  parentClass: string; // e.g. "Class 6" | "Class 7" | "Class 8" | "Class 9" | "Class 10"
  en: string;          // English title e.g. "General Science"
  bn: string;          // Bengali title e.g. "সাধারণ বিজ্ঞান"
}

