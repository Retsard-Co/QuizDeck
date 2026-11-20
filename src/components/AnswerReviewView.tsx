import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Bookmark,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  List,
  Minus,
  Plus,
  Printer,
  SquareStack,
} from 'lucide-react';
import { resolveQuestionDisplayOptions } from '../domain/quiz';
import {
  completeSession,
  returnToPresentation,
  updateSessionDisplaySettings,
} from '../domain/session';
import { PresentationSession } from '../domain/types';
import { clampFontSize, FONT_BOUNDS } from '../domain/typography';

interface AnswerReviewViewProps {
  session: PresentationSession;
  onSessionChange: (next: PresentationSession) => void;
  onCompleteAndExit: () => void;
}

export const AnswerReviewView: React.FC<AnswerReviewViewProps> = ({
  session,
  onSessionChange,
  onCompleteAndExit,
}) => {
  const [reviewMode, setReviewMode] = useState<'one_by_one' | 'all'>('one_by_one');
  const [orderMode, setOrderMode] = useState<'presentation' | 'original'>('presentation');
  const [reviewIndex, setReviewIndex] = useState<number>(0);

  const orderedItems = useMemo(() => {
    const qMap = new Map(session.quiz_snapshot.questions.map((q) => [q.id, q]));

    if (orderMode === 'presentation') {
      return session.question_order
        .map((qId, pos) => {
          const q = qMap.get(qId);
          if (!q) return null;
          return {
            question: q,
            presentationNumber: pos + 1,
            originalNumber: q.original_number ?? session.quiz_snapshot.questions.indexOf(q) + 1,
            resolvedOptions: resolveQuestionDisplayOptions(q, session.option_orders[q.id]),
            isFlagged: session.revisit_question_ids.includes(q.id),
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);
    }

    return session.quiz_snapshot.questions.map((q, origIdx) => {
      const presIdx = session.question_order.indexOf(q.id);
      return {
        question: q,
        presentationNumber: presIdx >= 0 ? presIdx + 1 : origIdx + 1,
        originalNumber: q.original_number ?? origIdx + 1,
        resolvedOptions: resolveQuestionDisplayOptions(q, undefined),
        isFlagged: session.revisit_question_ids.includes(q.id),
      };
    });
  }, [session, orderMode]);

  const activeItem = orderedItems[Math.min(reviewIndex, Math.max(0, orderedItems.length - 1))];
  const reviewFontPx = session.settings.review_font_preference || FONT_BOUNDS.review.default;

  const adjustReviewFont = (delta: number) => {
    onSessionChange(
      updateSessionDisplaySettings(session, {
        review_font_preference: clampFontSize('review', reviewFontPx + delta),
      }),
    );
  };

  const handleReturnToQuestion = (presentationNumber: number) => {
    onSessionChange(returnToPresentation(session, presentationNumber - 1));
  };

  const handleComplete = () => {
    onSessionChange(completeSession(session));
    onCompleteAndExit();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      {/* Top Review Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white print:hidden">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-slate-950 truncate">
              Answer Review — {session.quiz_snapshot.title}
            </h1>
            <p className="text-xs text-slate-600 tabular-nums">
              {orderedItems.length} questions <span aria-hidden="true">·</span>{' '}
              {orderMode === 'presentation'
                ? 'Preserving session presentation order & shuffled choice letters'
                : 'Showing canonical original quiz order'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => handleReturnToQuestion(activeItem?.presentationNumber ?? 1)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 min-h-[40px]"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>Return to Slide</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 min-h-[40px]"
            >
              <Printer className="h-4 w-4 text-slate-500" aria-hidden="true" />
              <span>Print Key</span>
            </button>

            <button
              type="button"
              onClick={handleComplete}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 min-h-[40px]"
            >
              <span>Complete &amp; Exit</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* Review Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 print:hidden">
          <div className="flex flex-wrap items-center gap-3">
            {/* One-by-one vs Reveal All */}
            <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setReviewMode('one_by_one')}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  reviewMode === 'one_by_one'
                    ? 'bg-white text-slate-950 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <SquareStack className="h-3.5 w-3.5" aria-hidden="true" />
                <span>One at a Time</span>
              </button>
              <button
                type="button"
                onClick={() => setReviewMode('all')}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  reviewMode === 'all'
                    ? 'bg-white text-slate-950 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <List className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Reveal All Answers</span>
              </button>
            </div>

            {/* Presentation Order vs Original Order */}
            <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setOrderMode('presentation')}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  orderMode === 'presentation'
                    ? 'bg-white text-slate-950 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Presentation Order
              </button>
              <button
                type="button"
                onClick={() => setOrderMode('original')}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  orderMode === 'original'
                    ? 'bg-white text-slate-950 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Original Order
              </button>
            </div>
          </div>

          {/* Review Font Size Controls */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-600 tabular-nums">
              Text: <strong className="font-mono text-slate-900">{reviewFontPx}px</strong>
            </span>
            <button
              type="button"
              aria-label="Decrease review font size"
              onClick={() => adjustReviewFont(-FONT_BOUNDS.review.step)}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            >
              <Minus className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Increase review font size"
              onClick={() => adjustReviewFont(FONT_BOUNDS.review.step)}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* One-at-a-Time Mode */}
        {reviewMode === 'one_by_one' && activeItem && (
          <div className="space-y-5">
            <article className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4 text-xs text-slate-600 tabular-nums">
                <div className="flex flex-wrap items-center gap-2 font-mono font-semibold">
                  <span className="text-slate-950">
                    Slide #{activeItem.presentationNumber} of {orderedItems.length}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>Original Q{activeItem.originalNumber}</span>
                  {activeItem.question.section && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-sans">{activeItem.question.section}</span>
                    </>
                  )}
                </div>

                {activeItem.isFlagged && (
                  <span className="inline-flex items-center gap-1 font-medium text-amber-800">
                    <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Flagged for revisit</span>
                  </span>
                )}
              </div>

              <h2
                className="font-bold text-slate-950 leading-snug whitespace-pre-wrap break-words"
                style={{ fontSize: `${Math.round(reviewFontPx * 1.45)}px` }}
              >
                {activeItem.question.text}
              </h2>

              <div className="space-y-2.5">
                {activeItem.resolvedOptions.map((opt) => (
                  <div
                    key={opt.option.id}
                    className={`flex items-start gap-3.5 rounded-xl border px-4 py-3.5 ${
                      opt.isCorrect
                        ? 'border-emerald-600 border-2 bg-emerald-50 text-emerald-950'
                        : 'border-slate-200 bg-slate-50/70 text-slate-700'
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border font-mono text-sm font-bold ${
                        opt.isCorrect
                          ? 'border-emerald-700 bg-emerald-700 text-white'
                          : 'border-slate-300 bg-white text-slate-700'
                      }`}
                    >
                      {opt.displayLetter}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p
                        className="font-medium leading-relaxed whitespace-pre-wrap break-words"
                        style={{ fontSize: `${reviewFontPx}px` }}
                      >
                        {opt.option.text}
                      </p>
                      {opt.isCorrect && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs font-bold text-emerald-800">
                          <span className="inline-flex items-center gap-1">
                            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                            <span>Correct answer</span>
                          </span>
                          {opt.displayLetter !== opt.originalLetter && (
                            <span className="font-normal text-emerald-700">
                              (Originally option {opt.originalLetter})
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {activeItem.question.explanation && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold text-slate-600 mb-1">Explanation</p>
                  <p
                    className="text-slate-800 leading-relaxed whitespace-pre-wrap"
                    style={{ fontSize: `${Math.max(14, reviewFontPx - 1)}px` }}
                  >
                    {activeItem.question.explanation}
                  </p>
                </div>
              )}
            </article>

            {/* One-at-a-Time Footer Navigation */}
            <div className="flex items-center justify-between gap-4">
              <button
                type="button"
                disabled={reviewIndex <= 0}
                onClick={() => setReviewIndex((i) => Math.max(0, i - 1))}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-40 min-h-[44px]"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                <span>Previous Answer</span>
              </button>

              <span className="font-mono text-sm font-semibold text-slate-700 tabular-nums">
                {reviewIndex + 1} / {orderedItems.length}
              </span>

              <button
                type="button"
                disabled={reviewIndex >= orderedItems.length - 1}
                onClick={() =>
                  setReviewIndex((i) => Math.min(orderedItems.length - 1, i + 1))
                }
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40 min-h-[44px]"
              >
                <span>Next Answer</span>
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        {/* Reveal All Mode */}
        {reviewMode === 'all' && (
          <div className="space-y-4">
            {orderedItems.map((item) => {
              const correctOpt = item.resolvedOptions.find((o) => o.isCorrect);
              return (
                <article
                  key={item.question.id}
                  className="rounded-xl border border-slate-200 bg-white p-5 space-y-3 break-inside-avoid"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 tabular-nums">
                    <div className="flex flex-wrap items-center gap-2 font-mono font-semibold">
                      <span className="text-slate-950">Slide #{item.presentationNumber}</span>
                      <span aria-hidden="true">·</span>
                      <span>Original Q{item.originalNumber}</span>
                      {item.question.section && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-sans">{item.question.section}</span>
                        </>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleReturnToQuestion(item.presentationNumber)}
                      className="text-xs font-medium text-blue-700 hover:underline print:hidden"
                    >
                      Open slide
                    </button>
                  </div>

                  <h2
                    className="font-semibold text-slate-950 leading-snug whitespace-pre-wrap"
                    style={{ fontSize: `${Math.round(reviewFontPx * 1.15)}px` }}
                  >
                    {item.question.text}
                  </h2>

                  {correctOpt && (
                    <div className="flex items-start gap-2.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3.5 py-2.5 text-emerald-950">
                      <CheckCircle2
                        className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700"
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <p style={{ fontSize: `${reviewFontPx}px` }}>
                          <strong className="font-mono mr-1.5">
                            {correctOpt.displayLetter}.
                          </strong>
                          <span className="font-semibold">{correctOpt.option.text}</span>
                        </p>
                        {correctOpt.displayLetter !== correctOpt.originalLetter && (
                          <p className="text-xs text-emerald-800 mt-0.5">
                            Original template choice: {correctOpt.originalLetter}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {item.question.explanation && (
                    <p
                      className="text-slate-600 leading-relaxed"
                      style={{ fontSize: `${Math.max(13, reviewFontPx - 2)}px` }}
                    >
                      <strong className="text-slate-800">Explanation:</strong>{' '}
                      {item.question.explanation}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};
