import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Play,
  RotateCcw,
  Shuffle,
} from 'lucide-react';
import { validateQuiz } from '../domain/quiz';
import { DEFAULT_SESSION_SETTINGS } from '../domain/session';
import {
  LayoutDensity,
  PresentationTheme,
  Quiz,
  RevealPolicy,
  SessionSettings,
} from '../domain/types';
import { FONT_BOUNDS } from '../domain/typography';

interface PresentationSetupViewProps {
  quiz: Quiz;
  initialSettings?: SessionSettings;
  initialPolicy?: RevealPolicy;
  onStartPresentation: (policy: RevealPolicy, settings: SessionSettings) => void;
  onEditQuiz: () => void;
  onBack: () => void;
}

export const PresentationSetupView: React.FC<PresentationSetupViewProps> = ({
  quiz,
  initialSettings,
  initialPolicy = 'manual',
  onStartPresentation,
  onEditQuiz,
  onBack,
}) => {
  const [revealPolicy, setRevealPolicy] = useState<RevealPolicy>(initialPolicy);
  const [settings, setSettings] = useState<SessionSettings>(
    initialSettings || DEFAULT_SESSION_SETTINGS,
  );

  const validation = useMemo(() => validateQuiz(quiz), [quiz]);
  const sectionsCount = useMemo(
    () => new Set(quiz.questions.map((q) => (q.section || '').trim()).filter(Boolean)).size,
    [quiz.questions],
  );

  const updateSettings = <K extends keyof SessionSettings>(
    key: K,
    value: SessionSettings[K],
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const generateRandomSeed = () => {
    const token = `CLS-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    updateSettings('seed', token);
  };

  const previewQuestion = quiz.questions[0];

  const previewThemeClasses: Record<
    PresentationTheme,
    { bg: string; card: string; text: string; muted: string; border: string }
  > = {
    dark: {
      bg: 'bg-[#0B1120]',
      card: 'bg-[#131C31]',
      text: 'text-slate-50',
      muted: 'text-slate-400',
      border: 'border-slate-700/80',
    },
    light: {
      bg: 'bg-white',
      card: 'bg-slate-50',
      text: 'text-slate-950',
      muted: 'text-slate-600',
      border: 'border-slate-300',
    },
    high_contrast: {
      bg: 'bg-black',
      card: 'bg-black',
      text: 'text-white',
      muted: 'text-yellow-300',
      border: 'border-white',
    },
  };

  const themeStyle = previewThemeClasses[settings.theme];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Back to Library</span>
          </button>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            Presentation Setup
          </h1>
          <p className="mt-1 text-sm text-slate-600 tabular-nums">
            {quiz.title} <span aria-hidden="true">·</span> {quiz.questions.length} questions
            {sectionsCount > 0 && (
              <>
                {' '}
                <span aria-hidden="true">·</span> {sectionsCount} sections
              </>
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={onEditQuiz}
          className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 min-h-[40px] shrink-0"
        >
          Edit Questions
        </button>
      </div>

      {!validation.valid && (
        <div
          role="alert"
          className="mb-6 flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900"
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" aria-hidden="true" />
            <div>
              <p className="font-semibold">
                Fix {validation.errors.length} validation{' '}
                {validation.errors.length === 1 ? 'error' : 'errors'} before presenting
              </p>
              <p className="mt-0.5 text-red-800">{validation.errors[0]?.message}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onEditQuiz}
            className="rounded-lg bg-red-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-red-800 shrink-0"
          >
            Fix in Editor
          </button>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] items-start">
        {/* Left Grouped Configuration Panels */}
        <div className="space-y-6">
          {/* Group 1: Order & Randomization */}
          <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-950">Order &amp; Randomization</h2>
              <p className="mt-0.5 text-xs text-slate-600">
                Correct answers stay bound to stable option IDs. Order locks once the session
                starts so resume and answer review match what students saw.
              </p>
            </div>

            <div className="space-y-3 pt-1">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.randomize_questions}
                  onChange={(e) => updateSettings('randomize_questions', e.target.checked)}
                  className="mt-1 h-4 w-4 accent-blue-700"
                />
                <div>
                  <span className="block text-sm font-medium text-slate-900">
                    Randomize question order
                  </span>
                  <span className="block text-xs text-slate-500">
                    Present questions in a freshly shuffled sequence without changing your saved
                    quiz.
                  </span>
                </div>
              </label>

              {settings.randomize_questions && sectionsCount > 1 && (
                <label className="ml-7 flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.randomize_within_sections}
                    onChange={(e) =>
                      updateSettings('randomize_within_sections', e.target.checked)
                    }
                    className="mt-1 h-4 w-4 accent-blue-700"
                  />
                  <div>
                    <span className="block text-sm font-medium text-slate-900">
                      Keep sections grouped (shuffle within each section)
                    </span>
                    <span className="block text-xs text-slate-500">
                      Preserves topic order while shuffling questions inside each section.
                    </span>
                  </div>
                </label>
              )}

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.randomize_choices}
                  onChange={(e) => updateSettings('randomize_choices', e.target.checked)}
                  className="mt-1 h-4 w-4 accent-blue-700"
                />
                <div>
                  <span className="block text-sm font-medium text-slate-900">
                    Randomize answer choices
                  </span>
                  <span className="block text-xs text-slate-500">
                    Shuffles choice order per question and recomputes visible labels (A, B, C, D)
                    while preserving exact answer correctness.
                  </span>
                </div>
              </label>

              {(settings.randomize_questions || settings.randomize_choices) && (
                <div className="pt-2">
                  <label
                    htmlFor="random-seed-input"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Optional reproducible seed (leave blank for a fresh random shuffle)
                  </label>
                  <div className="flex items-center gap-2 max-w-sm">
                    <input
                      id="random-seed-input"
                      type="text"
                      value={settings.seed}
                      onChange={(e) => updateSettings('seed', e.target.value)}
                      placeholder="e.g., PERIOD-2-MON"
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 focus:border-blue-600 focus:outline-none min-h-[40px]"
                    />
                    <button
                      type="button"
                      onClick={generateRandomSeed}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 min-h-[40px] whitespace-nowrap"
                    >
                      <Shuffle className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Generate</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Group 2: Answer Reveal Policy */}
          <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-950">Answer Reveal Policy</h2>
              <p className="mt-0.5 text-xs text-slate-600">
                Choose when students are allowed to see the correct answer. Answers are never
                revealed accidentally on slide advance.
              </p>
            </div>

            <div className="space-y-2.5" role="radiogroup" aria-label="Answer reveal policy">
              {(
                [
                  {
                    id: 'manual',
                    title: 'Manual reveal',
                    desc: 'Answers stay hidden until you explicitly press Reveal (R). Advancing never reveals automatically.',
                  },
                  {
                    id: 'after_each',
                    title: 'Reveal after each question',
                    desc: 'Display each question hidden, press Reveal (R) once students answer, then advance to the next question.',
                  },
                  {
                    id: 'after_entire_quiz',
                    title: 'Reveal after entire quiz',
                    desc: 'Answers remain locked and hidden throughout the entire presentation, then unlock in post-presentation Answer Review.',
                  },
                ] as const
              ).map((opt) => {
                const selected = revealPolicy === opt.id;
                return (
                  <label
                    key={opt.id}
                    className={`flex items-start gap-3 rounded-lg border p-3.5 cursor-pointer transition-colors ${
                      selected
                        ? 'border-blue-600 bg-blue-50/50'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reveal-policy"
                      checked={selected}
                      onChange={() => setRevealPolicy(opt.id)}
                      className="mt-1 h-4 w-4 accent-blue-700"
                    />
                    <div>
                      <span className="block text-sm font-semibold text-slate-950">
                        {opt.title}
                      </span>
                      <span className="block text-xs text-slate-600 mt-0.5">{opt.desc}</span>
                    </div>
                  </label>
                );
              })}
            </div>

            {revealPolicy !== 'after_entire_quiz' && (
              <label className="flex items-center gap-2.5 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.allow_hide_after_reveal}
                  onChange={(e) => updateSettings('allow_hide_after_reveal', e.target.checked)}
                  className="h-4 w-4 accent-blue-700"
                />
                <span className="text-sm text-slate-700">
                  Allow hiding an answer again after revealing it (H key)
                </span>
              </label>
            )}
          </section>

          {/* Group 3: Typography, Theme & Density */}
          <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-950">
                  Adaptive Typography &amp; Projector Display
                </h2>
                <p className="mt-0.5 text-xs text-slate-600">
                  Question and answer choice font sizes are controlled independently. You can also
                  adjust them live during class.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  updateSettings('question_font_preference', FONT_BOUNDS.question.default);
                  updateSettings('choice_font_preference', FONT_BOUNDS.choice.default);
                  updateSettings('auto_fit', true);
                  updateSettings('layout_density', 'balanced');
                }}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 shrink-0"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Reset defaults</span>
              </button>
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.auto_fit}
                onChange={(e) => updateSettings('auto_fit', e.target.checked)}
                className="mt-1 h-4 w-4 accent-blue-700"
              />
              <div>
                <span className="block text-sm font-medium text-slate-900">
                  Auto-fit long content automatically (recommended)
                </span>
                <span className="block text-xs text-slate-500">
                  Uses your preferred font sizes below, gently scaling down only when a long prompt
                  or choice would otherwise overflow the projector viewport.
                </span>
              </div>
            </label>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="setup-question-font"
                    className="text-xs font-semibold text-slate-700"
                  >
                    Question preferred size
                  </label>
                  <span className="font-mono text-xs font-semibold text-slate-900 tabular-nums">
                    {settings.question_font_preference}px
                  </span>
                </div>
                <input
                  id="setup-question-font"
                  type="range"
                  min={FONT_BOUNDS.question.min}
                  max={FONT_BOUNDS.question.max}
                  step={FONT_BOUNDS.question.step}
                  value={settings.question_font_preference}
                  onChange={(e) =>
                    updateSettings('question_font_preference', Number(e.target.value))
                  }
                  className="w-full accent-blue-700"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="setup-choice-font"
                    className="text-xs font-semibold text-slate-700"
                  >
                    Choice preferred size
                  </label>
                  <span className="font-mono text-xs font-semibold text-slate-900 tabular-nums">
                    {settings.choice_font_preference}px
                  </span>
                </div>
                <input
                  id="setup-choice-font"
                  type="range"
                  min={FONT_BOUNDS.choice.min}
                  max={FONT_BOUNDS.choice.max}
                  step={FONT_BOUNDS.choice.step}
                  value={settings.choice_font_preference}
                  onChange={(e) =>
                    updateSettings('choice_font_preference', Number(e.target.value))
                  }
                  className="w-full accent-blue-700"
                />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <span className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Slide Theme
                </span>
                <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1">
                  {(
                    [
                      { id: 'dark', label: 'Dark Slate' },
                      { id: 'light', label: 'Daylight' },
                      { id: 'high_contrast', label: 'High Contrast' },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => updateSettings('theme', t.id)}
                      className={`rounded-md px-2 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                        settings.theme === t.id
                          ? 'bg-white text-slate-950 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Layout Density
                </span>
                <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1">
                  {(['compact', 'balanced', 'spacious'] as LayoutDensity[]).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => updateSettings('layout_density', d)}
                      className={`rounded-md px-2 py-2 text-xs font-medium capitalize transition-colors whitespace-nowrap ${
                        settings.layout_density === d
                          ? 'bg-white text-slate-950 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Group 4: Timer & Progress Visibility */}
          <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-950">Timer &amp; Slide Indicators</h2>

            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.timer_enabled}
                  onChange={(e) => updateSettings('timer_enabled', e.target.checked)}
                  className="mt-1 h-4 w-4 accent-blue-700"
                />
                <div>
                  <span className="block text-sm font-medium text-slate-900">
                    Enable optional per-question countdown timer
                  </span>
                  <span className="block text-xs text-slate-500">
                    Notifies you when time reaches zero. Timer expiration never reveals answers.
                  </span>
                </div>
              </label>

              {settings.timer_enabled && (
                <div className="ml-7 flex flex-wrap items-center gap-4 pt-1">
                  <div className="flex items-center gap-2">
                    <label htmlFor="timer-seconds-input" className="text-xs font-medium text-slate-700">
                      Seconds per question:
                    </label>
                    <input
                      id="timer-seconds-input"
                      type="number"
                      min={5}
                      max={600}
                      value={settings.timer_seconds}
                      onChange={(e) =>
                        updateSettings(
                          'timer_seconds',
                          Math.max(5, Math.min(600, Number(e.target.value) || 30)),
                        )
                      }
                      className="w-20 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm font-mono tabular-nums"
                    />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.timer_auto_advance}
                      onChange={(e) => updateSettings('timer_auto_advance', e.target.checked)}
                      className="h-4 w-4 accent-blue-700"
                    />
                    <span className="text-xs text-slate-700">
                      Auto-advance at 0 (off by default)
                    </span>
                  </label>
                </div>
              )}

              <div className="grid gap-2.5 pt-2 sm:grid-cols-2">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.show_question_number}
                    onChange={(e) => updateSettings('show_question_number', e.target.checked)}
                    className="h-4 w-4 accent-blue-700"
                  />
                  <span className="text-sm text-slate-700">Show question number</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.show_progress}
                    onChange={(e) => updateSettings('show_progress', e.target.checked)}
                    className="h-4 w-4 accent-blue-700"
                  />
                  <span className="text-sm text-slate-700">Show progress bar &amp; count</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={settings.show_original_number}
                    onChange={(e) => updateSettings('show_original_number', e.target.checked)}
                    className="h-4 w-4 accent-blue-700"
                  />
                  <span className="text-sm text-slate-700">
                    Also display original question # when shuffled
                  </span>
                </label>
              </div>
            </div>
          </section>
        </div>

        {/* Right Sticky Preview & Launch Summary */}
        <aside className="lg:sticky lg:top-24 space-y-5">
          {/* Scaled Slide Preview */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold text-slate-600 mb-3">
              Student Display Preview (16:9)
            </p>
            <div
              className={`aspect-video w-full rounded-lg border p-4 flex flex-col justify-between overflow-hidden ${themeStyle.bg} ${themeStyle.border}`}
            >
              <div className="flex items-center justify-between text-[10px]">
                <span className={`font-medium truncate max-w-[65%] ${themeStyle.muted}`}>
                  {quiz.title}
                </span>
                {settings.show_progress && (
                  <span className={`font-mono tabular-nums ${themeStyle.muted}`}>
                    1 / {quiz.questions.length}
                  </span>
                )}
              </div>

              <div className="my-2">
                <p
                  className={`font-semibold leading-snug line-clamp-2 ${themeStyle.text}`}
                  style={{
                    fontSize: `${Math.max(11, Math.round(settings.question_font_preference * 0.27))}px`,
                  }}
                >
                  {settings.show_question_number ? 'Q1. ' : ''}
                  {previewQuestion?.text || 'Sample question preview'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {(previewQuestion?.options || []).slice(0, 4).map((opt, idx) => (
                  <div
                    key={opt.id}
                    className={`rounded border px-2 py-1 truncate text-[10px] ${themeStyle.card} ${themeStyle.border} ${themeStyle.text}`}
                  >
                    <span className={`font-mono font-bold mr-1 ${themeStyle.muted}`}>
                      {String.fromCharCode(65 + idx)}.
                    </span>
                    {opt.text || 'Choice'}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Configuration Summary & Primary Launch CTA */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-950">Session Summary</h2>
            <dl className="space-y-2 text-xs">
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Question order</dt>
                <dd className="font-medium text-slate-900">
                  {settings.randomize_questions
                    ? settings.randomize_within_sections
                      ? 'Shuffled within sections'
                      : 'Randomized'
                    : 'Original order'}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Answer choices</dt>
                <dd className="font-medium text-slate-900">
                  {settings.randomize_choices ? 'Randomized' : 'Original order'}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Reveal policy</dt>
                <dd className="font-medium text-slate-900">
                  {revealPolicy === 'manual'
                    ? 'Manual'
                    : revealPolicy === 'after_each'
                      ? 'After each question'
                      : 'After entire quiz'}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Typography</dt>
                <dd className="font-medium text-slate-900 tabular-nums">
                  {settings.auto_fit ? 'Auto-fit ON' : 'Manual'} · Q{settings.question_font_preference}px / C
                  {settings.choice_font_preference}px
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Timer</dt>
                <dd className="font-medium text-slate-900 tabular-nums">
                  {settings.timer_enabled ? `${settings.timer_seconds}s per question` : 'Off'}
                </dd>
              </div>
            </dl>

            <button
              type="button"
              disabled={!validation.valid}
              onClick={() => onStartPresentation(revealPolicy, settings)}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50 transition-colors min-h-[48px]"
            >
              <Play className="h-4 w-4" aria-hidden="true" />
              <span>Start Presentation</span>
            </button>
          </div>
        </aside>
      </div>
    </main>
  );
};
