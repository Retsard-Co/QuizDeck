# 04 — UI/UX Specification

## 1. Design direction

Use a clean, restrained, professional interface. It should feel like a classroom utility rather than a game-show interface. Avoid excessive animation, gradients, decorative clutter and tiny controls. The student-facing presentation must prioritize legibility over dashboard density.

## 2. Main application areas

### A. Home / dashboard

Primary actions:
- Create quiz
- Import quiz
- Download template
- Open recent quizzes
- Resume recent presentation

Show recent items only when local data exists. Provide a clear empty state for first-time users.

### B. Quiz editor / import review

Required elements:
- Quiz title and instructions
- Question list/navigation
- Question text editor
- Choice editor
- Correct-answer selector
- Optional explanation field
- Section/category field
- Validation status
- Add, duplicate, delete and reorder question actions
- Import warnings and errors

The editor must distinguish a correct answer from the answer text itself. Do not infer correctness from option position after import.

### C. Presentation setup

Use a focused configuration page with grouped settings:
- Order and randomization
- Answer reveal policy
- Typography and auto-fit
- Theme and display density
- Timer and progress visibility

Show a preview and a short summary of selected settings before starting.

### D. Student-facing presentation

Recommended layout:
1. Header: quiz title and optional section
2. Progress: question number/count or progress bar
3. Main question area: large readable text
4. Choices: clearly separated, consistently aligned cards/rows
5. Footer: optional timer and unobtrusive status

The presentation must not expose correct-answer metadata in the visible UI before reveal. Do not merely hide the answer with CSS if the student-facing view can inspect the underlying DOM or state; the security goal here is accidental disclosure prevention, not protection against a technically sophisticated local user.

### E. Presenter controls

Controls:
- Previous
- Next
- Jump to question
- Reveal answer
- Hide answer (when allowed)
- Pause/resume
- End presentation
- Open answer review
- Font increase/decrease
- Toggle auto-fit
- Toggle fullscreen

Display connection status if using a separate presentation window or device.

### F. Answer review

Support:
- One-question-at-a-time review
- Reveal all answers
- Correct answer clearly marked
- Optional explanation
- Original question number and presentation order
- Return to presentation or exit

## 3. Interaction rules

- Destructive actions require confirmation.
- The Next action at the final question should not silently end the session.
- Previous at the first question should be disabled or provide clear feedback.
- Reveal action must provide visible state feedback.
- Randomization settings must be locked once the session begins, unless the teacher explicitly restarts the session.
- A teacher must be able to recover from accidental fullscreen exit.
- Do not make essential controls depend on hover.
- Avoid controls smaller than comfortable pointer/touch targets; aim for approximately 44 CSS pixels where practical.

## 4. Keyboard shortcuts

Suggested defaults; verify conflicts with browser/system shortcuts:
- Right Arrow / Page Down: Next question
- Left Arrow / Page Up: Previous question
- Space: Next question when focus is not inside an editable control
- R: Reveal answer
- H: Hide answer
- F: Toggle fullscreen
- Escape: Exit fullscreen or close a non-destructive overlay
- P: Pause/resume timer
- Home: First question
- End: Last question

Show a shortcut help panel. Allow disabling or remapping if conflicts are reported. Ignore shortcuts while typing in an input, textarea or content-editable element.

## 5. Responsive and display behavior

- Target 16:9 projector layouts first, while supporting 4:3 and browser-window layouts.
- Presentation content must remain within safe margins.
- The presentation should resize when the window changes dimensions.
- Avoid relying on fixed pixel positions for question content.
- Presenter controls may use a denser layout than the student display.
- On a single screen, provide an easy way to switch between presenter controls and student display.

## 6. Visual accessibility

- Maintain strong text/background contrast.
- Never use color as the only indicator of correctness.
- Use clear focus indicators.
- Support keyboard-only operation.
- Provide reduced-motion behavior.
- Do not use rapid flashing or distracting transitions.
- Ensure answer reveal is communicated with text/icon/shape, not color alone.
