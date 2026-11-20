import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Download,
  FileDown,
  FileUp,
  Pencil,
  Play,
  RotateCcw,
  Search,
  Trash2,
} from 'lucide-react';
import { validateQuiz } from '../domain/quiz';
import { PresentationSession, Quiz } from '../domain/types';

interface DashboardViewProps {
  quizzes: Quiz[];
  recoverableSession: PresentationSession | null;
  storageWarning: string | null;
  onCreateQuiz: () => void;
  onOpenImport: () => void;
  onOpenTemplates: () => void;
  onEditQuiz: (quizId: string) => void;
  onSetupPresentation: (quizId: string) => void;
  onDuplicateQuiz: (quizId: string) => void;
  onDeleteQuiz: (quizId: string) => void;
  onExportQuizJson: (quiz: Quiz) => void;
  onResumeSession: () => void;
  onDiscardSession: () => void;
  onRestoreSamples: () => void;
}

function formatShortDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return '';
  }
}

function formatDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function describePolicy(policy: PresentationSession['reveal_policy']): string {
  if (policy === 'manual') return 'Manual reveal';
  if (policy === 'after_each') return 'Reveal after each question';
  return 'Reveal after entire quiz';
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  quizzes,
  recoverableSession,
  storageWarning,
  onCreateQuiz,
  onOpenImport,
  onOpenTemplates,
  onEditQuiz,
  onSetupPresentation,
  onDuplicateQuiz,
  onDeleteQuiz,
  onExportQuizJson,
  onResumeSession,
  onDiscardSession,
  onRestoreSamples,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [quizToDelete, setQuizToDelete] = useState<Quiz | null>(null);
  const [confirmDiscardSession, setConfirmDiscardSession] = useState(false);

  const filteredQuizzes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return quizzes;
    return quizzes.filter(
      (quiz) =>
        quiz.title.toLowerCase().includes(q) ||
        quiz.instructions.toLowerCase().includes(q) ||
        quiz.questions.some(
          (item) =>
            item.text.toLowerCase().includes(q) ||
            (item.section || '').toLowerCase().includes(q),
        ),
    );
  }, [quizzes, searchQuery]);

  const validationById = useMemo(() => {
    const map = new Map<string, ReturnType<typeof validateQuiz>>();
    for (const quiz of quizzes) {
      map.set(quiz.id, validateQuiz(quiz));
    }
    return map;
  }, [quizzes]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {storageWarning && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
          <div>
            <p className="font-semibold">Local storage notice</p>
            <p className="text-amber-900">{storageWarning}</p>
          </div>
        </div>
      )}

      {/* Recoverable Presentation Session Banner */}
      {recoverableSession && recoverableSession.status !== 'completed' && (
        <section
          aria-label="Recoverable presentation session"
          className="mb-8 rounded-xl border border-blue-200 bg-blue-50/70 p-5"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-semibold text-blue-900">
                <RotateCcw className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Saved presentation session ready to resume</span>
              </div>
              <h2 className="text-lg font-bold text-slate-950">
                {recoverableSession.quiz_snapshot.title}
              </h2>
              <p className="text-sm text-slate-700 tabular-nums">
                {recoverableSession.status === 'answer_review'
                  ? 'In Answer Review'
                  : `Question ${recoverableSession.current_index + 1} of ${recoverableSession.question_order.length}`}{' '}
                <span aria-hidden="true">·</span>{' '}
                {describePolicy(recoverableSession.reveal_policy)}{' '}
                <span aria-hidden="true">·</span> Saved{' '}
                {formatDateTime(recoverableSession.updated_at)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={onResumeSession}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 transition-colors whitespace-nowrap min-h-[44px]"
              >
                <Play className="h-4 w-4" aria-hidden="true" />
                <span>Resume Presentation</span>
              </button>
              <button
                type="button"
                onClick={() => setConfirmDiscardSession(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap min-h-[44px]"
              >
                <span>Discard</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Workspace Header & Quick Workflow Actions */}
      <div className="mb-8 flex flex-col gap-6 border-b border-slate-200 pb-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl [text-wrap:balance]">
            Classroom Quiz Library
          </h1>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            Prepare quizzes in Excel, Word, CSV, or JSON, validate every answer key locally on this
            device, and present one readable question at a time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onOpenImport}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap min-h-[44px]"
          >
            <FileUp className="h-4 w-4 text-slate-600" aria-hidden="true" />
            <span>Import Quiz</span>
          </button>
          <button
            type="button"
            onClick={onOpenTemplates}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap min-h-[44px]"
          >
            <FileDown className="h-4 w-4 text-slate-600" aria-hidden="true" />
            <span>Download Template</span>
          </button>
        </div>
      </div>

      {/* Search & Count Strip */}
      {quizzes.length > 0 && (
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <label htmlFor="quiz-search" className="sr-only">
              Search quizzes
            </label>
            <input
              id="quiz-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by title, topic, or question..."
              className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none min-h-[44px]"
            />
          </div>
          <p className="text-sm text-slate-600 tabular-nums">
            Showing {filteredQuizzes.length} of {quizzes.length}{' '}
            {quizzes.length === 1 ? 'quiz' : 'quizzes'} stored locally
          </p>
        </div>
      )}

      {/* Quiz List */}
      {quizzes.length === 0 ? (
        <section className="rounded-xl border border-slate-200 bg-white px-6 py-14 text-center">
          <h2 className="text-lg font-semibold text-slate-900">No quizzes in your local library</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
            Create a new quiz directly in QuizDeck, download a structured spreadsheet or Word
            template to fill offline, or import an existing quiz file.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onCreateQuiz}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 transition-colors whitespace-nowrap min-h-[44px]"
            >
              <span>Create Quiz</span>
            </button>
            <button
              type="button"
              onClick={onOpenImport}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap min-h-[44px]"
            >
              <span>Import Quiz File</span>
            </button>
            <button
              type="button"
              onClick={onRestoreSamples}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap min-h-[44px]"
            >
              <span>Load Sample Quizzes</span>
            </button>
          </div>
        </section>
      ) : filteredQuizzes.length === 0 ? (
        <section className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
          <p className="text-sm font-medium text-slate-900">
            No quizzes match “{searchQuery}”.
          </p>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="mt-3 text-sm font-medium text-blue-700 hover:text-blue-900 underline"
          >
            Clear search filter
          </button>
        </section>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white divide-y divide-slate-200">
          {filteredQuizzes.map((quiz) => {
            const validation = validationById.get(quiz.id)!;
            const sections = Array.from(
              new Set(quiz.questions.map((q) => (q.section || '').trim()).filter(Boolean)),
            );

            return (
              <article
                key={quiz.id}
                className="flex flex-col gap-4 p-5 transition-colors hover:bg-slate-50/70 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h2 className="text-base font-semibold text-slate-950 truncate">
                      {quiz.title}
                    </h2>
                    {validation.valid ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span>Ready to present</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span>
                          {validation.errors.length}{' '}
                          {validation.errors.length === 1 ? 'validation error' : 'validation errors'}
                        </span>
                      </span>
                    )}
                  </div>

                  {quiz.instructions && (
                    <p className="mt-1 text-sm text-slate-600 line-clamp-1">
                      {quiz.instructions}
                    </p>
                  )}

                  <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 tabular-nums">
                    <span>
                      {quiz.questions.length}{' '}
                      {quiz.questions.length === 1 ? 'question' : 'questions'}
                    </span>
                    {sections.length > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>
                          {sections.length} {sections.length === 1 ? 'section' : 'sections'}
                        </span>
                      </>
                    )}
                    <span aria-hidden="true">·</span>
                    <span>Updated {formatShortDate(quiz.updated_at)}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onSetupPresentation(quiz.id)}
                    aria-label={`Present "${quiz.title}"`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition-colors whitespace-nowrap min-h-[40px]"
                  >
                    <Play className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Present</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onEditQuiz(quiz.id)}
                    aria-label={`Edit "${quiz.title}"`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap min-h-[40px]"
                  >
                    <Pencil className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onExportQuizJson(quiz)}
                    aria-label={`Export "${quiz.title}" as JSON`}
                    title="Export canonical JSON backup"
                    className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors min-h-[40px] min-w-[40px]"
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onDuplicateQuiz(quiz.id)}
                    aria-label={`Duplicate "${quiz.title}"`}
                    title="Duplicate quiz"
                    className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors min-h-[40px] min-w-[40px]"
                  >
                    <Copy className="h-4 w-4" aria-hidden="true" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setQuizToDelete(quiz)}
                    aria-label={`Delete "${quiz.title}"`}
                    title="Delete quiz"
                    className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700 transition-colors min-h-[40px] min-w-[40px]"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Delete Quiz Confirmation Modal */}
      {quizToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-quiz-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <h2 id="delete-quiz-title" className="text-lg font-bold text-slate-950">
              Delete quiz from local library?
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              “{quizToDelete.title}” ({quizToDelete.questions.length} questions) will be permanently
              removed from this browser. Export a JSON backup first if you want to keep a copy.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setQuizToDelete(null)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 min-h-[40px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteQuiz(quizToDelete.id);
                  setQuizToDelete(null);
                }}
                className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 min-h-[40px]"
              >
                Delete Quiz
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discard Session Confirmation Modal */}
      {confirmDiscardSession && recoverableSession && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="discard-session-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <h2 id="discard-session-title" className="text-lg font-bold text-slate-950">
              Discard saved presentation session?
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              This removes the saved question order and progress for “
              {recoverableSession.quiz_snapshot.title}”. Your original quiz in the library will not
              be affected.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDiscardSession(false)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 min-h-[40px]"
              >
                Keep Session
              </button>
              <button
                type="button"
                onClick={() => {
                  onDiscardSession();
                  setConfirmDiscardSession(false);
                }}
                className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 min-h-[40px]"
              >
                Discard Session
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
