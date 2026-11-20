# 15 — Decisions and Risks

## 1. Current assumptions

These are planning assumptions, not confirmed implementation facts.

| ID | Assumption | Validation needed |
|---|---|---|
| A-01 | Initial users are teachers presenting to a classroom. | Confirm through user feedback. |
| A-02 | The first question type is multiple choice. | Confirm desired initial scope. |
| A-03 | JSON is the canonical interchange format. | Confirm after stack audit. |
| A-04 | Local-first storage is preferred. | Confirm persistence and backup requirements. |
| A-05 | A single teacher controls the presentation. | Confirm whether student devices are needed. |
| A-06 | The primary display is a 16:9 projector. | Test common classroom resolutions. |

## 2. Proposed decisions

### D-01 — Stable option IDs
**Proposal:** Correct answers reference option IDs, never displayed letters or positions.

**Reason:** Required to preserve correctness through randomization.

**Status:** Required design constraint.

### D-02 — Separate quiz and session models
**Proposal:** Keep canonical quiz content separate from session order, reveal state and timer state.

**Reason:** Prevents presentation actions from mutating source quiz data.

**Status:** Required design constraint.

### D-03 — JSON first
**Proposal:** Implement JSON import/export first, then CSV/XLSX/DOCX based on value and library reliability.

**Reason:** Structured JSON is easier to validate and test. DOCX parsing has more layout ambiguity.

**Status:** Proposed; confirm after repository audit.

### D-04 — Teacher-triggered after-each reveal
**Proposal:** In after-each mode, teacher explicitly reveals the answer and then advances.

**Reason:** Avoids answers appearing before students have time to respond.

**Status:** Recommended default.

### D-05 — Auto-fit with manual preference
**Proposal:** Manual size sets preferred size; auto-fit may reduce it to avoid overflow.

**Reason:** Combines teacher control with safe projector layout.

**Status:** Recommended default.

## 3. Main risks

| Risk | Impact | Mitigation |
|---|---|---|
| DOCX layout varies between editors | Import errors or lost structure | Use strict template, explicit fields, fixtures and preview |
| XLSX parser edge cases | Incorrect field mapping | Validate headers, sheet names and cell types |
| Randomization breaks answer key | Incorrect teaching result | Stable option IDs and permutation tests |
| Long text clips | Students miss content | Auto-fit, wrap, overflow detection and long-content tests |
| Presenter windows desynchronize | Teacher loses control | Single authoritative session controller and reconnect tests |
| Browser storage is cleared | Quiz loss | Export/backup and clear storage warning |
| Offline claim is overstated | App fails without internet | Test cold-start offline behavior |
| Feature scope grows too quickly | Delayed MVP | Enforce phased roadmap and P0/P1/P2 priorities |

## 4. Open questions

Resolve these through product decisions, not guesses:
1. Should DOCX and XLSX both be available in the first release, or should JSON/CSV come first?
2. Should the presenter remote operate only in another window on the same computer, or must it work from a second device?
3. Should the answer review default to original question order or randomized presentation order? Recommended default: presentation order, with an optional original-order view.
4. Should the app support multiple correct choices in the MVP?
5. Should teachers be able to add images to questions in the first release?
6. Should the app support printing an answer key or quiz handout?

## 5. Change control

When a requirement or technical decision changes:
- Record the date and reason.
- Identify affected documents and tests.
- Update the TODO list and acceptance criteria.
- Avoid silently changing behavior during implementation.
