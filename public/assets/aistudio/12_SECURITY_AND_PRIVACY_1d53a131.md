# 12 — Security and Privacy

## 1. Privacy posture

QuizDeck should be local-first. Quiz content, correct answers and session data should remain on the user's device unless the user explicitly exports or shares them.

Do not add accounts, cloud sync, analytics or remote storage to the MVP without a separate product decision and clear user disclosure.

## 2. File upload safety

- Accept only documented file types.
- Enforce reasonable file-size and processing limits.
- Validate file signatures/content where practical; do not trust extension alone.
- Treat imported text as untrusted data.
- Render text as text, not executable HTML.
- Sanitize or safely handle rich text and embedded content.
- Reject malformed or unexpectedly complex files gracefully.
- Do not execute macros, scripts or embedded objects.
- Avoid extracting external links or remote resources automatically.

## 3. Correct-answer visibility

The goal is to prevent accidental display of answers before the teacher reveals them. Keep teacher-only correctness state out of student-facing rendering paths where practical. Do not describe this as secure examination proctoring or tamper-proof secrecy: a local user with developer tools or access to the source quiz file may inspect locally stored data.

For a classroom presentation tool, the primary threat is accidental disclosure on the projector, not a hostile student with machine access.

## 4. Local storage

- Store only necessary data.
- Provide a way to export quiz backups.
- Provide a clear local data deletion action.
- Explain that clearing browser site data may remove local quizzes.
- Handle quota and persistence failures visibly.
- Do not store sensitive personal data in quiz metadata.

## 5. Network behavior

Core presentation operations should not call remote services. If a future remote presenter feature uses a local network, authenticate or pair devices appropriately and document the trust boundary.

Do not expose a local control server to the public internet by default.

## 6. Dependencies

- Prefer maintained, reputable libraries.
- Keep dependencies minimal.
- Review licenses and known vulnerabilities.
- Pin or lock dependency versions.
- Do not add a large parsing dependency unless its value is justified.
- Reassess dependencies before release.

## 7. Privacy disclosure

The app should clearly state:
- Where quizzes are stored
- Whether any data leaves the device
- How to export and delete local data
- Whether remote control uses a network connection

Do not claim that data never leaves the device until network behavior has been verified in the built application.
