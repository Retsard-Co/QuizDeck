import test from 'node:test';
import assert from 'node:assert/strict';
import {
  exportQuizToCsv,
  exportQuizToDocx,
  exportQuizToJson,
  exportQuizToXlsx,
  generateCsvTemplate,
  generateDocxTemplate,
  generateJsonTemplate,
  generateXlsxTemplate,
  importQuizFile,
  parseCsvQuiz,
  parseDocxQuiz,
  parseJsonQuiz,
  parseXlsxQuiz,
} from './index';
import { Quiz, SCHEMA_VERSION } from '../domain/types';

function makeRichFixtureQuiz(): Quiz {
  return {
    id: 'quiz-rich-fixture',
    schema_version: SCHEMA_VERSION,
    revision: 1,
    title: 'Rich Round-Trip Fixture — Unicode & Multiline',
    instructions: 'Select one option carefully.',
    created_at: '2026-11-19T00:00:00.000Z',
    updated_at: '2026-11-19T00:00:00.000Z',
    questions: [
      {
        id: 'q1',
        type: 'multiple_choice',
        text: 'Evaluate ∑(i=1..3) i² for “exact” café temperature (ΔT = 25 °C):\nLine two of prompt.',
        section: 'Math & Science',
        points: 2,
        original_number: 1,
        options: [
          { id: 'a', text: '12, approx.' },
          { id: 'b', text: '14 (exact, "1+4+9")' },
          { id: 'c', text: '16' },
          { id: 'd', text: '18' },
        ],
        correct_option_ids: ['b'],
        explanation: '1² + 2² + 3² = 1 + 4 + 9 = 14.',
      },
      {
        id: 'q2',
        type: 'multiple_choice',
        text: 'Short question with only 3 choices?',
        section: 'General',
        points: 1,
        original_number: 2,
        options: [
          { id: 'a', text: 'Alpha' },
          { id: 'b', text: 'Beta' },
          { id: 'c', text: 'Gamma' },
        ],
        correct_option_ids: ['c'],
        explanation: 'Gamma is the third letter.',
      },
    ],
  };
}

function makeFiftyQuestionQuiz(): Quiz {
  return {
    id: 'quiz-50',
    schema_version: SCHEMA_VERSION,
    revision: 1,
    title: '50-Question Exam Bank',
    instructions: 'Answer all 50 items.',
    created_at: '2026-11-19T00:00:00.000Z',
    updated_at: '2026-11-19T00:00:00.000Z',
    questions: Array.from({ length: 50 }, (_, idx) => {
      const letters = ['a', 'b', 'c', 'd'];
      const correct = letters[idx % 4];
      return {
        id: `q${idx + 1}`,
        type: 'multiple_choice' as const,
        text: `Question #${idx + 1}: Choose the correct option.`,
        section: `Section ${Math.floor(idx / 10) + 1}`,
        points: 1,
        original_number: idx + 1,
        options: [
          { id: 'a', text: `Choice A for Q${idx + 1}` },
          { id: 'b', text: `Choice B for Q${idx + 1}` },
          { id: 'c', text: `Choice C for Q${idx + 1}` },
          { id: 'd', text: `Choice D for Q${idx + 1}` },
        ],
        correct_option_ids: [correct],
        explanation: `Correct option is ${correct.toUpperCase()}.`,
      };
    }),
  };
}

test('JSON template and rich fixture round-trip cleanly', () => {
  const tmpl = generateJsonTemplate();
  const tmplReport = parseJsonQuiz(tmpl, 'quizdeck-template.json');
  assert.equal(tmplReport.errors.length, 0);
  assert.equal(tmplReport.recognizedCount, 2);

  const rich = makeRichFixtureQuiz();
  const exported = exportQuizToJson(rich);
  const reimported = parseJsonQuiz(exported, 'rich.json');
  assert.equal(reimported.errors.length, 0);
  assert.equal(reimported.quiz!.title, rich.title);
  assert.equal(reimported.quiz!.questions[0].text, rich.questions[0].text);
  assert.deepEqual(reimported.quiz!.questions[0].correct_option_ids, ['b']);
  assert.equal(reimported.quiz!.questions[1].options.length, 3);
});

test('CSV template, rich Unicode/multiline/quoted fixture, and 50-question quiz round-trip cleanly', () => {
  const tmpl = generateCsvTemplate();
  const tmplReport = parseCsvQuiz(tmpl, 'template.csv');
  assert.equal(tmplReport.errors.length, 0);
  assert.equal(tmplReport.recognizedCount, 2);

  const rich = makeRichFixtureQuiz();
  const exported = exportQuizToCsv(rich);
  const reimported = parseCsvQuiz(exported, 'rich.csv');
  assert.equal(reimported.errors.length, 0);
  assert.equal(reimported.quiz!.questions[0].text, rich.questions[0].text);
  assert.equal(reimported.quiz!.questions[0].options[1].text, '14 (exact, "1+4+9")');
  assert.deepEqual(reimported.quiz!.questions[0].correct_option_ids, ['b']);
  assert.deepEqual(reimported.quiz!.questions[1].correct_option_ids, ['c']);

  const fifty = makeFiftyQuestionQuiz();
  const fiftyReport = parseCsvQuiz(exportQuizToCsv(fifty), 'fifty.csv');
  assert.equal(fiftyReport.errors.length, 0);
  assert.equal(fiftyReport.recognizedCount, 50);
  assert.equal(fiftyReport.validCount, 50);
});

test('XLSX template and rich fixture round-trip cleanly', () => {
  const tmplBytes = generateXlsxTemplate();
  const tmplReport = parseXlsxQuiz(tmplBytes, 'template.xlsx');
  assert.equal(tmplReport.errors.length, 0);
  assert.equal(tmplReport.recognizedCount, 2);

  const rich = makeRichFixtureQuiz();
  const exportedBytes = exportQuizToXlsx(rich);
  const reimported = parseXlsxQuiz(exportedBytes, 'rich.xlsx');
  assert.equal(reimported.errors.length, 0);
  assert.equal(reimported.quiz!.questions[0].text, rich.questions[0].text);
  assert.deepEqual(reimported.quiz!.questions[0].correct_option_ids, ['b']);
  assert.equal(reimported.quiz!.questions[1].options.length, 3);
});

test('DOCX template and rich fixture round-trip cleanly', async () => {
  const tmplBytes = await generateDocxTemplate();
  const tmplReport = await parseDocxQuiz(tmplBytes, 'template.docx');
  assert.equal(tmplReport.errors.length, 0);
  assert.equal(tmplReport.recognizedCount, 2);
  assert.deepEqual(tmplReport.quiz!.questions[0].correct_option_ids, ['a']);
  assert.deepEqual(tmplReport.quiz!.questions[1].correct_option_ids, ['c']);

  const rich = makeRichFixtureQuiz();
  const exportedBytes = await exportQuizToDocx(rich);
  const reimported = await parseDocxQuiz(exportedBytes, 'rich.docx');
  assert.equal(reimported.errors.length, 0);
  assert.equal(reimported.quiz!.title, rich.title);
  assert.equal(reimported.quiz!.questions[0].text, rich.questions[0].text);
  assert.deepEqual(reimported.quiz!.questions[0].correct_option_ids, ['b']);
  assert.equal(reimported.quiz!.questions[1].options.length, 3);
});

test('importers reject malformed, corrupt, unsupported, and invalid-answer files safely', async () => {
  // Corrupt JSON
  const badJson = parseJsonQuiz('{broken json', 'corrupt.json');
  assert.ok(badJson.errors.length > 0);
  assert.equal(badJson.quiz, null);

  // Corrupt XLSX (bad magic signature)
  const badXlsx = parseXlsxQuiz(new Uint8Array([1, 2, 3, 4]), 'fake.xlsx');
  assert.ok(badXlsx.errors.some((e) => e.code === 'CORRUPT_XLSX'));
  assert.equal(badXlsx.quiz, null);

  // Corrupt DOCX
  const badDocx = await parseDocxQuiz(new Uint8Array([1, 2, 3, 4]), 'fake.docx');
  assert.ok(badDocx.errors.some((e) => e.code === 'CORRUPT_DOCX'));
  assert.equal(badDocx.quiz, null);

  // Unsupported file type
  const unsupported = await importQuizFile({
    name: 'quiz.pdf',
    size: 100,
    arrayBuffer: async () => new ArrayBuffer(0),
    text: async () => '',
  });
  assert.ok(unsupported.errors.some((e) => e.code === 'UNSUPPORTED_FILE_TYPE'));

  // Invalid CSV: missing question, invalid correct answer ref, duplicate IDs
  const invalidCsv = [
    'question_id,question,option_a,option_b,option_c,option_d,correct_answer,explanation,section,question_type,points',
    'q1,,Opt A,Opt B,,,D,,,multiple_choice,1',
    'q1,Valid Q,Opt A,Opt B,,,A,,,multiple_choice,1',
  ].join('\n');
  const csvReport = parseCsvQuiz(invalidCsv, 'errors.csv');
  assert.ok(csvReport.errors.some((e) => e.code === 'MISSING_QUESTION_TEXT'));
  assert.ok(csvReport.errors.some((e) => e.code === 'INVALID_CORRECT_ANSWER_REF'));
  assert.ok(csvReport.errors.some((e) => e.code === 'DUPLICATE_QUESTION_ID'));
  assert.ok(csvReport.errors.some((e) => e.rowNumber === 2));
});
