export enum EssayType {
  BIG = 'BIG',   // English I Big Composition (20 points)
  SMALL = 'SMALL' // English I Small Composition (10 points)
}

export interface ScoreBreakdown {
  languageAccuracy: number; 
  contentCompleteness: number; 
  languageAuthenticity: number; 
  structureCoherence: number;
  neatness: number; // New: Handwriting/Presentation score (usually 0-3 variance in real exams)
}

export interface Correction {
  original: string;
  correction: string;
  explanation: string;
  type: 'grammar' | 'spelling' | 'vocabulary' | 'structure';
}

export interface Improvement {
  original: string;
  improved: string;
  reason: string; // Why this is better for Kaoyan (e.g., "More academic", "Collocation")
  type: 'vocabulary' | 'sentence_structure';
}

export interface Exercise {
  question: string;
  options?: string[]; // Multiple choice options if applicable
  answer: string;
  explanation: string;
}

export interface RevisionAnalysis {
  isRevision: boolean; // Did the AI identify this as a revision?
  scoreChange: string; // e.g. "+2" or "-1" or "0"
  improvements: string[]; // What got better compared to last time
  persistentErrors: string[]; // Errors that appeared in previous drafts and are still here
  weaknessSummary: string; // Summary of recurring bad habits across all drafts
}

export interface GradingResult {
  totalScore: number;
  maxScore: number;
  breakdown: ScoreBreakdown;
  topicAnalysis: {
    corePoints: string[];
    impliedMeaning: string;
  };
  wordCountAnalysis: {
    count: number;
    comment: string; // e.g. "Too short, penalty applied" or "Perfect length"
    isAcceptable: boolean;
    pruningAdvice?: string; // Specific advice on what to cut if too long
  };
  userOutline: string; // Summary of the user's logic/structure
  brightSpots: string[]; // Positive feedback (Strengths)
  generalComments: string;
  handwritingComments: string; // Specific feedback on visual presentation
  suggestions: string[];
  corrections: Correction[]; // Fix errors
  improvements: Improvement[]; // Make it better/advanced
  polishedVersion: string;
  exercises: Exercise[];
  revisionAnalysis?: RevisionAnalysis; // New: Optional field for revision comparison
}

export interface HistoryRecord {
  id: string;
  timestamp: number;
  type: EssayType;
  topicText: string;
  essayText: string;
  result: GradingResult;
  hasImages: boolean;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}