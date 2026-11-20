# 07 — Randomization and Answer Mapping

## 1. Core invariant

**Correctness must be represented by stable option IDs, never by the option's current array position or visible letter.**

This is the most important integrity rule in the randomization system.

## 2. Canonical question representation

Each option has a stable ID:
- `a` — original option A
- `b` — original option B
- `c` — original option C
- `d` — original option D

The question stores `correct_option_ids`, for example `["b"]`. The session stores a display order, for example `["d", "b", "a", "c"]`.

The correct answer is still option ID `b`, even though it appears second in the shuffled display.

## 3. Question randomization

- Randomize an array of question IDs or question references.
- Do not reorder or mutate the canonical source quiz.
- Preserve original question number/ID as metadata.
- Display either original number, presentation position, or both according to settings.
- Use a session snapshot so refresh/resume preserves the exact order.
- Optional seeded randomization may be added for reproducibility.

## 4. Choice randomization

- Randomize option IDs per question.
- Store the resulting option order in the session.
- Render choices by looking up option IDs in the canonical question.
- Determine correctness by comparing option ID with `correct_option_ids`.
- Recompute visible labels (A, B, C, D) from the shuffled display position.
- In answer review, use the same session option order unless the teacher explicitly chooses original order.

## 5. Combined randomization

Question order and choice order are independent settings. Either may be enabled without the other. Both may be enabled simultaneously.

The answer review must reflect:
- The session question order
- The session option order
- The correct option IDs
- Any original-number metadata

## 6. Multiple correct answers

The initial MVP may restrict multiple-choice questions to one correct answer. The data model should nevertheless use an array of correct option IDs so multiple-select support can be added without a breaking redesign.

If multiple correct answers are not supported by the UI, validation must reject or clearly flag them rather than silently selecting one.

## 7. Randomization algorithm

Use a well-understood unbiased shuffle such as Fisher–Yates with a suitable random source. Avoid sorting by a random comparator; that does not guarantee an unbiased shuffle.

If a seed is supported:
- Store the seed and algorithm/version.
- Do not assume a seed alone guarantees identical output across changed algorithms.
- Store the actual generated orders as the authoritative session state.

## 8. Required tests

- Shuffle questions only; verify answer correctness.
- Shuffle choices only; verify answer correctness.
- Shuffle both; verify answer correctness.
- Include correct answer originally at A, B, C and D.
- Include a question with optional empty choices.
- Include a multiple-correct fixture if supported.
- Reload/resume and verify order is unchanged.
- Review answer key and verify it matches the presented order.
- Repeat randomization and verify that canonical quiz data is unchanged.

A release is blocked by any incorrect answer mapping.
