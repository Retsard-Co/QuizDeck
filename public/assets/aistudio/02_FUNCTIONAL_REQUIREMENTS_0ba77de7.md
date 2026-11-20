# 02 — Functional Requirements

## 1. Priority definitions

- **P0 — MVP blocker:** required before the first usable release.
- **P1 — important:** expected soon after MVP or included if low risk.
- **P2 — later:** valuable enhancement, not a release blocker.

## 2. Quiz creation and file handling

| ID | Priority | Requirement |
|---|---|---|
| FR-001 | P0 | The app MUST provide downloadable blank quiz templates. |
| FR-002 | P0 | The app MUST accept a supported quiz file and show import progress/result. |
| FR-003 | P0 | The app MUST parse question text, choices and correct-answer references. |
| FR-004 | P0 | The app MUST validate required fields and report row/question-specific errors. |
| FR-005 | P0 | The app MUST show an editable preview before presentation. |
| FR-006 | P0 | The teacher MUST be able to correct imported content in the app. |
| FR-007 | P0 | The app MUST support a documented JSON format as the canonical interchange format. |
| FR-008 | P1 | The app SHOULD support DOCX and XLSX templates/imports. |
| FR-009 | P1 | The app SHOULD support CSV import/export for simple quizzes. |
| FR-010 | P1 | The app SHOULD export a normalized quiz to JSON. |
| FR-011 | P1 | The app SHOULD allow quiz title, instructions, section and metadata editing. |

## 3. Presentation

| ID | Priority | Requirement |
|---|---|---|
| FR-020 | P0 | The app MUST provide a dedicated presentation view. |
| FR-021 | P0 | The presentation MUST support fullscreen mode. |
| FR-022 | P0 | The teacher MUST be able to move to previous and next questions. |
| FR-023 | P0 | The teacher MUST be able to jump to a selected question. |
| FR-024 | P0 | The app MUST show question progress, such as 4 of 30. |
| FR-025 | P0 | The app MUST support answer reveal and hide controls. |
| FR-026 | P0 | The app MUST support the three answer reveal policies defined in the presentation specification. |
| FR-027 | P0 | The app MUST provide a post-presentation answer review. |
| FR-028 | P1 | The app SHOULD support optional per-question timers. |
| FR-029 | P1 | The app SHOULD support pause/resume and presentation end confirmation. |
| FR-030 | P1 | The app SHOULD support a presentation overview or question navigator. |

## 4. Presenter controls

| ID | Priority | Requirement |
|---|---|---|
| FR-040 | P0 | The app MUST support keyboard navigation. |
| FR-041 | P0 | The app MUST show a shortcut reference. |
| FR-042 | P1 | The app SHOULD provide a presenter control panel separate from the student-facing display. |
| FR-043 | P1 | The app SHOULD support a second browser window/device where feasible. |
| FR-044 | P1 | The teacher MUST receive clear feedback when a remote connection is unavailable. |
| FR-045 | P2 | The app MAY support configurable keyboard/clicker mappings. |

## 5. Randomization

| ID | Priority | Requirement |
|---|---|---|
| FR-050 | P0 | The teacher MUST be able to randomize question order before starting. |
| FR-051 | P0 | The teacher MUST be able to randomize answer choices independently. |
| FR-052 | P0 | Correct-answer mapping MUST remain correct after either or both randomization operations. |
| FR-053 | P1 | The app SHOULD allow a fixed random seed or saved randomized order for reproducibility. |
| FR-054 | P1 | The app SHOULD allow selected sections to be randomized independently. |

## 6. Typography and display

| ID | Priority | Requirement |
|---|---|---|
| FR-060 | P0 | Question and choice text MUST wrap naturally. |
| FR-061 | P0 | The presentation MUST prevent content from being clipped or rendered outside its content region. |
| FR-062 | P0 | The teacher MUST be able to increase/decrease question and choice font sizes independently. |
| FR-063 | P0 | The app MUST provide automatic fit behavior for long content. |
| FR-064 | P1 | The app SHOULD offer compact, balanced and spacious density settings. |
| FR-065 | P1 | The app SHOULD provide high-contrast and light/dark themes. |
| FR-066 | P1 | The app SHOULD support optional hiding of question numbers and progress. |

## 7. Persistence and resilience

| ID | Priority | Requirement |
|---|---|---|
| FR-070 | P0 | The app MUST preserve the current quiz in local storage or an equivalent local persistence layer. |
| FR-071 | P0 | The app MUST preserve presentation progress when practical and disclose any recovery limitations. |
| FR-072 | P1 | The app SHOULD support explicit save/export and restore/import. |
| FR-073 | P1 | The app SHOULD warn before discarding unsaved edits or ending a session. |

## 8. Validation and error handling

The app must detect, at minimum:
- Empty quiz
- Missing question text
- Missing choice labels or choice text
- Duplicate question identifiers
- Correct answer pointing to a nonexistent choice
- Unsupported file type
- Corrupt or unreadable file
- Ambiguous template columns/headers
- Unsupported question type

Errors must identify the affected question or row and suggest a corrective action. A failed import must not replace the last valid quiz.

## 9. Non-functional requirements

- The core presentation should remain responsive on a typical classroom laptop.
- The presentation must work at common 16:9 resolutions and adapt to other aspect ratios.
- All essential controls must be keyboard accessible.
- No network request should be required to reveal answers or navigate a locally loaded quiz.
- The application must not upload quiz contents without explicit user action.
- A production build must be tested in the browsers declared as supported by the project.
