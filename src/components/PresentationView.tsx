import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bookmark,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Flag,
  HelpCircle,
  Keyboard,
  Maximize2,
  Minimize2,
  Minus,
  Monitor,
  PanelRightClose,
  PanelRightOpen,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Sliders,
  Square,
  X,
} from 'lucide-react';
import {
  finishPresentation,
  getActiveQuestion,
  getStudentSlideView,
  goToNextQuestion,
  goToPreviousQuestion,
  goToQuestion,
  hideAnswer,
  pauseSession,
  resetActiveTimer,
  resumeSession,
  revealAnswer,
  tickTimer,
  toggleRevisit,
  updateSessionDisplaySettings,
} from '../domain/session';
import {
  LayoutDensity,
  PresentationSession,
  PresentationTheme,
} from '../domain/types';
import { clampFontSize, FONT_BOUNDS } from '../domain/typography';
import { isBroadcastChannelSupported, PresenterSyncChannel } from '../lib/sync';
import { SlideOverflowStatus, StudentSlide } from './StudentSlide';

interface PresentationViewProps {
  session: PresentationSession;
  onSessionChange: (next: PresentationSession) => void;
  onEndAndDiscard: () => void;
}

function isEditableElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  return target.isContentEditable;
}

export const PresentationView: React.FC<PresentationViewProps> = ({
  session,
  onSessionChange,
  onEndAndDiscard,
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const [showPresenterPanel, setShowPresenterPanel] = useState(true);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState<string | null>(null);
  const [overflowStatus, setOverflowStatus] = useState<SlideOverflowStatus | null>(null);
  const [displayConnected, setDisplayConnected] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const lastDisplayPingRef = useRef<number>(0);
  const syncChannelRef = useRef<PresenterSyncChannel | null>(null);

  const slideView = getStudentSlideView(session);
  const activeQuestion = getActiveQuestion(session);
  const isFirst = session.current_index <= 0;
  const isLast = session.current_index >= session.question_order.length - 1;
  const isFlaggedForRevisit = activeQuestion
    ? session.revisit_question_ids.includes(activeQuestion.id)
    : false;

  const apply = useCallback(
    (updater: (curr: PresentationSession) => PresentationSession) => {
      onSessionChange(updater(sessionRef.current));
    },
    [onSessionChange],
  );

  // Timer tick effect
  useEffect(() => {
    if (
      session.status !== 'presenting' ||
      !session.settings.timer_enabled ||
      !session.timer_running
    ) {
      return;
    }
    const id = window.setInterval(() => {
      onSessionChange(tickTimer(sessionRef.current));
    }, 1000);
    return () => window.clearInterval(id);
  }, [
    session.status,
    session.settings.timer_enabled,
    session.timer_running,
    onSessionChange,
  ]);

  // Separate Display Window Sync via BroadcastChannel
  useEffect(() => {
    const channel = new PresenterSyncChannel((msg) => {
      if (msg.type === 'REQUEST_STATE' && msg.sessionId === sessionRef.current.id) {
        channel.broadcastState(sessionRef.current);
        lastDisplayPingRef.current = Date.now();
        setDisplayConnected(true);
      } else if (
        msg.type === 'HEARTBEAT' &&
        msg.sessionId === sessionRef.current.id &&
        msg.role === 'display'
      ) {
        lastDisplayPingRef.current = Date.now();
        setDisplayConnected(true);
      }
    });
    syncChannelRef.current = channel;
    channel.broadcastState(sessionRef.current);

    const pingId = window.setInterval(() => {
      channel.sendHeartbeat(sessionRef.current.id, 'host');
      if (lastDisplayPingRef.current > 0 && Date.now() - lastDisplayPingRef.current > 6000) {
        setDisplayConnected(false);
      }
    }, 2000);

    return () => {
      window.clearInterval(pingId);
      channel.close();
      syncChannelRef.current = null;
    };
  }, []);

  // Broadcast every state change to any connected Student Display tab
  useEffect(() => {
    syncChannelRef.current?.broadcastState(session);
  }, [session]);

  // Fullscreen listener
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
      setFullscreenError(null);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await (rootRef.current || document.documentElement).requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
      setFullscreenError(null);
    } catch {
      setFullscreenError(
        'Fullscreen was blocked by the browser or embed container. Maximize your browser window instead.',
      );
    }
  }, []);

  // Keyboard shortcuts (ignored inside editable fields)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditableElement(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === 'Escape') {
        if (showShortcutsModal) {
          setShowShortcutsModal(false);
          e.preventDefault();
        } else if (showEndModal) {
          setShowEndModal(false);
          e.preventDefault();
        } else if (showSyncModal) {
          setShowSyncModal(false);
          e.preventDefault();
        }
        return;
      }

      if (showShortcutsModal || showEndModal || showSyncModal) return;

      const key = e.key;
      if (key === 'ArrowRight' || key === 'PageDown') {
        e.preventDefault();
        apply(goToNextQuestion);
      } else if (key === ' ') {
        // Space advances only when focus is not on a button or editable control
        const tag = (e.target as HTMLElement | null)?.tagName.toLowerCase();
        if (tag !== 'button' && tag !== 'a') {
          e.preventDefault();
          apply(goToNextQuestion);
        }
      } else if (key === 'ArrowLeft' || key === 'PageUp') {
        e.preventDefault();
        apply(goToPreviousQuestion);
      } else if (key === 'Home') {
        e.preventDefault();
        apply((s) => goToQuestion(s, 0));
      } else if (key === 'End') {
        e.preventDefault();
        apply((s) => goToQuestion(s, s.question_order.length - 1));
      } else if (key === 'r' || key === 'R') {
        e.preventDefault();
        apply(revealAnswer);
      } else if (key === 'h' || key === 'H') {
        e.preventDefault();
        apply(hideAnswer);
      } else if (key === 'p' || key === 'P') {
        e.preventDefault();
        apply((s) => (s.status === 'paused' ? resumeSession(s) : pauseSession(s)));
      } else if (key === 'f' || key === 'F') {
        e.preventDefault();
        void toggleFullscreen();
      } else if (key === '?') {
        e.preventDefault();
        setShowShortcutsModal((v) => !v);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [apply, toggleFullscreen, showShortcutsModal, showEndModal, showSyncModal]);

  const handleAdjustFont = (kind: 'question' | 'choice', delta: number) => {
    apply((s) => {
      if (kind === 'question') {
        return updateSessionDisplaySettings(s, {
          question_font_preference: clampFontSize(
            'question',
            s.settings.question_font_preference + delta,
          ),
        });
      }
      return updateSessionDisplaySettings(s, {
        choice_font_preference: clampFontSize(
          'choice',
          s.settings.choice_font_preference + delta,
        ),
      });
    });
  };

  const displayUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}?display=${encodeURIComponent(session.id)}`
      : '';

  const handleCopyDisplayUrl = async () => {
    try {
      await navigator.clipboard.writeText(displayUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Clipboard fallback ignored
    }
  };

  const policyLabel =
    session.reveal_policy === 'manual'
      ? 'Manual Reveal'
      : session.reveal_policy === 'after_each'
        ? 'After Each Question'
        : 'After Entire Quiz';

  return (
    <div
      ref={rootRef}
      data-testid="presentation-shell"
      className="flex h-screen w-screen flex-col overflow-hidden bg-slate-950"
    >
      {/* Subtle Top Utility Strip (never hover-only; guarantees fullscreen recovery & panel toggle) */}
      <div className="flex h-12 shrink-0 items-center justify-between gap-4 border-b border-slate-800 bg-slate-900 px-3 sm:px-4 text-slate-200">
        <div className="flex items-center gap-3 min-w-0 text-xs">
          <span className="font-bold text-white whitespace-nowrap shrink-0">QuizDeck</span>
          <span aria-hidden="true" className="text-slate-600">
            ·
          </span>
          <span className="text-slate-300 truncate">{policyLabel}</span>
          {session.seed_used && (
            <>
              <span aria-hidden="true" className="hidden sm:inline text-slate-600">
                ·
              </span>
              <span className="hidden sm:inline font-mono text-slate-400">
                Seed: {session.seed_used}
              </span>
            </>
          )}
          {displayConnected && (
            <>
              <span aria-hidden="true" className="text-slate-600">
                ·
              </span>
              <span className="text-emerald-400 font-medium whitespace-nowrap">
                Display tab linked
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowSyncModal(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 whitespace-nowrap min-h-[34px]"
          >
            <Monitor className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden md:inline">Display Window</span>
          </button>

          <button
            type="button"
            onClick={() => setShowShortcutsModal(true)}
            aria-label="Keyboard shortcuts help"
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 whitespace-nowrap min-h-[34px]"
          >
            <Keyboard className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden md:inline">Shortcuts</span>
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 whitespace-nowrap min-h-[34px]"
          >
            {isFullscreen ? (
              <Minimize2 className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span className="hidden sm:inline">{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPresenterPanel((v) => !v)}
            aria-label={showPresenterPanel ? 'Hide presenter panel' : 'Show presenter panel'}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 whitespace-nowrap min-h-[34px]"
          >
            {showPresenterPanel ? (
              <PanelRightClose className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <PanelRightOpen className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span className="hidden sm:inline">
              {showPresenterPanel ? 'Hide Controls' : 'Presenter Controls'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setShowEndModal(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-red-800/90 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700 whitespace-nowrap min-h-[34px]"
          >
            <Square className="h-3 w-3" aria-hidden="true" />
            <span>End</span>
          </button>
        </div>
      </div>

      {fullscreenError && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 bg-amber-950 px-4 py-2 text-xs text-amber-200 border-b border-amber-800"
        >
          <span>{fullscreenError}</span>
          <button
            type="button"
            onClick={() => setFullscreenError(null)}
            aria-label="Dismiss fullscreen notice"
            className="text-amber-300 hover:text-white"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Main Split: Student Slide + Optional Presenter Control Panel */}
      <div className="flex flex-1 min-h-0 flex-col lg:flex-row">
        {/* Student Display Stage */}
        <div className="relative flex-1 min-h-0 min-w-0">
          {session.status === 'paused' ? (
            <div className="flex h-full flex-col items-center justify-center bg-[#0B1120] px-6 text-center text-slate-100">
              <Pause className="h-12 w-12 text-slate-400" aria-hidden="true" />
              <h1 className="mt-4 text-3xl font-bold">Presentation Paused</h1>
              <p className="mt-2 max-w-md text-sm text-slate-400">
                Question content is hidden from students while paused. Press P or click Resume to
                continue.
              </p>
              <button
                type="button"
                onClick={() => apply(resumeSession)}
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 min-h-[44px]"
              >
                <Play className="h-4 w-4" aria-hidden="true" />
                <span>Resume Presentation</span>
              </button>
            </div>
          ) : slideView ? (
            <StudentSlide
              quizTitle={session.quiz_snapshot.title}
              slide={slideView}
              settings={session.settings}
              timerRemainingSeconds={session.timer_remaining_seconds}
              timerExpired={session.timer_expired}
              onOverflowChange={setOverflowStatus}
            />
          ) : null}
        </div>

        {/* Dedicated Presenter Control Panel */}
        {showPresenterPanel && (
          <aside
            aria-label="Presenter control panel"
            className="flex w-full lg:w-[340px] shrink-0 flex-col border-t lg:border-t-0 lg:border-l border-slate-800 bg-slate-900 text-slate-100 overflow-y-auto max-h-[42vh] lg:max-h-none"
          >
            <div className="p-4 space-y-5">
              {/* Overflow Warning to Teacher */}
              {overflowStatus?.isOverflowing && (
                <div
                  role="alert"
                  className="rounded-lg border border-amber-500/50 bg-amber-950/70 p-3 text-xs text-amber-100 space-y-1"
                >
                  <div className="flex items-center gap-1.5 font-semibold text-amber-200">
                    <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>Content exceeds slide height</span>
                  </div>
                  <p>
                    {session.settings.auto_fit
                      ? 'Auto-fit reached the minimum readable size. Scroll fallback is active so no text is clipped.'
                      : 'Auto-fit is OFF. Enable Auto-fit or reduce font size below to remove scrolling.'}
                  </p>
                </div>
              )}

              {/* Navigation Controls */}
              <section className="space-y-2.5">
                <div className="flex items-center justify-between text-xs text-slate-400 tabular-nums">
                  <span className="font-semibold text-slate-200">Navigation</span>
                  <span>
                    Q{session.current_index + 1} of {session.question_order.length}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isFirst}
                    onClick={() => apply(goToPreviousQuestion)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-40 min-h-[44px]"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    <span>Previous</span>
                  </button>

                  {isLast ? (
                    <button
                      type="button"
                      onClick={() => apply(finishPresentation)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 min-h-[44px]"
                    >
                      <Flag className="h-4 w-4" aria-hidden="true" />
                      <span>Finish &amp; Review</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => apply(goToNextQuestion)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 min-h-[44px]"
                    >
                      <span>Next</span>
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </section>

              {/* Answer Reveal Controls */}
              <section className="space-y-2.5 border-t border-slate-800 pt-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">Answer Visibility</span>
                  <span
                    className={`font-medium ${
                      slideView?.isRevealed ? 'text-emerald-400' : 'text-slate-400'
                    }`}
                  >
                    {slideView?.isRevealed ? 'Revealed' : 'Hidden'}
                  </span>
                </div>

                {session.reveal_policy === 'after_entire_quiz' ? (
                  <div className="rounded-lg border border-slate-700 bg-slate-800/70 p-3 text-xs text-slate-300 leading-relaxed">
                    <p className="font-semibold text-slate-100">
                      Locked until end of quiz
                    </p>
                    <p className="mt-1">
                      Policy is set to <strong>After Entire Quiz</strong>. Answers remain hidden
                      during presentation and unlock in Answer Review.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {session.reveal_policy === 'after_each' && !slideView?.isRevealed && (
                      <p className="text-xs text-slate-400">
                        After students respond, reveal the answer below before moving to the next
                        question.
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={Boolean(slideView?.isRevealed)}
                        onClick={() => apply(revealAnswer)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-45 min-h-[44px]"
                      >
                        <Eye className="h-4 w-4" aria-hidden="true" />
                        <span>Reveal (R)</span>
                      </button>

                      <button
                        type="button"
                        disabled={
                          !slideView?.isRevealed || !session.settings.allow_hide_after_reveal
                        }
                        onClick={() => apply(hideAnswer)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm font-semibold text-slate-100 hover:bg-slate-700 disabled:opacity-40 min-h-[44px]"
                      >
                        <EyeOff className="h-4 w-4" aria-hidden="true" />
                        <span>Hide (H)</span>
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      apply((s) => (s.status === 'paused' ? resumeSession(s) : pauseSession(s)))
                    }
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 min-h-[40px]"
                  >
                    {session.status === 'paused' ? (
                      <>
                        <Play className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Resume (P)</span>
                      </>
                    ) : (
                      <>
                        <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Pause (P)</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => apply((s) => toggleRevisit(s))}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium min-h-[40px] ${
                      isFlaggedForRevisit
                        ? 'border-amber-500 bg-amber-950/70 text-amber-200'
                        : 'border-slate-700 bg-slate-800/70 text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{isFlaggedForRevisit ? 'Flagged' : 'Flag Revisit'}</span>
                  </button>
                </div>

                {session.settings.timer_enabled && (
                  <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-xs">
                    <span className="text-slate-300 tabular-nums">
                      Timer:{' '}
                      <strong className="font-mono text-white">
                        {session.timer_remaining_seconds ?? 0}s
                      </strong>
                      {session.timer_expired ? ' (Time up)' : ''}
                    </span>
                    <button
                      type="button"
                      onClick={() => apply(resetActiveTimer)}
                      className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 font-medium"
                    >
                      <RotateCcw className="h-3 w-3" aria-hidden="true" />
                      <span>Reset</span>
                    </button>
                  </div>
                )}
              </section>

              {/* Jump to Question Grid */}
              <section className="space-y-2 border-t border-slate-800 pt-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">Jump to Question</span>
                  <span className="text-slate-400 tabular-nums">
                    {session.revealed_question_ids.length} revealed
                  </span>
                </div>
                <div className="grid grid-cols-6 gap-1.5">
                  {session.question_order.map((qId, idx) => {
                    const isCurrent = idx === session.current_index;
                    const isRev = session.revealed_question_ids.includes(qId);
                    const isFlag = session.revisit_question_ids.includes(qId);
                    return (
                      <button
                        key={qId}
                        type="button"
                        onClick={() => apply((s) => goToQuestion(s, idx))}
                        aria-label={`Jump to question ${idx + 1}${isRev ? ' (revealed)' : ''}${isFlag ? ' (flagged)' : ''}`}
                        aria-current={isCurrent ? 'step' : undefined}
                        className={`relative flex h-9 items-center justify-center rounded-md border font-mono text-xs font-semibold tabular-nums transition-colors ${
                          isCurrent
                            ? 'border-blue-400 bg-blue-600 text-white'
                            : isRev
                              ? 'border-emerald-700 bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/60'
                              : 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {idx + 1}
                        {isFlag && (
                          <span
                            aria-hidden="true"
                            className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-amber-400"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Live Typography & Display Controls */}
              <section className="space-y-3 border-t border-slate-800 pt-4">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                    <Sliders className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                    <span>Typography &amp; Display</span>
                  </span>
                  <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={session.settings.auto_fit}
                      onChange={(e) =>
                        apply((s) =>
                          updateSessionDisplaySettings(s, { auto_fit: e.target.checked }),
                        )
                      }
                      className="h-3.5 w-3.5 accent-blue-500"
                    />
                    <span>Auto-fit</span>
                  </label>
                </div>

                {/* Question font size independent control */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-300 tabular-nums">
                    Question:{' '}
                    <strong className="font-mono text-white">
                      {overflowStatus
                        ? `${overflowStatus.effectiveQuestionPx}px`
                        : `${session.settings.question_font_preference}px`}
                    </strong>
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label="Decrease question font size"
                      onClick={() => handleAdjustFont('question', -FONT_BOUNDS.question.step)}
                      className="flex h-8 w-8 items-center justify-center rounded border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
                    >
                      <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label="Increase question font size"
                      onClick={() => handleAdjustFont('question', FONT_BOUNDS.question.step)}
                      className="flex h-8 w-8 items-center justify-center rounded border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {/* Choice font size independent control */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-300 tabular-nums">
                    Choices:{' '}
                    <strong className="font-mono text-white">
                      {overflowStatus
                        ? `${overflowStatus.effectiveChoicePx}px`
                        : `${session.settings.choice_font_preference}px`}
                    </strong>
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label="Decrease choice font size"
                      onClick={() => handleAdjustFont('choice', -FONT_BOUNDS.choice.step)}
                      className="flex h-8 w-8 items-center justify-center rounded border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
                    >
                      <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label="Increase choice font size"
                      onClick={() => handleAdjustFont('choice', FONT_BOUNDS.choice.step)}
                      className="flex h-8 w-8 items-center justify-center rounded border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {/* Theme & Density quick selectors */}
                <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-950 p-1">
                  {(
                    [
                      { id: 'dark', label: 'Dark' },
                      { id: 'light', label: 'Light' },
                      { id: 'high_contrast', label: 'Contrast' },
                    ] as Array<{ id: PresentationTheme; label: string }>
                  ).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() =>
                        apply((s) => updateSessionDisplaySettings(s, { theme: t.id }))
                      }
                      className={`rounded py-1.5 text-xs font-medium ${
                        session.settings.theme === t.id
                          ? 'bg-slate-700 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-950 p-1">
                  {(['compact', 'balanced', 'spacious'] as LayoutDensity[]).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() =>
                        apply((s) => updateSessionDisplaySettings(s, { layout_density: d }))
                      }
                      className={`rounded py-1.5 text-xs font-medium capitalize ${
                        session.settings.layout_density === d
                          ? 'bg-slate-700 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </section>

              {/* Direct Action to Open Answer Review */}
              <div className="border-t border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={() => apply(finishPresentation)}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-xs font-semibold text-slate-100 hover:bg-slate-700 min-h-[40px]"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                  <span>Open Answer Review</span>
                </button>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Keyboard Shortcuts Help Modal */}
      {showShortcutsModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="shortcuts-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6 text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-blue-400" aria-hidden="true" />
                <h2 id="shortcuts-modal-title" className="text-base font-bold">
                  Presenter Keyboard Shortcuts
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowShortcutsModal(false)}
                aria-label="Close shortcuts dialog"
                className="rounded p-1 text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <dl className="mt-4 space-y-2.5 text-sm">
              {[
                ['→ / PageDown / Space', 'Next question'],
                ['← / PageUp', 'Previous question'],
                ['Home / End', 'First / Last question'],
                ['R', 'Reveal answer (when policy permits)'],
                ['H', 'Hide revealed answer'],
                ['P', 'Pause / Resume presentation & timer'],
                ['F', 'Toggle fullscreen'],
                ['?', 'Show or hide this shortcut reference'],
                ['Esc', 'Close overlay or exit fullscreen'],
              ].map(([keys, desc]) => (
                <div key={keys} className="flex items-center justify-between gap-4">
                  <dt className="text-slate-300">{desc}</dt>
                  <dd className="font-mono text-xs font-semibold text-blue-300 bg-slate-800 px-2 py-1 rounded border border-slate-700 whitespace-nowrap">
                    {keys}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}

      {/* Separate Display Window Modal */}
      {showSyncModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="sync-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"
        >
          <div className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 p-6 text-slate-100 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 id="sync-modal-title" className="text-base font-bold">
                Separate Student Display Window
              </h2>
              <button
                type="button"
                onClick={() => setShowSyncModal(false)}
                aria-label="Close display window dialog"
                className="rounded p-1 text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            {isBroadcastChannelSupported() ? (
              <>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Open a clean, student-only display tab in this same browser and move it to your
                  classroom projector or extended monitor. Slides stay synchronized locally via
                  BroadcastChannel without sending data over a network.
                </p>

                <div className="rounded-lg border border-slate-700 bg-slate-950 p-3 flex items-center justify-between gap-2">
                  <code className="font-mono text-xs text-slate-300 truncate">{displayUrl}</code>
                  <button
                    type="button"
                    onClick={handleCopyDisplayUrl}
                    className="inline-flex items-center gap-1 rounded bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-slate-700 shrink-0"
                  >
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <span className="text-xs text-slate-400">
                    Status:{' '}
                    <strong className={displayConnected ? 'text-emerald-400' : 'text-slate-300'}>
                      {displayConnected
                        ? 'Connected to linked display tab'
                        : 'No linked display tab detected yet'}
                    </strong>
                  </span>
                  <a
                    href={displayUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 min-h-[40px]"
                  >
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    <span>Open Display Tab</span>
                  </a>
                </div>
              </>
            ) : (
              <p className="text-sm text-amber-200">
                Your browser does not support BroadcastChannel window sync. Use the same-window
                Presenter Controls and keyboard shortcuts instead.
              </p>
            )}
          </div>
        </div>
      )}

      {/* End Presentation Confirmation Modal */}
      {showEndModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="end-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6 text-slate-100 shadow-2xl">
            <h2 id="end-modal-title" className="text-lg font-bold">
              End presentation?
            </h2>
            <p className="mt-2 text-sm text-slate-300 leading-relaxed">
              Open Answer Review to walk students through the exact randomized answer key, or exit
              directly back to your quiz library.
            </p>
            <div className="mt-6 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowEndModal(false);
                  apply(finishPresentation);
                }}
                className="w-full rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 min-h-[44px]"
              >
                Finish &amp; Open Answer Review
              </button>
              <button
                type="button"
                onClick={() => setShowEndModal(false)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-700 min-h-[44px]"
              >
                Continue Presenting
              </button>
              <button
                type="button"
                onClick={() => {
                  syncChannelRef.current?.broadcastEnded(session.id);
                  setShowEndModal(false);
                  onEndAndDiscard();
                }}
                className="w-full rounded-lg border border-red-800 bg-red-950/60 px-4 py-2.5 text-sm font-medium text-red-200 hover:bg-red-900/60 min-h-[44px]"
              >
                End &amp; Exit Without Review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
