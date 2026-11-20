import React, { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2, PauseCircle, WifiOff } from 'lucide-react';
import { getStudentSlideView } from '../domain/session';
import { PresentationSession } from '../domain/types';
import { loadActiveSession } from '../lib/storage';
import { PresenterSyncChannel } from '../lib/sync';
import { StudentSlide } from './StudentSlide';

interface LinkedDisplayViewProps {
  sessionId: string;
}

export const LinkedDisplayView: React.FC<LinkedDisplayViewProps> = ({ sessionId }) => {
  const [session, setSession] = useState<PresentationSession | null>(null);
  const [connected, setConnected] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const lastHostPingRef = useRef<number>(Date.now());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    loadActiveSession().then((res) => {
      if (active && res.ok && res.data && res.data.id === sessionId) {
        setSession(res.data);
      }
    });

    const sync = new PresenterSyncChannel((msg) => {
      if (msg.type === 'STATE_UPDATE' && msg.session.id === sessionId) {
        setSession(msg.session);
        setConnected(true);
        setSessionEnded(false);
        lastHostPingRef.current = Date.now();
      } else if (msg.type === 'HEARTBEAT' && msg.sessionId === sessionId && msg.role === 'host') {
        setConnected(true);
        lastHostPingRef.current = Date.now();
      } else if (msg.type === 'SESSION_ENDED' && msg.sessionId === sessionId) {
        setSessionEnded(true);
      }
    });

    sync.requestState(sessionId);
    sync.sendHeartbeat(sessionId, 'display');

    const interval = window.setInterval(() => {
      sync.sendHeartbeat(sessionId, 'display');
      if (Date.now() - lastHostPingRef.current > 6000) {
        setConnected(false);
      }
    }, 2000);

    return () => {
      active = false;
      window.clearInterval(interval);
      sync.close();
    };
  }, [sessionId]);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await (containerRef.current || document.documentElement).requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Fullscreen may be blocked in restricted iframes
    }
  };

  if (sessionEnded) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6 text-center text-slate-100">
        <h1 className="text-3xl font-bold">Presentation Ended</h1>
        <p className="mt-3 max-w-md text-slate-400">
          The presenter has closed this session. You may close this display tab.
        </p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6 text-center text-slate-100">
        <WifiOff className="h-10 w-10 text-slate-400" aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-bold">Waiting for Presenter Window</h1>
        <p className="mt-2 max-w-md text-sm text-slate-400">
          Keep the main QuizDeck presenter tab open in the same browser to synchronize slides
          automatically.
        </p>
      </div>
    );
  }

  const slideView = getStudentSlideView(session);

  return (
    <div ref={containerRef} className="relative flex h-screen w-screen flex-col overflow-hidden bg-slate-950">
      {!connected && (
        <div
          role="status"
          className="flex items-center justify-center gap-2 bg-amber-900 px-4 py-1.5 text-xs font-medium text-amber-100"
        >
          <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Presenter tab disconnected — displaying last synchronized slide</span>
        </div>
      )}

      <div className="relative flex-1 min-h-0">
        {session.status === 'paused' ? (
          <div className="flex h-full flex-col items-center justify-center bg-slate-950 text-slate-100 px-6 text-center">
            <PauseCircle className="h-14 w-14 text-slate-400" aria-hidden="true" />
            <h1 className="mt-4 text-4xl font-bold tracking-tight">Presentation Paused</h1>
            <p className="mt-3 text-lg text-slate-400">
              {session.quiz_snapshot.title}
            </p>
          </div>
        ) : slideView ? (
          <StudentSlide
            quizTitle={session.quiz_snapshot.title}
            slide={slideView}
            settings={session.settings}
            timerRemainingSeconds={session.timer_remaining_seconds}
            timerExpired={session.timer_expired}
          />
        ) : null}

        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          className="absolute right-4 top-4 rounded-lg border border-slate-500/30 bg-slate-900/70 p-2 text-slate-200 hover:bg-slate-800 transition-colors"
        >
          {isFullscreen ? (
            <Minimize2 className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Maximize2 className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  );
};
