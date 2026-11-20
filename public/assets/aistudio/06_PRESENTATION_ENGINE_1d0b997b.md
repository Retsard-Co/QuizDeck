# 06 — Presentation Engine

## 1. Responsibilities

The presentation engine owns the active session state and exposes a controlled interface to the student display and presenter controls. It must not independently reinterpret quiz correctness. It reads normalized question and choice data from the canonical quiz model and the session's display order.

## 2. Session states

Suggested states:
- `setup`
- `ready`
- `presenting`
- `paused`
- `answer_review`
- `completed`

Transitions must be explicit. Ending a presentation should ask for confirmation if the teacher may have selected it accidentally.

## 3. Question display state

For the active question, track:
- Canonical question ID
- Position in presentation order
- Whether the answer is revealed
- Whether the question is marked for revisit
- Timer state and remaining time, if enabled
- Any teacher-only notes, if later supported

The active presentation index is not the canonical question number. Preserve both.

## 4. Answer reveal policies

### Manual

- Answers remain hidden by default.
- Teacher presses Reveal Answer.
- Teacher may hide it again if permitted by the configuration.
- Advancing does not automatically reveal an answer.

### After Each Question

Recommended interaction:
1. Question is displayed with answer hidden.
2. Teacher gives students time to respond.
3. Teacher presses Reveal Answer.
4. Correct choice is highlighted.
5. Teacher presses Next to continue.

The policy means answers are reviewed after each question, not that the app should reveal them immediately on first render.

### After Entire Quiz

- Answers remain hidden during question presentation.
- On completion, enter answer review.
- Teacher can reveal one answer at a time or all answers.
- The review must use the same shuffled question and choice order as the session.

## 5. Presenter navigation

Required actions:
- `goToNextQuestion`
- `goToPreviousQuestion`
- `goToQuestion(index)`
- `revealAnswer`
- `hideAnswer`
- `pauseSession`
- `resumeSession`
- `finishPresentation`
- `openAnswerReview`

Guard conditions:
- Do not navigate outside valid bounds.
- Do not reveal an answer when no valid question is active.
- Do not mutate the quiz source when moving through a session.
- Do not reset randomization when resuming.
- Do not silently skip a question on a timer unless the teacher enabled that behavior.

## 6. Presentation controls / remote

MVP may provide presenter controls in the same app window. A separate browser window is a useful P1 enhancement. A second physical device requires a communication mechanism and may require a local network; it must be separately designed and tested.

If using a separate window:
- Establish a session identifier.
- Synchronize state through a single authoritative controller.
- Prevent stale commands from moving the session backward unexpectedly.
- Handle window closure and reconnection.
- Keep keyboard controls on the main presenter window as a fallback.

Do not claim cross-device remote functionality based solely on a same-window control panel.

## 7. Timer

Timer is optional and off by default.
- Allow a configurable duration per question.
- Show pause/resume.
- Define behavior at zero: notify teacher by default; do not auto-advance unless enabled.
- Timer expiration must not reveal answers.
- Persist timer state carefully; wall-clock restoration after refresh must be explicit.

## 8. End and answer review

At the final question, show an explicit Finish action. On finish:
- Apply selected reveal policy.
- Preserve session order and option order.
- Show the answer review.
- Allow one-at-a-time or all-at-once review.
- Allow returning to a question without rebuilding or rerandomizing the session.
- Mark the session completed only after the teacher confirms completion or exits review.

## 9. State persistence

Persist enough information to recover:
- Quiz ID and quiz revision
- Session ID
- Question order
- Option order per question
- Current presentation index
- Reveal policy
- Reveal state
- Timer configuration/state
- Session status

If the quiz is edited after a session is created, the app should not silently apply edits to the active session. It should retain the session snapshot or ask the teacher to restart.
