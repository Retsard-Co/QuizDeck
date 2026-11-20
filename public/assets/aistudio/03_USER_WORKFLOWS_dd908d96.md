# 03 — User Workflows

## Workflow A: Create a quiz using a website template

1. Teacher opens QuizDeck.
2. Teacher chooses **Create / Import Quiz**.
3. Teacher selects a template format (recommended: XLSX or DOCX) and downloads it.
4. The template includes a sample row/question and clear instructions.
5. Teacher fills in the title, instructions, question text, choices and correct answer.
6. Teacher returns to QuizDeck and uploads the completed file.
7. QuizDeck parses the file and displays an import summary.
8. Teacher reviews all questions, corrects any warnings and confirms the quiz.
9. Teacher saves the quiz locally or exports a JSON backup.

**Expected result:** a normalized quiz is ready to configure and present.

## Workflow B: Import an existing quiz

1. Teacher selects **Import Quiz**.
2. Teacher chooses a supported file.
3. QuizDeck identifies the format and parses the file.
4. QuizDeck reports recognized questions, skipped rows and errors.
5. Teacher inspects the preview.
6. Teacher corrects any incomplete question or answer mapping.
7. Teacher confirms import.

The import process must be non-destructive. If parsing fails, the previously loaded quiz remains intact.

## Workflow C: Configure presentation

Before starting, the teacher chooses:
- Question order: original or randomized
- Answer choices: original or randomized
- Answer reveal policy:
  - Manual
  - After each question
  - After entire quiz
- Question and choice text size
- Auto-fit on/off (default on)
- Theme and density
- Timer (off by default)
- Whether to show question number and progress

The app should present a concise configuration summary before launch.

## Workflow D: Present with manual answer reveal

1. Teacher starts presentation.
2. Student-facing screen displays the first question and its choices.
3. Teacher navigates using keyboard, clicker or presenter controls.
4. When ready, teacher selects **Reveal Answer**.
5. The correct answer is visually distinguished.
6. Teacher may hide it again if the selected policy allows.
7. Teacher continues to the next question.

Manual reveal must not happen automatically merely because the teacher advances.

## Workflow E: Reveal after each question

1. Teacher selects **After Each Question** before starting.
2. The question is displayed without the answer.
3. Teacher advances or selects **Reveal / Continue** according to the configured interaction.
4. The correct answer is revealed before the next question is shown.
5. The teacher continues.

The exact transition should be configurable or at least clearly communicated. Recommended default: teacher explicitly presses **Reveal Answer**, then **Next Question**. This avoids revealing an answer before students have had time to respond.

## Workflow F: Reveal after the entire quiz

1. Teacher selects **After Entire Quiz**.
2. Answers remain hidden throughout the question presentation.
3. The teacher finishes the last question and selects **End Presentation**.
4. QuizDeck enters the answer review screen.
5. Teacher chooses one-at-a-time review or reveal all.
6. Teacher may navigate the review and return to a question if desired.

The answer review must use the same randomized order and choice mapping that were used during presentation.

## Workflow G: Presenter remote

1. Teacher starts the presentation display.
2. Teacher opens the presenter control panel.
3. The panel connects to the presentation session.
4. Teacher uses Previous, Next, Reveal, Hide, Jump, Pause and End controls.
5. The student-facing display updates.
6. If the remote disconnects, the presentation continues and local keyboard controls remain available.

For MVP, a same-browser control panel is sufficient. A second device may require a local network connection or a deliberately designed synchronization channel; do not imply it works offline across devices unless implemented and tested.

## Workflow H: Recover a session

1. Teacher reloads or reopens QuizDeck.
2. The app detects a recoverable local session.
3. Teacher sees the quiz title, saved time and last question.
4. Teacher chooses Resume or Discard.
5. Resume restores the quiz configuration and presentation state as accurately as possible.

Do not restore an answer as visible if the saved reveal policy or state indicates it should be hidden.

## Workflow I: Export and reuse

Teacher exports the quiz as JSON or another supported format. A later import should reconstruct question content, choices, answer mapping, section data and supported metadata. Session-specific data should be exported separately or explicitly included only when requested.
