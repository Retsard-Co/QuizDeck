import React, { useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  FileCode2,
  FileUp,
  Table,
} from 'lucide-react';
import { validateQuiz } from '../domain/quiz';
import { ImportReport, Quiz } from '../domain/types';
import {
  generateCsvTemplate,
  generateDocxTemplate,
  generateJsonTemplate,
  generateXlsxTemplate,
  importQuizFile,
  parseCsvQuiz,
  parseJsonQuiz,
  SPREADSHEET_HEADERS,
} from '../importers';
import { downloadBinaryFile, downloadTextFile } from '../lib/download';

interface TemplatesAndImportViewProps {
  initialTab: 'import' | 'templates';
  onConfirmImport: (quiz: Quiz, openInEditor: boolean) => Promise<void>;
  onCancel: () => void;
}

export const TemplatesAndImportView: React.FC<TemplatesAndImportViewProps> = ({
  initialTab,
  onConfirmImport,
  onCancel,
}) => {
  const [activeTab, setActiveTab] = useState<'import' | 'templates'>(initialTab);
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [draftQuiz, setDraftQuiz] = useState<Quiz | null>(null);
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteFormat, setPasteFormat] = useState<'csv' | 'json'>('csv');
  const [pasteContent, setPasteContent] = useState('');
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync tab when top nav switches between Import and Templates
  React.useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const draftValidation = useMemo(() => {
    if (!draftQuiz) return null;
    const base = validateQuiz(draftQuiz);
    if (!report) return base;

    const rowByQuestionIndex = new Map<number, number>();
    for (const issue of [...report.errors, ...report.warnings]) {
      if (issue.questionIndex !== undefined && issue.rowNumber !== undefined) {
        rowByQuestionIndex.set(issue.questionIndex, issue.rowNumber);
      }
    }

    const withRowPrefix = (issue: (typeof base.issues)[number]) => {
      if (
        issue.questionIndex !== undefined &&
        rowByQuestionIndex.has(issue.questionIndex) &&
        !issue.message.startsWith('Row ')
      ) {
        const rowNum = rowByQuestionIndex.get(issue.questionIndex)!;
        return {
          ...issue,
          rowNumber: rowNum,
          message: `Row ${rowNum}: ${issue.message}`,
        };
      }
      return issue;
    };

    const errors = base.errors.map(withRowPrefix);
    const warnings = base.warnings.map(withRowPrefix);
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      issues: [...errors, ...warnings],
    };
  }, [draftQuiz, report]);

  const handleFileSelected = async (file: File) => {
    setIsParsing(true);
    try {
      const result = await importQuizFile(file);
      setReport(result);
      setDraftQuiz(result.quiz ? structuredClone(result.quiz) : null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void handleFileSelected(file);
    }
  };

  const handleParsePasted = () => {
    const fileName = pasteFormat === 'csv' ? 'pasted-quiz.csv' : 'pasted-quiz.json';
    const result =
      pasteFormat === 'csv'
        ? parseCsvQuiz(pasteContent, fileName)
        : parseJsonQuiz(pasteContent, fileName);
    setReport(result);
    setDraftQuiz(result.quiz ? structuredClone(result.quiz) : null);
  };

  const handleDownloadXlsx = () => {
    const bytes = generateXlsxTemplate();
    downloadBinaryFile(
      bytes,
      'quizdeck-template.xlsx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    setDownloadNotice('Downloaded quizdeck-template.xlsx (Excel / Google Sheets).');
  };

  const handleDownloadDocx = async () => {
    const bytes = await generateDocxTemplate();
    downloadBinaryFile(
      bytes,
      'quizdeck-template.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    setDownloadNotice('Downloaded quizdeck-template.docx (Microsoft Word / LibreOffice).');
  };

  const handleDownloadCsv = () => {
    const csv = generateCsvTemplate();
    downloadTextFile(csv, 'quizdeck-template.csv', 'text/csv;charset=utf-8');
    setDownloadNotice('Downloaded quizdeck-template.csv.');
  };

  const handleDownloadJson = () => {
    const json = generateJsonTemplate();
    downloadTextFile(json, 'quizdeck-template.json', 'application/json');
    setDownloadNotice('Downloaded quizdeck-template.json (Canonical QuizDeck format).');
  };

  const updateDraftQuestion = (
    qIdx: number,
    updater: (q: Quiz['questions'][number]) => Quiz['questions'][number],
  ) => {
    setDraftQuiz((prev) => {
      if (!prev) return prev;
      const nextQuestions = [...prev.questions];
      nextQuestions[qIdx] = updater(nextQuestions[qIdx]);
      return { ...prev, questions: nextQuestions };
    });
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            {activeTab === 'templates' ? 'Quiz Templates' : 'Import & Validate Quiz'}
          </h1>
          <p className="mt-1.5 text-sm text-slate-600">
            {activeTab === 'templates'
              ? 'Download a blank structured template with sample questions, fill it offline, then upload to QuizDeck.'
              : 'Upload a filled XLSX, DOCX, CSV, or JSON quiz file. Imports are validated and previewed before saving.'}
          </p>
        </div>

        {/* Segmented Mode Control */}
        <div
          role="tablist"
          aria-label="Import and template views"
          className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1 shrink-0"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'import'}
            onClick={() => setActiveTab('import')}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap min-h-[38px] ${
              activeTab === 'import'
                ? 'bg-white text-slate-950 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Import File
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'templates'}
            onClick={() => setActiveTab('templates')}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap min-h-[38px] ${
              activeTab === 'templates'
                ? 'bg-white text-slate-950 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Download Templates
          </button>
        </div>
      </div>

      {activeTab === 'templates' ? (
        <div className="space-y-8">
          {downloadNotice && (
            <div
              role="status"
              className="flex items-center gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
              <span>{downloadNotice}</span>
            </div>
          )}

          <div className="grid gap-5 md:grid-cols-2">
            {/* XLSX Card */}
            <article className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <FileSpreadsheet className="h-5 w-5 text-blue-700" aria-hidden="true" />
                    <h2 className="text-base font-bold text-slate-950">Excel Spreadsheet (.xlsx)</h2>
                  </div>
                  <span className="text-xs font-medium text-blue-700">Recommended</span>
                </div>
                <p className="mt-2.5 text-sm text-slate-600 leading-relaxed">
                  Includes a <code className="font-mono text-xs text-slate-800">Questions</code>{' '}
                  worksheet with exact headers and sample rows, plus an{' '}
                  <code className="font-mono text-xs text-slate-800">Instructions</code> sheet.
                  Works in Microsoft Excel, Google Sheets, and LibreOffice Calc.
                </p>
              </div>
              <div className="mt-5">
                <button
                  type="button"
                  onClick={handleDownloadXlsx}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition-colors min-h-[44px]"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  <span>Download .xlsx Template</span>
                </button>
              </div>
            </article>

            {/* DOCX Card */}
            <article className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <FileText className="h-5 w-5 text-blue-700" aria-hidden="true" />
                    <h2 className="text-base font-bold text-slate-950">Word Document (.docx)</h2>
                  </div>
                  <span className="text-xs text-slate-500">Structured text</span>
                </div>
                <p className="mt-2.5 text-sm text-slate-600 leading-relaxed">
                  Uses numbered questions (<code className="font-mono text-xs">1.</code>), explicit
                  choice labels (<code className="font-mono text-xs">(A)</code>–
                  <code className="font-mono text-xs">(D)</code>), and an explicit{' '}
                  <code className="font-mono text-xs">Answer: A</code> line rather than fragile
                  highlighting or bold text.
                </p>
              </div>
              <div className="mt-5">
                <button
                  type="button"
                  onClick={handleDownloadDocx}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-50 transition-colors min-h-[44px]"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  <span>Download .docx Template</span>
                </button>
              </div>
            </article>

            {/* CSV Card */}
            <article className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <Table className="h-5 w-5 text-slate-700" aria-hidden="true" />
                    <h2 className="text-base font-bold text-slate-950">CSV Table (.csv)</h2>
                  </div>
                  <span className="text-xs text-slate-500">UTF-8 RFC-4180</span>
                </div>
                <p className="mt-2.5 text-sm text-slate-600 leading-relaxed">
                  Lightweight plain-text table supporting quoted commas, quotes, and multi-line
                  prompts. Ideal for quick editing or exporting from spreadsheet tools.
                </p>
              </div>
              <div className="mt-5">
                <button
                  type="button"
                  onClick={handleDownloadCsv}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-50 transition-colors min-h-[44px]"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  <span>Download .csv Template</span>
                </button>
              </div>
            </article>

            {/* JSON Card */}
            <article className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <FileCode2 className="h-5 w-5 text-slate-700" aria-hidden="true" />
                    <h2 className="text-base font-bold text-slate-950">Canonical JSON (.json)</h2>
                  </div>
                  <span className="text-xs text-slate-500">Lossless interchange</span>
                </div>
                <p className="mt-2.5 text-sm text-slate-600 leading-relaxed">
                  QuizDeck’s native schema preserving stable question IDs, option IDs,
                  <code className="font-mono text-xs"> correct_option_ids</code>, sections, and
                  metadata without conversion loss.
                </p>
              </div>
              <div className="mt-5">
                <button
                  type="button"
                  onClick={handleDownloadJson}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-50 transition-colors min-h-[44px]"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  <span>Download .json Template</span>
                </button>
              </div>
            </article>
          </div>

          {/* Template Rules Reference */}
          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-base font-bold text-slate-950">Template Format Guidelines</h2>
            <p className="mt-1.5 text-sm text-slate-600">
              Important: <strong className="font-semibold text-slate-900">correct_answer</strong>{' '}
              always refers to the original option label (A, B, C, or D) in your template—never the
              shuffled letter shown during class. QuizDeck maps answers by stable option IDs so
              randomization never corrupts the answer key.
            </p>
            <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-medium text-slate-500 mb-1.5">
                Spreadsheet / CSV column headers:
              </p>
              <code className="font-mono text-xs text-slate-800 whitespace-nowrap">
                {SPREADSHEET_HEADERS.join(', ')}
              </code>
            </div>
            <div className="mt-5">
              <button
                type="button"
                onClick={() => setActiveTab('import')}
                className="text-sm font-semibold text-blue-700 hover:text-blue-900 underline"
              >
                Already filled a template? Go to Import File →
              </button>
            </div>
          </section>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Upload / Paste Area */}
          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors ${
                isDragging
                  ? 'border-blue-600 bg-blue-50/50'
                  : 'border-slate-300 bg-slate-50/50 hover:border-slate-400'
              }`}
            >
              <FileUp className="h-8 w-8 text-slate-500" aria-hidden="true" />
              <h2 className="mt-3 text-base font-semibold text-slate-950">
                Upload a quiz file (.xlsx, .docx, .csv, or .json)
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Files are parsed locally in your browser (max 5 MB). Failed imports never overwrite
                your existing quiz library.
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  disabled={isParsing}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 transition-colors min-h-[44px]"
                >
                  <span>{isParsing ? 'Parsing file...' : 'Choose Quiz File'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPasteMode((v) => !v)}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors min-h-[44px]"
                >
                  <span>{pasteMode ? 'Hide Paste Box' : 'Paste CSV / JSON Text'}</span>
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.csv,.xlsx,.docx"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (file) void handleFileSelected(file);
                }}
                className="hidden"
                aria-label="Choose quiz file to import"
              />
            </div>

            {pasteMode && (
              <div className="mt-6 border-t border-slate-200 pt-5">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <label htmlFor="paste-quiz-input" className="text-sm font-semibold text-slate-900">
                    Paste raw CSV or JSON content
                  </label>
                  <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                    <button
                      type="button"
                      onClick={() => setPasteFormat('csv')}
                      className={`rounded px-3 py-1 text-xs font-medium ${
                        pasteFormat === 'csv'
                          ? 'bg-white text-slate-950 shadow-sm'
                          : 'text-slate-600'
                      }`}
                    >
                      CSV
                    </button>
                    <button
                      type="button"
                      onClick={() => setPasteFormat('json')}
                      className={`rounded px-3 py-1 text-xs font-medium ${
                        pasteFormat === 'json'
                          ? 'bg-white text-slate-950 shadow-sm'
                          : 'text-slate-600'
                      }`}
                    >
                      JSON
                    </button>
                  </div>
                </div>
                <textarea
                  id="paste-quiz-input"
                  rows={6}
                  value={pasteContent}
                  onChange={(e) => setPasteContent(e.target.value)}
                  placeholder={
                    pasteFormat === 'csv'
                      ? 'question_id,question,option_a,option_b,option_c,option_d,correct_answer,explanation,section,question_type,points\nq1,What is 2+2?,3,4,5,6,B,Simple addition,Math,multiple_choice,1'
                      : '{ "schema_version": "1.0", "quiz": { "title": "...", "questions": [...] } }'
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white p-3 font-mono text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                />
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={handleParsePasted}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 min-h-[40px]"
                  >
                    Parse &amp; Validate Text
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Import Validation Report & Editable Preview */}
          {report && (
            <section
              aria-label="Import validation report"
              className="rounded-xl border border-slate-200 bg-white p-6 space-y-6"
            >
              <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">
                    Import Report: {report.fileName}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600 tabular-nums">
                    Format: {report.detectedFormat.toUpperCase()} <span aria-hidden="true">·</span>{' '}
                    {report.recognizedCount} recognized <span aria-hidden="true">·</span>{' '}
                    {draftValidation
                      ? `${draftQuiz!.questions.length - new Set(draftValidation.errors.map((e) => e.questionIndex).filter((x) => x !== undefined)).size} valid`
                      : `${report.validCount} valid`}
                    {report.skippedCount > 0 && (
                      <>
                        {' '}
                        <span aria-hidden="true">·</span> {report.skippedCount} blank rows skipped
                      </>
                    )}
                  </p>
                </div>

                {draftQuiz && (
                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onConfirmImport(draftQuiz, true)}
                      className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 min-h-[40px]"
                    >
                      Open in Full Editor
                    </button>
                    <button
                      type="button"
                      disabled={!draftValidation?.valid}
                      onClick={() => onConfirmImport(draftQuiz, false)}
                      className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50 min-h-[40px]"
                    >
                      Confirm &amp; Save Quiz
                    </button>
                  </div>
                )}
              </div>

              {/* Errors list */}
              {((draftValidation && draftValidation.errors.length > 0) ||
                (!draftQuiz && report.errors.length > 0)) && (
                <div
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-2.5"
                >
                  <div className="flex items-center gap-2 text-sm font-semibold text-red-900">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-700" aria-hidden="true" />
                    <span>
                      {(draftValidation ? draftValidation.errors : report.errors).length} blocking{' '}
                      {(draftValidation ? draftValidation.errors : report.errors).length === 1
                        ? 'error'
                        : 'errors'}{' '}
                      detected
                    </span>
                  </div>
                  <ul className="space-y-1.5 text-sm text-red-950 list-disc pl-5">
                    {(draftValidation ? draftValidation.errors : report.errors).map((err, idx) => (
                      <li key={`${err.code}-${idx}`}>
                        <span className="font-medium">{err.message}</span>{' '}
                        <span className="text-red-800">— {err.suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Warnings list */}
              {((draftValidation && draftValidation.warnings.length > 0) ||
                (!draftQuiz && report.warnings.length > 0)) && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
                    <span>
                      {(draftValidation ? draftValidation.warnings : report.warnings).length}{' '}
                      advisory{' '}
                      {(draftValidation ? draftValidation.warnings : report.warnings).length === 1
                        ? 'warning'
                        : 'warnings'}
                    </span>
                  </div>
                  <ul className="space-y-1 text-xs text-amber-950 list-disc pl-5">
                    {(draftValidation ? draftValidation.warnings : report.warnings)
                      .slice(0, 8)
                      .map((warn, idx) => (
                        <li key={`${warn.code}-${idx}`}>
                          {warn.message} — {warn.suggestion}
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              {/* Inline Editable Preview */}
              {draftQuiz && (
                <div className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="import-quiz-title"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        Quiz Title
                      </label>
                      <input
                        id="import-quiz-title"
                        type="text"
                        value={draftQuiz.title}
                        onChange={(e) =>
                          setDraftQuiz({ ...draftQuiz, title: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none min-h-[40px]"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="import-quiz-instructions"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        Instructions (optional)
                      </label>
                      <input
                        id="import-quiz-instructions"
                        type="text"
                        value={draftQuiz.instructions}
                        onChange={(e) =>
                          setDraftQuiz({ ...draftQuiz, instructions: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none min-h-[40px]"
                      />
                    </div>
                  </div>

                  <div className="divide-y divide-slate-200 rounded-lg border border-slate-200">
                    {draftQuiz.questions.map((q, qIdx) => {
                      const qErrors =
                        draftValidation?.errors.filter((e) => e.questionIndex === qIdx) || [];
                      return (
                        <div key={`${q.id}-${qIdx}`} className="p-4 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-slate-600 tabular-nums">
                              Question {qIdx + 1} · ID: <code className="font-mono">{q.id}</code>
                              {q.section ? ` · ${q.section}` : ''}
                            </span>
                            {qErrors.length === 0 ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                                <span>Valid</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700">
                                <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                                <span>{qErrors[0].message}</span>
                              </span>
                            )}
                          </div>

                          <div>
                            <label
                              htmlFor={`preview-q-${qIdx}`}
                              className="sr-only"
                            >
                              Question {qIdx + 1} text
                            </label>
                            <textarea
                              id={`preview-q-${qIdx}`}
                              rows={2}
                              value={q.text}
                              onChange={(e) =>
                                updateDraftQuestion(qIdx, (curr) => ({
                                  ...curr,
                                  text: e.target.value,
                                }))
                              }
                              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-950 focus:border-blue-600 focus:outline-none"
                            />
                          </div>

                          <div className="grid gap-2 sm:grid-cols-2">
                            {q.options.map((opt, optIdx) => {
                              const isCorrect = q.correct_option_ids.includes(opt.id);
                              return (
                                <div
                                  key={opt.id}
                                  className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 ${
                                    isCorrect
                                      ? 'border-emerald-400 bg-emerald-50/70'
                                      : 'border-slate-200 bg-slate-50/50'
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name={`import-correct-${qIdx}`}
                                    checked={isCorrect}
                                    onChange={() =>
                                      updateDraftQuestion(qIdx, (curr) => ({
                                        ...curr,
                                        correct_option_ids: [opt.id],
                                      }))
                                    }
                                    aria-label={`Mark option ${opt.id.toUpperCase()} correct for question ${qIdx + 1}`}
                                    className="h-4 w-4 accent-emerald-700"
                                  />
                                  <span className="font-mono text-xs font-bold text-slate-600 uppercase w-4">
                                    {opt.id}
                                  </span>
                                  <input
                                    type="text"
                                    value={opt.text}
                                    aria-label={`Question ${qIdx + 1} option ${opt.id.toUpperCase()} text`}
                                    onChange={(e) =>
                                      updateDraftQuestion(qIdx, (curr) => {
                                        const opts = [...curr.options];
                                        opts[optIdx] = { ...opts[optIdx], text: e.target.value };
                                        return { ...curr, options: opts };
                                      })
                                    }
                                    className="flex-1 bg-transparent text-sm text-slate-900 focus:outline-none"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setReport(null);
                    setDraftQuiz(null);
                  }}
                  className="text-sm font-medium text-slate-600 hover:text-slate-900"
                >
                  Clear preview
                </button>
              </div>
            </section>
          )}

          <div className="flex justify-start">
            <button
              type="button"
              onClick={onCancel}
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              ← Back to Quiz Library
            </button>
          </div>
        </div>
      )}
    </main>
  );
};
