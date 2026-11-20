import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { StudentSlideView } from '../domain/session';
import { LayoutDensity, PresentationTheme, SessionSettings } from '../domain/types';
import { computeAutoFitStep, shouldStackChoices } from '../domain/typography';

export interface SlideOverflowStatus {
  isOverflowing: boolean;
  needsScrollFallback: boolean;
  reachedMinimumFloor: boolean;
  effectiveQuestionPx: number;
  effectiveChoicePx: number;
  effectiveDensity: LayoutDensity;
}

interface StudentSlideProps {
  quizTitle: string;
  slide: StudentSlideView;
  settings: SessionSettings;
  timerRemainingSeconds: number | null;
  timerExpired: boolean;
  onOverflowChange?: (status: SlideOverflowStatus) => void;
}

interface ThemeTokens {
  canvas: string;
  headerBorder: string;
  titleText: string;
  mutedText: string;
  progressTrack: string;
  progressFill: string;
  questionText: string;
  optionBg: string;
  optionBorder: string;
  optionText: string;
  optionBadgeBg: string;
  optionBadgeText: string;
  correctBg: string;
  correctBorder: string;
  correctText: string;
  correctBadgeBg: string;
  correctBadgeText: string;
  dimmedOption: string;
  explanationBg: string;
  explanationBorder: string;
  explanationText: string;
  timerBg: string;
  timerExpiredBg: string;
}

const THEME_TOKENS: Record<PresentationTheme, ThemeTokens> = {
  dark: {
    canvas: 'bg-[#0B1120] text-slate-50',
    headerBorder: 'border-slate-800/90',
    titleText: 'text-slate-200',
    mutedText: 'text-slate-400',
    progressTrack: 'bg-slate-800',
    progressFill: 'bg-blue-500',
    questionText: 'text-slate-50 tracking-[0.01em]',
    optionBg: 'bg-[#131C31]',
    optionBorder: 'border-slate-700/90',
    optionText: 'text-slate-100 tracking-[0.01em]',
    optionBadgeBg: 'bg-slate-800 border-slate-600',
    optionBadgeText: 'text-slate-200',
    correctBg: 'bg-emerald-950/90',
    correctBorder: 'border-emerald-400 border-2',
    correctText: 'text-white',
    correctBadgeBg: 'bg-emerald-500 border-emerald-300',
    correctBadgeText: 'text-slate-950',
    dimmedOption: 'opacity-50',
    explanationBg: 'bg-slate-900/90',
    explanationBorder: 'border-emerald-500/50',
    explanationText: 'text-slate-200',
    timerBg: 'bg-slate-800 text-slate-100 border-slate-700',
    timerExpiredBg: 'bg-amber-950 text-amber-200 border-amber-500',
  },
  light: {
    canvas: 'bg-white text-slate-950',
    headerBorder: 'border-slate-200',
    titleText: 'text-slate-800',
    mutedText: 'text-slate-600',
    progressTrack: 'bg-slate-200',
    progressFill: 'bg-blue-700',
    questionText: 'text-slate-950',
    optionBg: 'bg-slate-50',
    optionBorder: 'border-slate-300',
    optionText: 'text-slate-950',
    optionBadgeBg: 'bg-white border-slate-300',
    optionBadgeText: 'text-slate-800',
    correctBg: 'bg-emerald-50',
    correctBorder: 'border-emerald-700 border-2',
    correctText: 'text-emerald-950',
    correctBadgeBg: 'bg-emerald-700 border-emerald-700',
    correctBadgeText: 'text-white',
    dimmedOption: 'opacity-55',
    explanationBg: 'bg-emerald-50/70',
    explanationBorder: 'border-emerald-300',
    explanationText: 'text-slate-900',
    timerBg: 'bg-slate-100 text-slate-900 border-slate-300',
    timerExpiredBg: 'bg-amber-100 text-amber-950 border-amber-500',
  },
  high_contrast: {
    canvas: 'bg-black text-white',
    headerBorder: 'border-white/40',
    titleText: 'text-white',
    mutedText: 'text-yellow-300',
    progressTrack: 'bg-neutral-800',
    progressFill: 'bg-yellow-400',
    questionText: 'text-white tracking-[0.015em]',
    optionBg: 'bg-black',
    optionBorder: 'border-white border-2',
    optionText: 'text-white tracking-[0.01em]',
    optionBadgeBg: 'bg-white border-white',
    optionBadgeText: 'text-black',
    correctBg: 'bg-yellow-400',
    correctBorder: 'border-white border-4',
    correctText: 'text-black',
    correctBadgeBg: 'bg-black border-black',
    correctBadgeText: 'text-yellow-300',
    dimmedOption: 'opacity-55',
    explanationBg: 'bg-neutral-950',
    explanationBorder: 'border-yellow-400 border-2',
    explanationText: 'text-yellow-200',
    timerBg: 'bg-black text-yellow-300 border-yellow-300 border-2',
    timerExpiredBg: 'bg-yellow-400 text-black border-white border-2',
  },
};

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const StudentSlide: React.FC<StudentSlideProps> = ({
  quizTitle,
  slide,
  settings,
  timerRemainingSeconds,
  timerExpired,
  onOverflowChange,
}) => {
  const tokens = THEME_TOKENS[settings.theme];
  const stageRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [containerWidth, setContainerWidth] = useState<number>(1280);
  const [measureNonce, setMeasureNonce] = useState<number>(0);

  const [fitState, setFitState] = useState<SlideOverflowStatus>({
    isOverflowing: false,
    needsScrollFallback: false,
    reachedMinimumFloor: false,
    effectiveQuestionPx: settings.question_font_preference,
    effectiveChoicePx: settings.choice_font_preference,
    effectiveDensity: settings.layout_density,
  });

  const iterationRef = useRef<number>(0);
  const resetKey = [
    slide.questionId,
    slide.isRevealed ? '1' : '0',
    settings.auto_fit ? '1' : '0',
    settings.question_font_preference,
    settings.choice_font_preference,
    settings.layout_density,
    measureNonce,
  ].join('|');

  // Observe viewport/container resizes and font loading
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    const updateSize = () => {
      setContainerWidth(el.clientWidth || 1280);
      setMeasureNonce((n) => n + 1);
    };
    updateSize();

    const observer = new ResizeObserver(() => {
      updateSize();
    });
    observer.observe(el);

    const onFs = () => updateSize();
    document.addEventListener('fullscreenchange', onFs);

    if (typeof document !== 'undefined' && 'fonts' in document) {
      document.fonts.ready.then(() => updateSize()).catch(() => {});
    }

    return () => {
      observer.disconnect();
      document.removeEventListener('fullscreenchange', onFs);
    };
  }, []);

  // Reset to teacher preferred sizes whenever slide, reveal state, or user settings change
  useLayoutEffect(() => {
    iterationRef.current = 0;
    setFitState({
      isOverflowing: false,
      needsScrollFallback: false,
      reachedMinimumFloor: false,
      effectiveQuestionPx: settings.question_font_preference,
      effectiveChoicePx: settings.choice_font_preference,
      effectiveDensity: settings.layout_density,
    });
  }, [resetKey]);

  // Measure actual rendered height vs available viewport height and run adaptive auto-fit loop
  useLayoutEffect(() => {
    const stage = stageRef.current;
    const content = contentRef.current;
    if (!stage || !content) return;

    const availableH = stage.clientHeight;
    const availableW = stage.clientWidth;
    if (availableH <= 0 || availableW <= 0) return;

    const neededH = content.scrollHeight;
    const neededW = content.scrollWidth;
    const heightRatio = neededH / availableH;
    const widthRatio = neededW / availableW;
    const overflowRatio = Math.max(heightRatio, widthRatio);

    const decision = computeAutoFitStep({
      preferredQuestionPx: settings.question_font_preference,
      preferredChoicePx: settings.choice_font_preference,
      autoFitEnabled: settings.auto_fit,
      density: fitState.effectiveDensity,
      overflowRatio,
      currentQuestionPx: fitState.effectiveQuestionPx,
      currentChoicePx: fitState.effectiveChoicePx,
    });

    const changed =
      decision.nextQuestionPx !== fitState.effectiveQuestionPx ||
      decision.nextChoicePx !== fitState.effectiveChoicePx ||
      decision.effectiveDensity !== fitState.effectiveDensity;

    if (changed && iterationRef.current < 16) {
      iterationRef.current += 1;
      setFitState({
        isOverflowing: decision.isOverflowing,
        needsScrollFallback: decision.needsScrollFallback,
        reachedMinimumFloor: decision.reachedMinimumFloor,
        effectiveQuestionPx: decision.nextQuestionPx,
        effectiveChoicePx: decision.nextChoicePx,
        effectiveDensity: decision.effectiveDensity,
      });
      return;
    }

    const finalStatus: SlideOverflowStatus = {
      isOverflowing: overflowRatio > 1.01,
      needsScrollFallback: overflowRatio > 1.01,
      reachedMinimumFloor: decision.reachedMinimumFloor,
      effectiveQuestionPx: fitState.effectiveQuestionPx,
      effectiveChoicePx: fitState.effectiveChoicePx,
      effectiveDensity: fitState.effectiveDensity,
    };

    if (
      finalStatus.isOverflowing !== fitState.isOverflowing ||
      finalStatus.needsScrollFallback !== fitState.needsScrollFallback ||
      finalStatus.reachedMinimumFloor !== fitState.reachedMinimumFloor
    ) {
      setFitState(finalStatus);
    }

    onOverflowChange?.(finalStatus);
  }, [fitState, settings.auto_fit, settings.question_font_preference, settings.choice_font_preference, onOverflowChange]);

  const stackChoices = shouldStackChoices(
    slide.options,
    containerWidth,
    fitState.effectiveChoicePx,
  );

  const densitySpacing =
    fitState.effectiveDensity === 'compact'
      ? {
          outerPad: 'px-6 py-4 sm:px-10 sm:py-5',
          headerPad: 'px-6 py-3 sm:px-10',
          sectionGap: 'space-y-4',
          optionPad: 'px-4 py-3',
          optionGap: 'gap-2.5',
        }
      : fitState.effectiveDensity === 'spacious'
        ? {
            outerPad: 'px-8 py-8 sm:px-14 sm:py-10',
            headerPad: 'px-8 py-5 sm:px-14',
            sectionGap: 'space-y-8',
            optionPad: 'px-6 py-5',
            optionGap: 'gap-4',
          }
        : {
            outerPad: 'px-6 py-6 sm:px-12 sm:py-7',
            headerPad: 'px-6 py-4 sm:px-12',
            sectionGap: 'space-y-6',
            optionPad: 'px-5 py-4',
            optionGap: 'gap-3.5',
          };

  const progressPct =
    slide.totalQuestions > 0
      ? Math.round((slide.presentationNumber / slide.totalQuestions) * 100)
      : 0;

  return (
    <div
      data-testid="student-slide"
      data-revealed={slide.isRevealed ? 'true' : 'false'}
      data-theme={settings.theme}
      className={`flex h-full w-full flex-col overflow-hidden select-text ${tokens.canvas}`}
    >
      {/* Header: Quiz Title, Section, Progress & Optional Timer */}
      <header
        className={`shrink-0 border-b ${tokens.headerBorder} ${densitySpacing.headerPad}`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
              <span
                className={`font-semibold truncate ${tokens.titleText}`}
                style={{ fontSize: `${settings.title_font_preference}px` }}
              >
                {quizTitle}
              </span>
              {slide.section && (
                <span className={`text-sm font-medium ${tokens.mutedText}`}>
                  <span aria-hidden="true">· </span>
                  {slide.section}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            {settings.timer_enabled && timerRemainingSeconds !== null && (
              <div
                aria-live="polite"
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 font-mono text-base font-bold tabular-nums ${
                  timerExpired ? tokens.timerExpiredBg : tokens.timerBg
                }`}
              >
                <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  {timerExpired ? '00:00 · Time up' : formatTimer(timerRemainingSeconds)}
                </span>
              </div>
            )}

            {settings.show_progress && (
              <div className="text-right tabular-nums">
                <span className={`font-mono text-sm sm:text-base font-semibold ${tokens.titleText}`}>
                  {slide.presentationNumber} of {slide.totalQuestions}
                </span>
              </div>
            )}
          </div>
        </div>

        {settings.show_progress && (
          <div className="mx-auto mt-2.5 max-w-6xl">
            <div className={`h-1.5 w-full overflow-hidden rounded-full ${tokens.progressTrack}`}>
              <div
                className={`h-full transition-all duration-200 ${tokens.progressFill}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}
      </header>

      {/* Main Content Stage (measured for auto-fit; graceful scroll fallback if content exceeds safe floor) */}
      <div
        ref={stageRef}
        className={`flex-1 min-h-0 w-full ${
          fitState.needsScrollFallback ? 'overflow-y-auto' : 'overflow-hidden'
        }`}
      >
        <div
          ref={contentRef}
          className={`mx-auto flex w-full max-w-6xl flex-col justify-center ${
            fitState.needsScrollFallback ? 'min-h-0' : 'min-h-full'
          } ${densitySpacing.outerPad} ${densitySpacing.sectionGap}`}
        >
          {/* Question Prompt */}
          <div>
            {(settings.show_question_number || settings.show_original_number) && (
              <div className={`mb-2 flex items-center gap-2 font-mono text-sm font-semibold tabular-nums ${tokens.mutedText}`}>
                {settings.show_question_number && (
                  <span>Question {slide.presentationNumber}</span>
                )}
                {settings.show_original_number && slide.originalNumber !== undefined && (
                  <span>
                    {settings.show_question_number ? '· ' : ''}Original Q{slide.originalNumber}
                  </span>
                )}
              </div>
            )}

            <h1
              data-testid="slide-question-text"
              className={`font-bold leading-[1.24] whitespace-pre-wrap break-words ${tokens.questionText}`}
              style={{ fontSize: `${fitState.effectiveQuestionPx}px` }}
            >
              {slide.text}
            </h1>
          </div>

          {/* Answer Choices */}
          <div
            data-testid="slide-options-list"
            className={`grid ${densitySpacing.optionGap} ${
              stackChoices ? 'grid-cols-1' : 'grid-cols-2'
            }`}
          >
            {slide.options.map((opt) => {
              const isCorrect = slide.isRevealed && opt.isMarkedCorrect;
              const isDimmed = slide.isRevealed && !opt.isMarkedCorrect;
              return (
                <div
                  key={opt.id}
                  data-testid={`slide-option-${opt.displayLetter}`}
                  data-correct-revealed={isCorrect ? 'true' : 'false'}
                  className={`flex items-start gap-4 rounded-xl border transition-opacity duration-150 ${
                    densitySpacing.optionPad
                  } ${
                    isCorrect
                      ? `${tokens.correctBg} ${tokens.correctBorder} ${tokens.correctText}`
                      : `${tokens.optionBg} ${tokens.optionBorder} ${tokens.optionText}`
                  } ${isDimmed ? tokens.dimmedOption : ''}`}
                >
                  <span
                    className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border font-mono text-lg font-bold ${
                      isCorrect
                        ? `${tokens.correctBadgeBg} ${tokens.correctBadgeText}`
                        : `${tokens.optionBadgeBg} ${tokens.optionBadgeText}`
                    }`}
                  >
                    {opt.displayLetter}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p
                      className="font-medium leading-[1.32] whitespace-pre-wrap break-words"
                      style={{ fontSize: `${fitState.effectiveChoicePx}px` }}
                    >
                      {opt.text}
                    </p>
                    {isCorrect && (
                      <div className="mt-2 inline-flex items-center gap-1.5 text-sm font-bold">
                        <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span>Correct answer</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Explanation (only shown when answer is revealed) */}
          {slide.isRevealed && slide.explanation && (
            <div
              data-testid="slide-explanation"
              className={`rounded-xl border px-5 py-4 ${tokens.explanationBg} ${tokens.explanationBorder} ${tokens.explanationText}`}
            >
              <p className="text-sm font-semibold opacity-85 mb-1">
                Explanation
              </p>
              <p
                className="leading-relaxed whitespace-pre-wrap break-words"
                style={{
                  fontSize: `${Math.max(16, Math.round(fitState.effectiveChoicePx * 0.72))}px`,
                }}
              >
                {slide.explanation}
              </p>
            </div>
          )}

          {fitState.needsScrollFallback && (
            <div
              className={`flex items-center gap-2 text-xs font-medium ${tokens.mutedText} pt-1`}
            >
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Scroll inside slide to read remaining content</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
