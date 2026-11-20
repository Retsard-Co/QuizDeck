import React from 'react';
import { Plus } from 'lucide-react';

export type AppRoute =
  | 'library'
  | 'import'
  | 'templates'
  | 'privacy'
  | 'editor'
  | 'setup'
  | 'present'
  | 'review';

interface TopBarProps {
  currentRoute: AppRoute;
  onNavigate: (route: 'library' | 'import' | 'templates' | 'privacy') => void;
  onCreateNewQuiz: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentRoute,
  onNavigate,
  onCreateNewQuiz,
}) => {
  const navItems: Array<{ id: 'library' | 'import' | 'templates' | 'privacy'; label: string }> = [
    { id: 'library', label: 'Library' },
    { id: 'import', label: 'Import' },
    { id: 'templates', label: 'Templates' },
    { id: 'privacy', label: 'Privacy' },
  ];

  const activeNavId =
    currentRoute === 'editor' || currentRoute === 'setup' ? 'library' : currentRoute;

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 sm:gap-6 lg:gap-8 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => onNavigate('library')}
          className="text-lg font-bold tracking-tight text-slate-900 hover:text-blue-700 transition-colors whitespace-nowrap shrink-0 min-h-[40px] flex items-center"
        >
          QuizDeck
        </button>

        {/* Zone 2: Clean single-line text nav links */}
        <nav
          aria-label="Primary navigation"
          className="flex items-center gap-3.5 sm:gap-6 overflow-x-auto"
        >
          {navItems.map((item) => {
            const isActive = activeNavId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`relative py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 min-h-[40px] flex items-center ${
                  isActive
                    ? 'text-slate-950 font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-0.5 bg-blue-700"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onCreateNewQuiz}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>New Quiz</span>
          </button>
        </div>
      </div>
    </header>
  );
};
