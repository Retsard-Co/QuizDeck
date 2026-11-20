# 11 — Testing and Acceptance Criteria

## 1. Testing layers

### Unit tests
Test domain rules without UI:
- Quiz validation
- Correct-answer ID resolution
- Question shuffle
- Choice shuffle
- Session transitions
- Reveal policy
- Import normalization
- Typography fit calculations where deterministic

### Component tests
Test:
- Question display
- Choice display
- Reveal/hide states
- Presenter buttons
- Keyboard shortcuts
- Font controls
- Validation messages

### Integration tests
Test:
- Template/import/preview workflow
- Save and reopen quiz
- Start session and navigate
- Randomize and reveal answers
- Finish and review answer key
- Refresh and recover session

### End-to-end tests
Use representative browser workflows on supported browsers and target display sizes.

## 2. Critical acceptance criteria

### AC-01 Template workflow
Given a generated supported template filled with valid quiz data, when the teacher uploads it, then all supported questions, choices and answer references are imported accurately.

### AC-02 Import failure safety
Given an invalid or corrupt file, when import fails, then the active quiz and saved quizzes remain unchanged and the teacher sees a useful error.

### AC-03 Presentation navigation
Given a valid quiz session, when the teacher uses previous, next or jump, then the correct question in the session order is displayed.

### AC-04 Manual reveal
Given manual reveal policy, when a question is displayed, then the answer remains hidden until the teacher explicitly reveals it.

### AC-05 After-each reveal
Given after-each policy, when the teacher completes the response interval and reveals the answer, then the correct choice is shown before proceeding.

### AC-06 After-entire-quiz reveal
Given after-entire-quiz policy, then no answer is revealed during the question run and the answer review is available after finishing.

### AC-07 Randomized answer mapping
Given question and choice randomization, then the displayed correct choice and final answer key match the original correct option IDs.

### AC-08 Adaptive text
Given a long question or choice, then content wraps and fits or a clear overflow warning/scroll behavior is provided. No text is silently clipped.

### AC-09 Session recovery
Given a saved active session, when the app is refreshed and reopened, then the app restores the session order, current question and reveal policy/state accurately.

### AC-10 Keyboard access
Given the presentation, then all essential actions can be performed by keyboard and shortcuts do not interfere with text editing.

## 3. Import fixtures

Include fixtures for:
- Minimal valid quiz
- 50-question quiz
- Long question and long choices
- Unicode characters
- Multiline text
- Missing question
- Missing option
- Invalid correct answer
- Duplicate IDs
- Corrupt file
- Unsupported file type
- Empty quiz

## 4. Randomization test matrix

| Question shuffle | Choice shuffle | Expected |
|---|---|---|
| Off | Off | Original order and answer |
| On | Off | Question order changes; answer remains correct |
| Off | On | Choice order changes; correct ID remains correct |
| On | On | Both orders change; answer key remains correct |

Do not rely on a single random run to prove the shuffle is correct. Test invariants over many generated permutations with deterministic seeds where possible.

## 5. Display test matrix

Test 1920×1080, 1366×768, 1280×720 and 1024×768, plus browser resizing and zoom. Test short and long content. Confirm that the last line of every question and choice remains visible.

## 6. Performance and reliability

Set performance budgets after profiling on a representative classroom laptop. At minimum:
- Navigation should feel immediate.
- Large quiz import should provide progress or a responsive UI.
- Autosave should not block presentation.
- A failed save must be visible to the teacher.
- Presentation should not depend on network connectivity once quiz data is loaded.

## 7. Release gates

Do not call the MVP ready until:
- All P0 requirements are implemented.
- All critical acceptance criteria pass.
- No known answer-mapping defect remains.
- Supported import formats pass fixture tests.
- Presentation overflow tests pass.
- Build and regression tests pass.
- Documentation matches the shipped behavior.
