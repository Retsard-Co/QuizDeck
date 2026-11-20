# QuizDeck — Documentation Package

**Purpose:** Product and engineering specification for a local-first classroom quiz preparation and presentation website.

## Package contents

- `docs/01_PROJECT_OVERVIEW.md` — product vision, goals, scope and principles
- `docs/02_FUNCTIONAL_REQUIREMENTS.md` — functional requirements and priorities
- `docs/03_USER_WORKFLOWS.md` — teacher workflows and key journeys
- `docs/04_UI_UX_SPECIFICATION.md` — screens, interaction and visual requirements
- `docs/05_QUIZ_TEMPLATE_SPECIFICATION.md` — template formats, import/export contract
- `docs/06_PRESENTATION_ENGINE.md` — presentation state, controls and answer reveal
- `docs/07_RANDOMIZATION_AND_ANSWER_MAPPING.md` — safe randomization rules
- `docs/08_ADAPTIVE_TYPOGRAPHY.md` — font sizing, fit and overflow behavior
- `docs/09_SYSTEM_ARCHITECTURE.md` — proposed application architecture
- `docs/10_DATA_MODEL.md` — canonical quiz and session model
- `docs/11_TESTING_AND_ACCEPTANCE.md` — test strategy and release gates
- `docs/12_SECURITY_AND_PRIVACY.md` — local data, file handling and privacy
- `docs/13_ROADMAP.md` — staged delivery plan
- `docs/14_TODO_CHECKLIST.md` — prioritized implementation checklist
- `docs/15_DECISIONS_AND_RISKS.md` — assumptions, decisions and open questions
- `ANTIGRAVITY_MASTER_PROMPT.md` — implementation prompt for Antigravity

## How to use this package

1. Place the `QuizDeck` folder in the project workspace or repository.
2. Give Antigravity the complete folder as project context.
3. Start with `ANTIGRAVITY_MASTER_PROMPT.md`.
4. Require Antigravity to read the README and every document in `docs/` before proposing implementation.
5. Ask it to inspect the repository and produce a baseline audit and implementation plan before modifying code.
6. Work through `docs/14_TODO_CHECKLIST.md` in priority order. Update checkboxes only after verification.
7. Record approved changes to requirements or architecture in `docs/15_DECISIONS_AND_RISKS.md`.

## Product summary

QuizDeck helps a teacher create or import a quiz, validate it, present questions on a classroom display, control the presentation from a presenter interface, and reveal the answer key during or after the presentation.

A central requirement is that **answer reveal is teacher-controlled**. The supported policies are:
- Manual reveal at the teacher's discretion
- Reveal after each question
- Reveal only after the entire quiz

The final review stage can display the answer key one question at a time or all at once. Randomized questions and choices must never corrupt answer correctness.

## Scope and implementation notes

This package is a specification, not evidence that an application has already been implemented. Technology choices are proposed defaults and must be confirmed after repository inspection. DOCX/XLSX parsing, multi-window remote control, browser support and offline behavior require explicit tests.

## Requirement language

- **MUST**: required for the stated release or acceptance gate.
- **SHOULD**: strongly recommended; deviations require a documented reason.
- **MAY**: optional or later enhancement.
- **MVP**: minimum viable product.
