# 14 — Development TODO Checklist

Update this file as work progresses. Mark an item complete only when its completion criteria have been verified. Link relevant commits, test reports or issue IDs where possible.

## P0 — Audit and foundation

- [ ] Inspect repository structure, stack, scripts and current build status.
  - Done when: audit summary identifies entry points, dependencies, tests and risks.
- [ ] Read all QuizDeck documentation and produce a requirements traceability matrix.
  - Done when: every P0 requirement maps to a module and test.
- [ ] Confirm application framework and persistence approach.
  - Done when: decision and rationale are recorded in `15_DECISIONS_AND_RISKS.md`.
- [ ] Define canonical Quiz, Question, Option and PresentationSession types.
  - Done when: schema is documented and unit tested.
- [ ] Implement stable IDs and correct-option ID references.
  - Done when: validation rejects missing or invalid references.
- [ ] Implement local quiz persistence.
  - Done when: create/edit/save/reopen works and failure is surfaced.
- [ ] Implement JSON import/export.
  - Done when: fixture round-trip preserves all supported fields.

## P0 — Quiz management

- [ ] Build quiz library/dashboard.
- [ ] Build quiz editor for title, instructions, questions and choices.
- [ ] Add correct-answer selection by stable option ID.
- [ ] Add question add/delete/duplicate/reorder.
- [ ] Implement import preview and validation report.
- [ ] Ensure failed imports do not replace the active quiz.
- [ ] Add sample quiz fixture and user-facing template instructions.

## P0 — Presentation

- [ ] Build student-facing presentation view.
- [ ] Implement previous/next/jump navigation.
- [ ] Implement question progress.
- [ ] Implement fullscreen and graceful fallback.
- [ ] Implement manual answer reveal/hide.
- [ ] Implement after-each reveal policy.
- [ ] Implement after-entire-quiz policy.
- [ ] Build post-presentation answer review.
- [ ] Ensure answer review preserves session order and choice order.
- [ ] Add keyboard shortcuts and shortcut help.
- [ ] Add end-session confirmation.

## P0 — Randomization and typography

- [ ] Implement question shuffle without mutating canonical quiz data.
- [ ] Implement choice shuffle per question.
- [ ] Persist generated order in the session.
- [ ] Verify correct-answer mapping after both shuffles.
- [ ] Implement natural text wrapping.
- [ ] Implement auto-fit for question text.
- [ ] Implement auto-fit for answer choices.
- [ ] Implement independent manual font-size controls.
- [ ] Add overflow detection/warning and safe fallback.
- [ ] Test projector resolutions and long-content fixtures.

## P0 — Quality

- [ ] Add unit tests for validation, shuffling and reveal policies.
- [ ] Add integration tests for import-to-presentation workflow.
- [ ] Add answer-key correctness regression tests.
- [ ] Add persistence and session-recovery tests.
- [ ] Run build, lint and test scripts.
- [ ] Fix all P0 defects before release.
- [ ] Update documentation to reflect actual implementation.

## P1 — File formats and presentation polish

- [ ] Implement CSV import/export.
- [ ] Implement XLSX template generation and import.
- [ ] Implement DOCX template generation and import, if reliable.
- [ ] Add import format compatibility fixtures.
- [ ] Add timer with pause/resume.
- [ ] Add question mark-for-review.
- [ ] Add theme and density controls.
- [ ] Add high-contrast mode.
- [ ] Add separate presenter control panel.
- [ ] Test separate-window synchronization if implemented.
- [ ] Add backup and restore workflow.

## P1 — Offline and accessibility

- [ ] Audit all network requests in core workflows.
- [ ] Remove runtime dependence on remote assets for presentation.
- [ ] Add PWA support if appropriate.
- [ ] Test offline reload/cold start.
- [ ] Test keyboard-only operation.
- [ ] Test focus indicators and screen-reader labels.
- [ ] Verify contrast and reduced-motion behavior.

## P2 — Future enhancements

- [ ] Evaluate additional question types.
- [ ] Evaluate image-based questions.
- [ ] Evaluate student response collection.
- [ ] Evaluate LMS integration.
- [ ] Evaluate optional cloud sync only if justified.

## Release checklist

- [ ] Every P0 item is complete.
- [ ] Critical acceptance criteria pass.
- [ ] No known answer-mapping defect remains.
- [ ] Supported import formats are clearly documented.
- [ ] Long text is not silently clipped.
- [ ] Backup/export path is available.
- [ ] Known limitations are disclosed.
- [ ] Build and regression results are recorded.
