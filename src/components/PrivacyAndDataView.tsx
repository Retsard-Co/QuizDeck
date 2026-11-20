import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  HardDrive,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react';
import { Quiz } from '../domain/types';
import { downloadTextFile } from '../lib/download';
import { buildLibraryBackupJson, parseLibraryBackupJson } from '../lib/storage';

interface PrivacyAndDataViewProps {
  quizzes: Quiz[];
  onRestoreBackup: (quizzes: Quiz[]) => Promise<void>;
  onClearAllData: () => Promise<void>;
  onRestoreSamples: () => Promise<void>;
}

export const PrivacyAndDataView: React.FC<PrivacyAndDataViewProps> = ({
  quizzes,
  onRestoreBackup,
  onClearAllData,
  onRestoreSamples,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const handleExportLibrary = () => {
    const json = buildLibraryBackupJson(quizzes);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadTextFile(json, `quizdeck-library-backup-${stamp}.json`, 'application/json');
    setStatusMessage({
      type: 'success',
      text: `Exported backup of ${quizzes.length} ${quizzes.length === 1 ? 'quiz' : 'quizzes'}.`,
    });
  };

  const handleBackupFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const text = await file.text();
    const parsed = parseLibraryBackupJson(text);
    if (!parsed.ok) {
      setStatusMessage({ type: 'error', text: parsed.error || 'Could not read backup file.' });
      return;
    }

    await onRestoreBackup(parsed.quizzes);
    setStatusMessage({
      type: 'success',
      text: `Restored ${parsed.quizzes.length} ${parsed.quizzes.length === 1 ? 'quiz' : 'quizzes'} into your local library.`,
    });
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 border-b border-slate-200 pb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
          Local Data &amp; Privacy
        </h1>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          QuizDeck is designed as a local-first classroom utility. Understand where your files live
          and manage backups below.
        </p>
      </div>

      {statusMessage && (
        <div
          role="status"
          className={`mb-6 flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${
            statusMessage.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
              : 'border-red-200 bg-red-50 text-red-950'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" aria-hidden="true" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Privacy Posture Summary */}
      <section className="mb-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2 text-slate-900 font-semibold">
            <HardDrive className="h-4 w-4 text-blue-700" aria-hidden="true" />
            <h2>Where quizzes are stored</h2>
          </div>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            Your quizzes, question edits, and active presentation sessions are saved inside your
            browser’s local IndexedDB storage on this device. Clearing browser site data or using a
            private window will remove locally stored quizzes unless you export a backup.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2 text-slate-900 font-semibold">
            <ShieldCheck className="h-4 w-4 text-blue-700" aria-hidden="true" />
            <h2>Network &amp; presenter sync behavior</h2>
          </div>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            Once loaded, core quiz editing, file parsing, randomization, and presentation run
            entirely in your browser without uploading quiz content to any server. Separate-window
            presenter sync uses your browser’s local BroadcastChannel on the same computer and does
            not send data over the internet.
          </p>
        </div>
      </section>

      {/* Backup & Restore Actions */}
      <section className="mb-8 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-base font-semibold text-slate-950">Library Backup &amp; Restore</h2>
        <p className="mt-1 text-sm text-slate-600">
          Export all {quizzes.length} locally saved {quizzes.length === 1 ? 'quiz' : 'quizzes'} as a
          single JSON archive before clearing browser data or moving to another classroom computer.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleExportLibrary}
            disabled={quizzes.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors min-h-[44px]"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            <span>Export Full Backup (.json)</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50 transition-colors min-h-[44px]"
          >
            <Upload className="h-4 w-4 text-slate-600" aria-hidden="true" />
            <span>Restore from Backup</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleBackupFileChange}
            className="hidden"
            aria-label="Choose QuizDeck backup JSON file"
          />

          <button
            type="button"
            onClick={async () => {
              await onRestoreSamples();
              setStatusMessage({
                type: 'success',
                text: 'Sample classroom quizzes added to your library.',
              });
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors min-h-[44px]"
          >
            <RotateCcw className="h-4 w-4 text-slate-500" aria-hidden="true" />
            <span>Load Sample Quizzes</span>
          </button>
        </div>
      </section>

      {/* Danger Zone: Clear Local Data */}
      <section className="rounded-xl border border-red-200 bg-white p-6">
        <h2 className="text-base font-semibold text-red-900">Clear Local Data</h2>
        <p className="mt-1 text-sm text-slate-600">
          Remove all locally stored quizzes and saved presentation sessions from this browser.
          Useful when finishing a class on a shared podium computer.
        </p>
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-800 hover:bg-red-100 transition-colors min-h-[44px]"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            <span>Clear All Local Data</span>
          </button>
        </div>
      </section>

      {confirmClear && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="clear-data-heading"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <h2 id="clear-data-heading" className="text-lg font-bold text-slate-950">
              Clear all local QuizDeck data?
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              All {quizzes.length} quizzes and any active presentation session stored on this
              browser will be permanently deleted. This cannot be undone.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 min-h-[40px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await onClearAllData();
                  setConfirmClear(false);
                  setStatusMessage({
                    type: 'success',
                    text: 'All local quizzes and sessions have been cleared.',
                  });
                }}
                className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 min-h-[40px]"
              >
                Clear Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
