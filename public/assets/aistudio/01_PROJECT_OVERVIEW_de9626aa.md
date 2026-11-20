# 01 — Project Overview

## 1. Product definition

**QuizDeck** is a browser-based classroom quiz preparation and presentation application. It converts teacher-authored quiz content into a controlled, readable, projector-friendly presentation. It is designed for teachers who want to prepare quizzes in familiar document or spreadsheet formats and present them without manually building a slide deck.

The application is not primarily a learning-management system, online examination platform, student response collector, or gradebook. Those are separate product directions and are outside the initial release.

## 2. Problem statement

Teachers commonly prepare questions in word processors or spreadsheets, then manually transfer them into slides. This creates repetitive work and introduces formatting problems. During presentation, long questions may overflow, text may be too small for a projector, and answer visibility may be difficult to control. A conventional slideshow also does not inherently provide quiz-aware randomization or an answer review mode.

QuizDeck should reduce preparation effort while giving the teacher reliable control over what students see and when they see it.

## 3. Product goals

1. Let a teacher download a structured quiz template, fill it in, and upload it.
2. Parse and validate the uploaded quiz before presentation.
3. Present one question at a time in a clean, high-contrast interface.
4. Provide controls comparable to a presentation remote: next, previous, jump, reveal, hide, pause and end.
5. Support manual and automatic text fitting, plus manual font-size controls.
6. Randomize question order and answer-choice order without changing correctness.
7. Allow answer reveal during presentation or after the entire quiz.
8. Provide a post-presentation answer review.
9. Preserve work locally and support offline use after the app has been loaded/installed, subject to browser/PWA limitations.
10. Keep the interface usable by a teacher operating a projector and laptop simultaneously.

## 4. Target users and context

Primary user: a teacher or instructor preparing and presenting classroom quizzes.

Typical environment:
- Laptop or desktop computer connected to a projector or large display
- Keyboard, mouse, or presentation clicker
- Optional second screen or second device for presenter controls
- Quiz content prepared in Microsoft Word, Excel, or a supported structured format
- Intermittent or unavailable internet access

The initial release should optimize for a single teacher and a single local quiz session. Multi-user collaboration is not an MVP requirement.

## 5. Product principles

- **Teacher control:** students should not see answers unless the selected reveal policy permits it.
- **Content integrity:** imported wording and answer mapping must be preserved.
- **Legibility:** content must remain readable at projector distance.
- **Predictability:** controls should behave consistently and be discoverable.
- **Recoverability:** accidental refreshes or navigation should not silently destroy a session.
- **Local-first:** quiz files should remain on the user's device unless the user explicitly exports or shares them.
- **Progressive complexity:** the default workflow should be simple; advanced controls should not overwhelm first-time users.

## 6. In-scope features

- Quiz template download and guidance
- Quiz file upload, parsing, validation and preview
- Manual editing of imported questions
- Question and answer choice presentation
- Fullscreen mode
- Presenter navigation and answer controls
- Manual/after-each/after-entire-quiz answer reveal policies
- Post-presentation answer review
- Question and choice randomization
- Adaptive typography and manual font scaling
- Optional timer
- Local save and session recovery
- Themes and accessibility options
- Export of a normalized quiz file

## 7. Out of scope for MVP

- Student accounts and sign-in
- Cloud quiz hosting
- Live student answer submissions
- Automatic grading of student responses
- LMS integrations
- AI-generated questions
- Real-time multi-teacher collaboration
- Public quiz marketplace
- Native mobile apps

These can be reconsidered only after the core presenter is stable.

## 8. Success measures

The MVP is successful when a teacher can:
- Download a template, fill it, upload it and see a correct preview.
- Start a presentation without manually creating slides.
- Navigate the quiz without clipped or unreadable text.
- Reveal answers according to the chosen policy.
- Randomize questions and choices while retaining correct answers.
- finish the presentation and review the correct answer key.
- Recover a saved local session after an accidental refresh.

Measure success through task completion, import error rate, presentation failures, text overflow defects and correctness of randomized answer mapping. Do not claim a metric is met until tested.
