import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnswerReviewView } from './components/AnswerReviewView';
import { DashboardView } from './components/DashboardView';
import { LinkedDisplayView } from './components/LinkedDisplayView';
import { PresentationSetupView } from './components/PresentationSetupView';
import { PresentationView } from './components/PresentationView';
import { PrivacyAndDataView } from './components/PrivacyAndDataView';
import { QuizEditorView } from './components/QuizEditorView';
import { TemplatesAndImportView } from './components/TemplatesAndImportView';
import { AppRoute, TopBar } from './components/TopBar';
import { SAMPLE_QUIZZES } from './data/sampleQuizzes';
import { cloneQuiz, createEmptyQuiz, generateId } from './domain/quiz';
import { createPresentationSession, DEFAULT_SESSION_SETTINGS } from './domain/session';
import { PresentationSession, Quiz, RevealPolicy, SessionSettings } from './domain/types';
import { exportQuizToJson } from './importers';
import { downloadTextFile, slugifyFilename } from './lib/download';
import {
  clearAllLocalData,
  deleteQuizById,
  loadActiveSession,
  loadAllQuizzes,
  saveActiveSession,
  saveQuiz,
} from './lib/storage';

export default function App() {
  const urlParams = useMemo(() => {
    if (typeof window === 'undefined') return new URLSearchParams();
    return new URLSearchParams(window.location.search);
  }, []);

  const linkedDisplaySessionId = urlParams.get('display');

  const [route, setRoute] = useState<AppRoute>('library');
  const [loading, setLoading] = useState(true);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<PresentationSession | null>(null);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);

  // If opened as a linked display window (?display=<sessionId>), render pure display view
  if (linkedDisplaySessionId) {
    return <LinkedDisplayView sessionId={linkedDisplaySessionId} />;
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [quizRes, sessionRes] = await Promise.all([
        loadAllQuizzes(),
        loadActiveSession(),
      ]);

      if (!mounted) return;

      if (!quizRes.ok && quizRes.error) {
        setStorageWarning(quizRes.error);
      }
      const loadedQuizzes = quizRes.data || [];
      setQuizzes(loadedQuizzes);

      if (sessionRes.ok && sessionRes.data && sessionRes.data.status !== 'completed') {
        setActiveSession(sessionRes.data);
      }

      // Optional testability hook: ?autostart=1 launches presentation of first quiz directly
      if (urlParams.get('autostart') === '1' && loadedQuizzes.length > 0) {
        const autoSession = createPresentationSession(
          loadedQuizzes[0],
          'manual',
          DEFAULT_SESSION_SETTINGS,
        );
        setActiveSession(autoSession);
        setRoute('present');
      }

      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [urlParams]);

  const activeQuiz = useMemo(
    () => quizzes.find((q) => q.id === activeQuizId) || null,
    [quizzes, activeQuizId],
  );

  const persistSession = useCallback(async (session: PresentationSession | null) => {
    setActiveSession(session);
    const res = await saveActiveSession(session);
    if (!res.ok && res.error) {
      setStorageWarning(res.error);
    }
  }, []);

  const handleSaveQuiz = useCallback(async (quiz: Quiz): Promise<boolean> => {
    const res = await saveQuiz(quiz);
    if (!res.ok || !res.data) {
      setStorageWarning(res.error || 'Failed to save quiz locally.');
      return false;
    }
    const saved = res.data;
    setQuizzes((prev) => {
      const others = prev.filter((q) => q.id !== saved.id);
      return [saved, ...others];
    });
    setStorageWarning(null);
    return true;
  }, []);

  const handleCreateNewQuiz = async () => {
    const blank = createEmptyQuiz('Untitled Classroom Quiz');
    await handleSaveQuiz(blank);
    setActiveQuizId(blank.id);
    setRoute('editor');
  };

  const handleDuplicateQuiz = async (quizId: string) => {
    const target = quizzes.find((q) => q.id === quizId);
    if (!target) return;
    const now = new Date().toISOString();
    const copy: Quiz = {
      ...cloneQuiz(target),
      id: generateId('quiz'),
      title: `${target.title} (Copy)`,
      revision: 1,
      created_at: now,
      updated_at: now,
    };
    await handleSaveQuiz(copy);
  };

  const handleDeleteQuiz = async (quizId: string) => {
    const res = await deleteQuizById(quizId);
    if (!res.ok && res.error) {
      setStorageWarning(res.error);
      return;
    }
    setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
    if (activeQuizId === quizId) {
      setActiveQuizId(null);
    }
  };

  const handleExportQuizJson = (quiz: Quiz) => {
    const json = exportQuizToJson(quiz);
    downloadTextFile(json, `${slugifyFilename(quiz.title)}.json`, 'application/json');
  };

  const handleConfirmImport = async (importedQuiz: Quiz, openInEditor: boolean) => {
    // Assign a fresh unique ID if colliding with an existing quiz ID so import is non-destructive
    const exists = quizzes.some((q) => q.id === importedQuiz.id);
    const toSave: Quiz = exists
      ? { ...importedQuiz, id: generateId('quiz') }
      : importedQuiz;
    const ok = await handleSaveQuiz(toSave);
    if (ok) {
      setActiveQuizId(toSave.id);
      setRoute(openInEditor ? 'editor' : 'library');
    }
  };

  const handleStartPresentation = async (
    policy: RevealPolicy,
    settings: SessionSettings,
  ) => {
    if (!activeQuiz) return;
    const session = createPresentationSession(activeQuiz, policy, settings);
    await persistSession(session);
    setRoute('present');
  };

  const handleSessionChange = useCallback(
    (next: PresentationSession) => {
      void persistSession(next);
      if (next.status === 'answer_review') {
        setRoute('review');
      } else if (next.status === 'presenting' || next.status === 'paused') {
        setRoute('present');
      }
    },
    [persistSession],
  );

  const handleResumeSavedSession = () => {
    if (!activeSession) return;
    if (activeSession.status === 'answer_review') {
      setRoute('review');
    } else {
      setRoute('present');
    }
  };

  const handleDiscardSavedSession = async () => {
    await persistSession(null);
  };

  const handleRestoreSamples = async () => {
    for (const sample of SAMPLE_QUIZZES) {
      await handleSaveQuiz(sample);
    }
  };

  const handleRestoreBackup = async (restoredQuizzes: Quiz[]) => {
    for (const q of restoredQuizzes) {
      await handleSaveQuiz(q);
    }
  };

  const handleClearAllData = async () => {
    const res = await clearAllLocalData();
    if (!res.ok && res.error) {
      setStorageWarning(res.error);
      return;
    }
    setQuizzes([]);
    setActiveQuizId(null);
    setActiveSession(null);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-600">
        Loading local QuizDeck library...
      </div>
    );
  }

  // Full-bleed live presentation view
  if (route === 'present' && activeSession) {
    return (
      <PresentationView
        session={activeSession}
        onSessionChange={handleSessionChange}
        onEndAndDiscard={async () => {
          await persistSession(null);
          setRoute('library');
        }}
      />
    );
  }

  // Post-presentation Answer Review view
  if (route === 'review' && activeSession) {
    return (
      <AnswerReviewView
        session={activeSession}
        onSessionChange={handleSessionChange}
        onCompleteAndExit={async () => {
          await persistSession(null);
          setRoute('library');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 flex flex-col">
      <TopBar
        currentRoute={route}
        onNavigate={(next) => setRoute(next)}
        onCreateNewQuiz={handleCreateNewQuiz}
      />

      <div className="flex-1">
        {route === 'library' && (
          <DashboardView
            quizzes={quizzes}
            recoverableSession={activeSession}
            storageWarning={storageWarning}
            onCreateQuiz={handleCreateNewQuiz}
            onOpenImport={() => setRoute('import')}
            onOpenTemplates={() => setRoute('templates')}
            onEditQuiz={(id) => {
              setActiveQuizId(id);
              setRoute('editor');
            }}
            onSetupPresentation={(id) => {
              setActiveQuizId(id);
              setRoute('setup');
            }}
            onDuplicateQuiz={handleDuplicateQuiz}
            onDeleteQuiz={handleDeleteQuiz}
            onExportQuizJson={handleExportQuizJson}
            onResumeSession={handleResumeSavedSession}
            onDiscardSession={handleDiscardSavedSession}
            onRestoreSamples={handleRestoreSamples}
          />
        )}

        {(route === 'import' || route === 'templates') && (
          <TemplatesAndImportView
            initialTab={route}
            onConfirmImport={handleConfirmImport}
            onCancel={() => setRoute('library')}
          />
        )}

        {route === 'editor' && activeQuiz && (
          <QuizEditorView
            key={activeQuiz.id}
            initialQuiz={activeQuiz}
            onSave={handleSaveQuiz}
            onSaveAndPresent={async (updatedQuiz) => {
              const ok = await handleSaveQuiz(updatedQuiz);
              if (ok) {
                setActiveQuizId(updatedQuiz.id);
                setRoute('setup');
              }
            }}
            onBack={() => setRoute('library')}
          />
        )}

        {route === 'setup' && activeQuiz && (
          <PresentationSetupView
            key={activeQuiz.id}
            quiz={activeQuiz}
            onStartPresentation={handleStartPresentation}
            onEditQuiz={() => setRoute('editor')}
            onBack={() => setRoute('library')}
          />
        )}

        {route === 'privacy' && (
          <PrivacyAndDataView
            quizzes={quizzes}
            onRestoreBackup={handleRestoreBackup}
            onClearAllData={handleClearAllData}
            onRestoreSamples={handleRestoreSamples}
          />
        )}
      </div>

      <footer className="border-t border-slate-200 bg-white py-5 text-xs text-slate-500">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <span>QuizDeck · Local-first classroom quiz preparation and presentation</span>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setRoute('templates')}
              className="hover:text-slate-900 transition-colors"
            >
              Templates
            </button>
            <button
              type="button"
              onClick={() => setRoute('privacy')}
              className="hover:text-slate-900 transition-colors"
            >
              Local Data &amp; Privacy
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
