# 09 — System Architecture

## 1. Architecture goals

- Keep quiz content separate from presentation state.
- Keep answer correctness independent from visible choice order.
- Make import/export adapters feed one canonical data model.
- Make presentation controls operate through a single session controller.
- Support local-first operation and future PWA/offline enhancements.
- Keep the MVP maintainable for a solo developer.

## 2. Proposed logical modules

1. **Application shell** — routing, global layout, settings.
2. **Quiz library** — create, list, open, duplicate, delete and save quizzes.
3. **Import/export** — file detection, parsing adapters, validation and serialization.
4. **Quiz editor** — question and option editing.
5. **Quiz domain model** — canonical questions, choices, answer IDs and metadata.
6. **Session manager** — session snapshot, order, reveal state and recovery.
7. **Presentation engine** — student display and navigation.
8. **Presenter controller** — teacher-facing actions and keyboard shortcuts.
9. **Typography/layout engine** — fit calculations and overflow warnings.
10. **Persistence layer** — local database/storage and migrations.
11. **Accessibility/theme layer** — contrast, density, focus and motion preferences.

## 3. Data flow

Import file → format adapter → normalized quiz object → validation → preview/editor → saved quiz.

Saved quiz + presentation settings → session snapshot → presentation engine → student display.

Presenter action → session controller → updated session state → student display and presenter controls.

Session snapshot → answer review. The answer review must not independently shuffle or infer correctness.

## 4. Technology selection

No repository or stack has been inspected as part of this documentation package. Antigravity must inspect the current workspace before choosing or changing technologies.

If starting from an empty repository, a reasonable candidate is:
- TypeScript
- A modern component-based web framework already familiar to the developer
- Browser-native APIs for fullscreen and keyboard controls
- IndexedDB for structured local data
- A tested library for XLSX/DOCX handling if those formats are implemented
- A PWA/service worker only after the core app is stable

These are candidate choices, not mandatory prescriptions. Avoid introducing multiple frameworks, state libraries or UI libraries without a demonstrated need.

## 5. Persistence

Prefer IndexedDB for quizzes and session snapshots. LocalStorage may hold small UI preferences only. Define:
- Schema version
- Migration strategy
- Save failure behavior
- Backup/export path
- Clear local data action

Do not store only the current question index if recovery also needs randomization and reveal state.

## 6. Offline behavior

Offline requirements should be staged:
- MVP: once the app and assets are loaded, all core quiz and presentation operations are local and make no network calls.
- P1: installable PWA and cached app shell.
- Verify cold-start offline behavior before claiming full offline support.

Do not require remote fonts, analytics, CDN scripts or network-hosted assets for core presentation.

## 7. Presenter synchronization

Same-window controls should use the app's single state store/controller.

For separate windows, select and document a mechanism after repository inspection. Options include BroadcastChannel or a controlled shared worker, depending on browser support and app structure. For a second physical device, a local server/WebSocket or other explicit transport may be needed. That is not equivalent to offline single-device operation.

## 8. Error boundaries and observability

Provide user-readable errors for:
- Import failures
- Persistence failures
- Unsupported browser features
- Presenter connection loss
- Invalid session state

Development logs may contain technical detail, but never log full quiz contents unnecessarily. Avoid adding analytics in the MVP.

## 9. Architectural constraints

- Domain logic should be testable without rendering UI.
- Import adapters should not directly mutate presentation state.
- Presentation components should not calculate correctness from visible labels.
- Randomization should be pure/testable and store its output.
- Avoid global mutable state where a small explicit session controller suffices.
- Keep the codebase simple; do not build a plugin system or generic workflow engine without a concrete need.
