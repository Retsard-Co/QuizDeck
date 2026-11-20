# 13 — Product Roadmap

## Guiding approach

Build a dependable presentation workflow before expanding into advanced classroom features. Keep releases small and testable. A solo developer should avoid implementing every optional feature in the first iteration.

## Phase 0 — Repository and requirements audit

Deliverables:
- Repository inventory
- Stack and build instructions
- Existing code risk assessment
- Requirements traceability
- Confirmed technology choices
- Initial implementation plan

Exit criteria:
- No unrelated files will be overwritten.
- Unresolved assumptions are documented.
- The developer approves the plan before broad implementation.

## Phase 1 — Core foundation

Features:
- App shell and navigation
- Canonical quiz model
- Local persistence
- JSON import/export
- Quiz library and editor
- Basic validation

Exit criteria:
- Create, edit, save, reopen and export a quiz.
- Unit tests cover model and validation rules.

## Phase 2 — Templates and import

Features:
- Downloadable JSON template
- CSV import/export if feasible
- XLSX template/import after selecting a stable library
- DOCX support only after a reliable parser/template strategy is validated
- Import preview and error report

Exit criteria:
- Generated templates round-trip through import.
- Invalid files do not corrupt existing data.

## Phase 3 — Presentation MVP

Features:
- Fullscreen question display
- Previous/next/jump
- Progress indicator
- Manual reveal
- After-each reveal
- After-entire-quiz review
- Keyboard shortcuts

Exit criteria:
- All three reveal policies pass acceptance tests.
- Answer review is correct.

## Phase 4 — Randomization and adaptive layout

Features:
- Random question order
- Random choice order
- Stable answer mapping
- Auto-fit typography
- Manual font-size controls
- Overflow warnings

Exit criteria:
- Randomization test matrix passes.
- Long-content display tests pass.

## Phase 5 — Presenter enhancements

Features:
- Dedicated presenter panel
- Separate presentation window if supported
- Optional timer
- Pause/resume
- Mark for revisit
- Themes and display density

Exit criteria:
- Presenter controls remain synchronized.
- Disconnect/recovery behavior is tested.

## Phase 6 — Offline and release hardening

Features:
- PWA installability
- Cached app shell
- Cold-start offline support
- Browser compatibility checks
- Accessibility audit
- Backup/restore
- Production build and release documentation

Exit criteria:
- Offline claims match actual tests.
- Regression suite and release gates pass.

## Later possibilities

Only consider after user validation:
- Image questions
- True/false and multiple-select
- Student response collection
- QR-based session joining
- LMS export/integration
- Quiz analytics and grading
- Cloud synchronization

These are not MVP commitments.
