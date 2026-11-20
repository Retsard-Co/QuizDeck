export const SCHEMA_VERSION = '1.0';
export const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024; // 5 MB safety limit

export type QuestionType = 'multiple_choice';

export interface Option {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  options: Option[];
  correct_option_ids: string[];
  explanation?: string;
  section?: string;
  points: number;
  original_number?: number;
}

export interface Quiz {
  id: string;
  schema_version: string;
  revision: number;
  title: string;
  instructions: string;
  questions: Question[];
  created_at: string;
  updated_at: string;
}

export type RevealPolicy = 'manual' | 'after_each' | 'after_entire_quiz';
export type LayoutDensity = 'compact' | 'balanced' | 'spacious';
export type PresentationTheme = 'dark' | 'light' | 'high_contrast';
export type SessionStatus =
  | 'setup'
  | 'ready'
  | 'presenting'
  | 'paused'
  | 'answer_review'
  | 'completed';

export interface SessionSettings {
  randomize_questions: boolean;
  randomize_choices: boolean;
  randomize_within_sections: boolean;
  seed: string;
  show_question_number: boolean;
  show_original_number: boolean;
  show_progress: boolean;
  auto_fit: boolean;
  question_font_preference: number;
  choice_font_preference: number;
  title_font_preference: number;
  review_font_preference: number;
  layout_density: LayoutDensity;
  theme: PresentationTheme;
  timer_enabled: boolean;
  timer_seconds: number;
  timer_auto_advance: boolean;
  allow_hide_after_reveal: boolean;
}

export interface PresentationSession {
  id: string;
  schema_version: string;
  quiz_id: string;
  quiz_revision: number;
  quiz_snapshot: Quiz;
  status: SessionStatus;
  question_order: string[];
  option_orders: Record<string, string[]>;
  randomization_algorithm: string;
  seed_used: string | null;
  current_index: number;
  reveal_policy: RevealPolicy;
  revealed_question_ids: string[];
  revisit_question_ids: string[];
  settings: SessionSettings;
  timer_remaining_seconds: number | null;
  timer_running: boolean;
  timer_expired: boolean;
  created_at: string;
  updated_at: string;
}

export type ValidationSeverity = 'error' | 'warning';

export interface ValidationIssue {
  severity: ValidationSeverity;
  code: string;
  message: string;
  suggestion: string;
  questionId?: string;
  questionIndex?: number;
  rowNumber?: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  issues: ValidationIssue[];
}

export type ImportFormat = 'json' | 'csv' | 'xlsx' | 'docx';

export interface ImportReport {
  fileName: string;
  detectedFormat: ImportFormat | 'unknown';
  recognizedCount: number;
  validCount: number;
  skippedCount: number;
  warnings: ValidationIssue[];
  errors: ValidationIssue[];
  quiz: Quiz | null;
}

export interface CanonicalQuizExport {
  schema_version: string;
  exported_at: string;
  quiz: {
    id: string;
    title: string;
    instructions: string;
    questions: Question[];
  };
}
