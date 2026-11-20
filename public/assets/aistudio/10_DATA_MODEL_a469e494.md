# 10 — Data Model

## 1. Design principles

- Stable IDs identify quizzes, questions and options.
- Correct answers reference option IDs.
- Presentation order is stored separately from canonical quiz order.
- A session references a quiz revision/snapshot.
- Schema versions enable future migrations.

## 2. Core entities

### Quiz

| Field | Type | Description |
|---|---|---|
| id | string | Stable unique identifier |
| schema_version | string | Data schema version |
| title | string | Quiz title |
| instructions | string | Optional instructions |
| questions | Question[] | Canonical question list |
| created_at | timestamp | Creation time |
| updated_at | timestamp | Last edit time |

### Question

| Field | Type | Description |
|---|---|---|
| id | string | Stable unique ID |
| type | string | Initially `multiple_choice` |
| text | string | Question content |
| options | Option[] | Available choices |
| correct_option_ids | string[] | Correct option IDs |
| explanation | string? | Optional rationale |
| section | string? | Optional category |
| points | number | Default 1 |
| original_number | number? | Imported/original number |

### Option

| Field | Type | Description |
|---|---|---|
| id | string | Stable option ID |
| text | string | Choice text |

### PresentationSession

| Field | Type | Description |
|---|---|---|
| id | string | Session ID |
| quiz_id | string | Source quiz ID |
| quiz_revision | string/number | Revision or snapshot reference |
| status | enum | setup/ready/presenting/paused/review/completed |
| question_order | string[] | Ordered question IDs |
| option_orders | map | Question ID → ordered option IDs |
| current_index | number | Active index in question_order |
| reveal_policy | enum | manual/after_each/after_entire_quiz |
| revealed_question_ids | string[] | Questions whose answers are revealed |
| settings | object | Display and timer settings |
| created_at | timestamp | Session creation |
| updated_at | timestamp | Last update |

## 3. Example session settings

```json
{
  "randomize_questions": true,
  "randomize_choices": true,
  "show_question_number": true,
  "show_progress": true,
  "auto_fit": true,
  "question_font_preference": 64,
  "choice_font_preference": 42,
  "layout_density": "balanced",
  "theme": "dark",
  "timer_enabled": false,
  "timer_seconds": null
}
```

Font values above are illustrative CSS-pixel preferences, not mandatory defaults.

## 4. Data integrity rules

- Every ID must be unique within its entity scope.
- Every correct option ID must exist in that question's options.
- Every session question ID must exist in the session's quiz snapshot.
- Every option order must contain each option ID exactly once.
- Current index must be within valid bounds or use a documented no-active-question sentinel.
- Reveal state must refer only to questions in the session.
- A session must not silently bind to a changed quiz revision.

## 5. Persistence and migrations

- Store a schema version on persisted records.
- Migrations must be deterministic and tested with fixture data.
- Preserve existing data when adding optional fields.
- If migration fails, do not silently delete the user's quiz library.
- Provide export/backup before risky migrations where practical.

## 6. Future extensibility

The model can later support:
- True/false
- Short answer
- Image-based questions
- Multiple-select
- Matching or ordering questions

Do not implement these question types until their editing, import, presentation, answer reveal and validation behavior are specified.
