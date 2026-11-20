# 05 — Quiz Template Specification

## 1. Canonical format

JSON is the canonical internal and interchange format. DOCX, XLSX and CSV are convenience formats. All importers must normalize content into the same internal quiz model before validation and presentation.

Do not make the DOCX/XLSX layout itself the canonical data model. Template parsing is inherently more fragile than parsing structured JSON.

## 2. Supported formats and release recommendation

| Format | Purpose | Recommended release |
|---|---|---|
| JSON | Lossless interchange and backup | MVP |
| CSV | Simple tabular question import/export | MVP or early P1 |
| XLSX | Teacher-friendly spreadsheet template | P1 |
| DOCX | Familiar Word quiz template | P1; higher parsing complexity |

If the existing repository or available libraries make a format impractical, document the decision. Do not advertise a format until its parser and generated template have passed round-trip tests.

## 3. Recommended spreadsheet columns

Use a single worksheet named `Questions` with these columns:

| Column | Required | Meaning |
|---|---|---|
| question_id | Recommended | Stable unique ID |
| question | Yes | Question text |
| option_a | For MCQ | Choice A |
| option_b | For MCQ | Choice B |
| option_c | Optional | Choice C |
| option_d | Optional | Choice D |
| correct_answer | Yes for scored MCQ | One or more option IDs/labels |
| explanation | No | Optional rationale |
| section | No | Section/category |
| question_type | Yes | `multiple_choice` initially |
| points | No | Default 1 |

Template instructions must state that `correct_answer` refers to the original option label, not the option's current display position.

## 4. CSV rules

- UTF-8 encoding is recommended.
- First row contains exact documented headers.
- Quoted fields may contain commas, quotes and line breaks.
- Empty optional choices are allowed.
- Empty required question text is invalid.
- Correct answer must reference an existing option.
- Do not split CSV by commas manually; use a standards-compliant parser.

## 5. DOCX template rules

A DOCX template should use a stable structure that the importer can identify:
- Document title and optional instructions section
- One question per numbered block
- Choice lines with explicit labels (A), (B), (C), (D)
- Correct answer represented in a dedicated answer-key section or explicit metadata table
- Optional explanation field

Avoid relying only on visual formatting such as bold, underline, font color or highlight to identify the correct answer. Those styles can be lost during editing or conversion.

The generated DOCX template must include instructions and one clearly labeled sample question. The parser must be tested against files saved by supported versions of Microsoft Word and compatible office suites where practical.

## 6. Canonical JSON example

```json
{
  "schema_version": "1.0",
  "quiz": {
    "id": "quiz-example",
    "title": "Introduction to Computing",
    "instructions": "Choose the best answer.",
    "questions": [
      {
        "id": "q1",
        "type": "multiple_choice",
        "text": "Which component executes program instructions?",
        "section": "Computer Fundamentals",
        "points": 1,
        "options": [
          {"id": "a", "text": "CPU"},
          {"id": "b", "text": "Monitor"},
          {"id": "c", "text": "Keyboard"},
          {"id": "d", "text": "Printer"}
        ],
        "correct_option_ids": ["a"],
        "explanation": "The CPU executes program instructions."
      }
    ]
  }
}
```

## 7. Parsing and validation pipeline

1. Check extension and MIME/signature where available.
2. Apply file-size and resource limits.
3. Parse into a temporary representation.
4. Normalize whitespace while preserving intentional line breaks.
5. Map fields to canonical IDs.
6. Validate required fields and answer references.
7. Show import report and preview.
8. Commit only after teacher confirmation.

Never partially overwrite the active quiz during parsing.

## 8. Import report

Report:
- File name and detected format
- Number of questions recognized
- Number of valid questions
- Number of warnings
- Number of errors
- Question/row location for each issue
- Suggested correction

Warnings may include missing optional explanation or unused optional choice. Errors include invalid correct-answer references or missing question text.

## 9. Round-trip requirement

For each supported format:
- Generate a blank template.
- Fill it with a fixture containing short and long text, punctuation, Unicode and multiline content.
- Import the fixture.
- Compare normalized quiz data with expected data.
- Export and re-import where export is supported.
- Verify that question text, choices and correct-answer mapping remain intact.
