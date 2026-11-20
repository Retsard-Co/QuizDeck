import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CheckCircle2,
  Copy,
  Download,
  Play,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import { cloneQuiz, createBlankQuestion, getDisplayLetter, validateQuiz } from '../domain/quiz';
import { Question, Quiz } from '../domain/types';
import {
  exportQuizToCsv,
  exportQuizToDocx,
  exportQuizToJson,
  exportQuizToXlsx,
} from '../importers';
import { downloadBinaryFile, downloadTextFile, slugifyFilename } from '../lib/download';

interface QuizEditorViewProps {
  initialQuiz: Quiz;
  onSave: (quiz: Quiz) => Promise<boolean>;
  onSaveAndPresent: (quiz: Quiz) => Promise<void>;
  onBack: () => void;
}

export const QuizEditorView: React.FC<QuizEditorViewProps> = ({
  initialQuiz,
  onSave,
  onSaveAndPresent,
  onBack,
}) => {
  const [quiz, setQuiz] = useState<Quiz>(() => cloneQuiz(initialQuiz));
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [isDirty, setIsDirty] = useState(false);
  const [saveBanner, setSaveBanner] = useState<string | null>(null);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showExportMenu) return;
    const onPointerDown = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowExportMenu(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [showExportMenu]);

  const validation = useMemo(() => validateQuiz(quiz), [quiz]);

  const activeQuestion: Question | undefined = quiz.questions[selectedIndex];
  const activeQuestionErrors = validation.errors.filter(
    (e) => e.questionIndex === selectedIndex,
  );
  const activeQuestionWarnings = validation.warnings.filter(
    (w) => w.questionIndex === selectedIndex,
  );

  const updateQuiz = (updater: (prev: Quiz) => Quiz) => {
    setQuiz((prev) => updater(prev));
    setIsDirty(true);
    setSaveBanner(null);
  };

  const updateActiveQuestion = (updater: (q: Question) => Question) => {
    updateQuiz((prev) => {
      const next = [...prev.questions];
      if (!next[selectedIndex]) return prev;
      next[selectedIndex] = updater(next[selectedIndex]);
      return { ...prev, questions: next };
    });
  };

  const handleAddQuestion = () => {
    const newQ = createBlankQuestion(quiz.questions.length);
    updateQuiz((prev) => ({
      ...prev,
      questions: [...prev.questions, newQ],
    }));
    setSelectedIndex(quiz.questions.length);
  };

  const handleDuplicateQuestion = (idx: number) => {
    const source = quiz.questions[idx];
    if (!source) return;
    const copy: Question = {
      ...source,
      id: `${source.id}-copy-${Math.random().toString(36).slice(2, 5)}`,
      original_number: quiz.questions.length + 1,
      options: source.options.map((o) => ({ ...o })),
      correct_option_ids: [...source.correct_option_ids],
    };
    updateQuiz((prev) => {
      const next = [...prev.questions];
      next.splice(idx + 1, 0, copy);
      return { ...prev, questions: next };
    });
    setSelectedIndex(idx + 1);
  };

  const handleDeleteQuestion = (idx: number) => {
    if (quiz.questions.length <= 1) return;
    updateQuiz((prev) => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== idx),
    }));
    setSelectedIndex((curr) => Math.max(0, Math.min(curr, quiz.questions.length - 2)));
  };

  const handleMoveQuestion = (idx: number, direction: -1 | 1) => {
    const target = idx + direction;
    if (target < 0 || target >= quiz.questions.length) return;
    updateQuiz((prev) => {
      const next = [...prev.questions];
      const [moved] = next.splice(idx, 1);
      next.splice(target, 0, moved);
      return { ...prev, questions: next };
    });
    setSelectedIndex(target);
  };

  const handleAddOption = () => {
    if (!activeQuestion || activeQuestion.options.length >= 6) return;
    const usedIds = new Set(activeQuestion.options.map((o) => o.id));
    const candidateIds = ['a', 'b', 'c', 'd', 'e', 'f'];
    const nextId = candidateIds.find((id) => !usedIds.has(id)) || `opt${activeQuestion.options.length + 1}`;
    updateActiveQuestion((q) => ({
      ...q,
      options: [...q.options, { id: nextId, text: '' }],
    }));
  };

  const handleRemoveOption = (optId: string) => {
    if (!activeQuestion || activeQuestion.options.length <= 2) return;
    updateActiveQuestion((q) => {
      const remaining = q.options.filter((o) => o.id !== optId);
      const nextCorrect = q.correct_option_ids.filter((id) => id !== optId);
      return {
        ...q,
        options: remaining,
        correct_option_ids: nextCorrect.length > 0 ? nextCorrect : [remaining[0].id],
      };
    });
  };

  const handleSave = async () => {
    const bumped: Quiz = {
      ...quiz,
      revision: (quiz.revision || 1) + 1,
      updated_at: new Date().toISOString(),
    };
    const ok = await onSave(bumped);
    if (ok) {
      setQuiz(bumped);
      setIsDirty(false);
      setSaveBanner('Saved locally to this browser.');
    }
  };

  const handlePresentClick = async () => {
    const bumped: Quiz = isDirty
      ? { ...quiz, revision: (quiz.revision || 1) + 1, updated_at: new Date().toISOString() }
      : quiz;
    setIsDirty(false);
    await onSaveAndPresent(bumped);
  };

  const handleBackClick = () => {
    if (isDirty) {
      setShowUnsavedModal(true);
    } else {
      onBack();
    }
  };

  const handleExportFormat = async (format: 'json' | 'csv' | 'xlsx' | 'docx') => {
    const slug = slugifyFilename(quiz.title);
    setShowExportMenu(false);
    if (format === 'json') {
      downloadTextFile(exportQuizToJson(quiz), `${slug}.json`, 'application/json');
    } else if (format === 'csv') {
      downloadTextFile(exportQuizToCsv(quiz), `${slug}.csv`, 'text/csv;charset=utf-8');
    } else if (format === 'xlsx') {
      downloadBinaryFile(
        exportQuizToXlsx(quiz),
        `${slug}.xlsx`,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
    } else {
      const bytes = await exportQuizToDocx(quiz);
      downloadBinaryFile(
        bytes,
        `${slug}.docx`,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      );
    }
    setSaveBanner(`Exported ${slug}.${format}`);
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Editor Action Bar */}
      <div className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={handleBackClick}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 shrink-0 min-h-[40px]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Library</span>
          </button>

          <div className="min-w-0">
            <h1 className="text-lg font-bold text-slate-950 truncate">
              {quiz.title || 'Untitled Quiz'}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 tabular-nums">
              <span>{quiz.questions.length} questions</span>
              <span aria-hidden="true">·</span>
              {validation.valid ? (
                <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>All questions valid</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-medium text-red-700">
                  <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>
                    {validation.errors.length}{' '}
                    {validation.errors.length === 1 ? 'error' : 'errors'} to fix
                  </span>
                </span>
              )}
              {isDirty && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-medium text-amber-700">Unsaved changes</span>
                </>
              )}
              {saveBanner && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-medium text-emerald-700">{saveBanner}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div ref={exportMenuRef} className="relative">
            <button
              type="button"
              aria-expanded={showExportMenu}
              onClick={() => setShowExportMenu((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 min-h-[40px]"
            >
              <Download className="h-4 w-4 text-slate-500" aria-hidden="true" />
              <span>Export</span>
            </button>
            {showExportMenu && (
              <div
                role="menu"
                className="absolute right-0 z-20 mt-1.5 w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => handleExportFormat('json')}
                  className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  Canonical JSON (.json)
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => handleExportFormat('xlsx')}
                  className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  Excel Workbook (.xlsx)
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => handleExportFormat('docx')}
                  className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  Word Document (.docx)
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => handleExportFormat('csv')}
                  className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  CSV Table (.csv)
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 min-h-[40px]"
          >
            <Save className="h-4 w-4 text-slate-600" aria-hidden="true" />
            <span>Save Quiz</span>
          </button>

          <button
            type="button"
            disabled={!validation.valid}
            onClick={handlePresentClick}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50 min-h-[40px]"
          >
            <Play className="h-4 w-4" aria-hidden="true" />
            <span>Configure &amp; Present</span>
          </button>
        </div>
      </div>

      {/* Quiz Metadata Section */}
      <section
        aria-label="Quiz metadata"
        className="mb-6 grid gap-4 rounded-xl border border-slate-200 bg-white p-5 md:grid-cols-2"
      >
        <div>
          <label htmlFor="editor-quiz-title" className="block text-xs font-semibold text-slate-700 mb-1">
            Quiz Title
          </label>
          <input
            id="editor-quiz-title"
            type="text"
            value={quiz.title}
            onChange={(e) => updateQuiz((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="e.g., Unit 3 Review — Cellular Respiration"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-950 focus:border-blue-600 focus:outline-none min-h-[40px]"
          />
        </div>
        <div>
          <label
            htmlFor="editor-quiz-instructions"
            className="block text-xs font-semibold text-slate-700 mb-1"
          >
            Instructions shown in setup &amp; exports (optional)
          </label>
          <input
            id="editor-quiz-instructions"
            type="text"
            value={quiz.instructions}
            onChange={(e) => updateQuiz((prev) => ({ ...prev, instructions: e.target.value }))}
            placeholder="Choose the single best answer for each question."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-950 focus:border-blue-600 focus:outline-none min-h-[40px]"
          />
        </div>
      </section>

      {/* Main Split: Question Sidebar + Active Question Form */}
      <div className="grid gap-6 lg:grid-cols-[290px_minmax(0,1fr)] items-start">
        {/* Left Question List */}
        <aside
          aria-label="Question list"
          className="rounded-xl border border-slate-200 bg-white overflow-hidden"
        >
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900 tabular-nums">
              Questions ({quiz.questions.length})
            </h2>
            <button
              type="button"
              onClick={handleAddQuestion}
              className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 min-h-[34px]"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Add</span>
            </button>
          </div>

          <div className="max-h-[560px] overflow-y-auto divide-y divide-slate-100">
            {quiz.questions.map((q, idx) => {
              const hasErr = validation.errors.some((e) => e.questionIndex === idx);
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={`${q.id}-${idx}`}
                  type="button"
                  onClick={() => setSelectedIndex(idx)}
                  className={`flex w-full items-start gap-2.5 px-4 py-3 text-left transition-colors ${
                    isSelected ? 'bg-blue-50/80 text-slate-950' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span
                    className={`mt-0.5 font-mono text-xs font-semibold tabular-nums shrink-0 ${
                      isSelected ? 'text-blue-700' : 'text-slate-400'
                    }`}
                  >
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {q.text.trim() || 'Untitled question'}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500 truncate">
                      {q.section ? `${q.section} · ` : ''}
                      {q.options.filter((o) => o.text.trim()).length} choices
                    </p>
                  </div>
                  {hasErr ? (
                    <AlertCircle
                      className="mt-0.5 h-4 w-4 shrink-0 text-red-600"
                      aria-label="Has validation error"
                    />
                  ) : (
                    <CheckCircle2
                      className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
                      aria-label="Valid question"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Right Active Question Editor */}
        {activeQuestion && (
          <section
            aria-label={`Editing question ${selectedIndex + 1}`}
            className="rounded-xl border border-slate-200 bg-white p-6 space-y-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-950 tabular-nums">
                  Question {selectedIndex + 1} of {quiz.questions.length}
                </h2>
                <p className="text-xs text-slate-500 font-mono">
                  Stable ID: {activeQuestion.id}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  disabled={selectedIndex === 0}
                  onClick={() => handleMoveQuestion(selectedIndex, -1)}
                  aria-label="Move question up"
                  title="Move up"
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40 min-h-[38px] min-w-[38px]"
                >
                  <ArrowUp className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  disabled={selectedIndex === quiz.questions.length - 1}
                  onClick={() => handleMoveQuestion(selectedIndex, 1)}
                  aria-label="Move question down"
                  title="Move down"
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40 min-h-[38px] min-w-[38px]"
                >
                  <ArrowDown className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDuplicateQuestion(selectedIndex)}
                  aria-label="Duplicate question"
                  title="Duplicate question"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 min-h-[38px]"
                >
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Duplicate</span>
                </button>
                <button
                  type="button"
                  disabled={quiz.questions.length <= 1}
                  onClick={() => handleDeleteQuestion(selectedIndex)}
                  aria-label="Delete question"
                  title="Delete question"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-40 min-h-[38px]"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Delete</span>
                </button>
              </div>
            </div>

            {/* Question-level validation messages */}
            {activeQuestionErrors.length > 0 && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-900 space-y-1"
              >
                {activeQuestionErrors.map((err, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" aria-hidden="true" />
                    <span>
                      <strong>{err.message}</strong> {err.suggestion}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {activeQuestionWarnings.length > 0 && activeQuestionErrors.length === 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950 space-y-1">
                {activeQuestionWarnings.map((warn, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700" aria-hidden="true" />
                    <span>{warn.message}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Question Prompt */}
            <div>
              <label
                htmlFor="question-text-input"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Question Text (line breaks are preserved on projector slides)
              </label>
              <textarea
                id="question-text-input"
                rows={4}
                value={activeQuestion.text}
                onChange={(e) =>
                  updateActiveQuestion((q) => ({ ...q, text: e.target.value }))
                }
                placeholder="Type the question students will read on screen..."
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-base text-slate-950 leading-relaxed focus:border-blue-600 focus:outline-none"
              />
            </div>

            {/* Section & Points */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="question-section-input"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Section / Topic (optional)
                </label>
                <input
                  id="question-section-input"
                  type="text"
                  value={activeQuestion.section || ''}
                  onChange={(e) =>
                    updateActiveQuestion((q) => ({ ...q, section: e.target.value }))
                  }
                  placeholder="e.g., Algorithms, Chapter 4"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none min-h-[40px]"
                />
              </div>
              <div>
                <label
                  htmlFor="question-points-input"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Points
                </label>
                <input
                  id="question-points-input"
                  type="number"
                  min={1}
                  max={100}
                  value={activeQuestion.points}
                  onChange={(e) =>
                    updateActiveQuestion((q) => ({
                      ...q,
                      points: Math.max(1, Number(e.target.value) || 1),
                    }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 tabular-nums focus:border-blue-600 focus:outline-none min-h-[40px]"
                />
              </div>
            </div>

            {/* Answer Choices (Stable Option ID mapping) */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <h3 className="text-xs font-semibold text-slate-700">
                    Answer Choices &amp; Correct Answer
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Select the radio button next to the correct choice. Correctness is stored by
                    stable option ID so choice randomization stays accurate.
                  </p>
                </div>
                {activeQuestion.options.length < 6 && (
                  <button
                    type="button"
                    onClick={handleAddOption}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 min-h-[34px] whitespace-nowrap shrink-0 self-start"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Add Choice</span>
                  </button>
                )}
              </div>

              <div className="space-y-2.5">
                {activeQuestion.options.map((opt, optIdx) => {
                  const isCorrect = activeQuestion.correct_option_ids.includes(opt.id);
                  const letter = getDisplayLetter(optIdx);
                  return (
                    <div
                      key={opt.id}
                      className={`flex items-center gap-3 rounded-lg border px-3.5 py-2.5 transition-colors ${
                        isCorrect
                          ? 'border-emerald-400 bg-emerald-50/70'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <label className="flex items-center gap-2 shrink-0 cursor-pointer">
                        <input
                          type="radio"
                          name={`correct-option-${activeQuestion.id}`}
                          checked={isCorrect}
                          onChange={() =>
                            updateActiveQuestion((q) => ({
                              ...q,
                              correct_option_ids: [opt.id],
                            }))
                          }
                          aria-label={`Mark choice ${letter} (ID ${opt.id}) as correct`}
                          className="h-4 w-4 accent-emerald-700"
                        />
                        <span className="font-mono text-sm font-bold text-slate-800 w-5">
                          {letter}
                        </span>
                      </label>

                      <input
                        type="text"
                        value={opt.text}
                        aria-label={`Choice ${letter} text`}
                        onChange={(e) =>
                          updateActiveQuestion((q) => ({
                            ...q,
                            options: q.options.map((o) =>
                              o.id === opt.id ? { ...o, text: e.target.value } : o,
                            ),
                          }))
                        }
                        placeholder={`Choice ${letter} text...`}
                        className="flex-1 bg-transparent text-sm text-slate-950 placeholder:text-slate-400 focus:outline-none min-h-[32px]"
                      />

                      {isCorrect && (
                        <span className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 shrink-0">
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Correct</span>
                        </span>
                      )}

                      {activeQuestion.options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(opt.id)}
                          aria-label={`Remove choice ${letter}`}
                          className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Optional Explanation */}
            <div>
              <label
                htmlFor="question-explanation-input"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Explanation / Rationale (optional — shown only when answer is revealed)
              </label>
              <textarea
                id="question-explanation-input"
                rows={2}
                value={activeQuestion.explanation || ''}
                onChange={(e) =>
                  updateActiveQuestion((q) => ({ ...q, explanation: e.target.value }))
                }
                placeholder="Brief teaching note explaining why the correct choice is right..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>
          </section>
        )}
      </div>

      {/* Unsaved Edits Confirmation Modal */}
      {showUnsavedModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="unsaved-edits-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <h2 id="unsaved-edits-title" className="text-lg font-bold text-slate-950">
              Leave without saving changes?
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              You have unsaved edits to “{quiz.title || 'Untitled Quiz'}”. Save before returning to
              the library, or discard your changes.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowUnsavedModal(false)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 min-h-[40px]"
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUnsavedModal(false);
                  onBack();
                }}
                className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-800 hover:bg-red-100 min-h-[40px]"
              >
                Discard Edits
              </button>
              <button
                type="button"
                onClick={async () => {
                  await handleSave();
                  setShowUnsavedModal(false);
                  onBack();
                }}
                className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 min-h-[40px]"
              >
                Save &amp; Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
