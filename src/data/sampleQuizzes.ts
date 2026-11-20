import { Quiz, SCHEMA_VERSION } from '../domain/types';

export const SAMPLE_QUIZZES: Quiz[] = [
  {
    id: 'quiz-cs-fundamentals',
    schema_version: SCHEMA_VERSION,
    revision: 1,
    title: 'Introduction to Computing — Unit Review',
    instructions: 'Read each prompt carefully and choose the single best answer.',
    created_at: '2026-11-10T09:00:00.000Z',
    updated_at: '2026-11-18T14:30:00.000Z',
    questions: [
      {
        id: 'cs-q1',
        type: 'multiple_choice',
        text: 'Which hardware component fetches, decodes, and executes program instructions?',
        section: 'Hardware & Architecture',
        points: 1,
        original_number: 1,
        options: [
          { id: 'a', text: 'Central Processing Unit (CPU)' },
          { id: 'b', text: 'Solid-State Drive (SSD)' },
          { id: 'c', text: 'Network Interface Controller' },
          { id: 'd', text: 'Power Supply Unit' },
        ],
        correct_option_ids: ['a'],
        explanation:
          'The CPU executes the fetch-decode-execute cycle for machine instructions.',
      },
      {
        id: 'cs-q2',
        type: 'multiple_choice',
        text: 'What is the decimal value of the 8-bit unsigned binary number 00101101₂?',
        section: 'Data Representation',
        points: 1,
        original_number: 2,
        options: [
          { id: 'a', text: '43' },
          { id: 'b', text: '45' },
          { id: 'c', text: '53' },
          { id: 'd', text: '61' },
        ],
        correct_option_ids: ['b'],
        explanation: '32 + 8 + 4 + 1 = 45.',
      },
      {
        id: 'cs-q3',
        type: 'multiple_choice',
        text: 'Which data structure follows the Last-In, First-Out (LIFO) principle?',
        section: 'Algorithms & Structures',
        points: 1,
        original_number: 3,
        options: [
          { id: 'a', text: 'Queue' },
          { id: 'b', text: 'Hash table' },
          { id: 'c', text: 'Stack' },
          { id: 'd', text: 'Binary heap' },
        ],
        correct_option_ids: ['c'],
        explanation:
          'A stack pushes and pops elements from the same end, making the most recently added item the first removed.',
      },
      {
        id: 'cs-q4',
        type: 'multiple_choice',
        text: 'What is the worst-case time complexity of binary search on a sorted array of n elements?',
        section: 'Algorithms & Structures',
        points: 1,
        original_number: 4,
        options: [
          { id: 'a', text: 'O(1)' },
          { id: 'b', text: 'O(n)' },
          { id: 'c', text: 'O(n log n)' },
          { id: 'd', text: 'O(log n)' },
        ],
        correct_option_ids: ['d'],
        explanation:
          'Binary search halves the remaining search interval on every comparison, requiring at most ⌈log₂(n + 1)⌉ steps.',
      },
      {
        id: 'cs-q5',
        type: 'multiple_choice',
        text: 'Which type of computer memory is volatile and loses its contents when power is removed?',
        section: 'Hardware & Architecture',
        points: 1,
        original_number: 5,
        options: [
          { id: 'a', text: 'DRAM (Main System RAM)' },
          { id: 'b', text: 'NAND Flash Storage' },
          { id: 'c', text: 'Optical Blu-ray Disc' },
          { id: 'd', text: 'Magnetic Hard Disk Platter' },
        ],
        correct_option_ids: ['a'],
        explanation:
          'Dynamic RAM requires continuous power and periodic refresh cycles to retain stored bits.',
      },
      {
        id: 'cs-q6',
        type: 'multiple_choice',
        text: 'Which character encoding is backward-compatible with ASCII and can represent nearly all writing systems worldwide?',
        section: 'Data Representation',
        points: 1,
        original_number: 6,
        options: [
          { id: 'a', text: 'ISO-8859-1' },
          { id: 'b', text: 'UTF-8' },
          { id: 'c', text: 'EBCDIC' },
          { id: 'd', text: 'Windows-1252' },
        ],
        correct_option_ids: ['b'],
        explanation:
          'UTF-8 encodes standard 7-bit ASCII identically in 1 byte while scaling up to 4 bytes for the full Unicode range.',
      },
    ],
  },
  {
    id: 'quiz-biology-adaptive',
    schema_version: SCHEMA_VERSION,
    revision: 1,
    title: 'Cellular Respiration & Ecology — Passage & Short Prompts',
    instructions:
      'Includes short prompts, multi-line case studies, and detailed answer choices to demonstrate adaptive projector typography.',
    created_at: '2026-11-12T11:15:00.000Z',
    updated_at: '2026-11-17T16:45:00.000Z',
    questions: [
      {
        id: 'bio-q1',
        type: 'multiple_choice',
        text: 'Where does glycolysis take place in a eukaryotic cell?',
        section: 'Cellular Energetics',
        points: 1,
        original_number: 1,
        options: [
          { id: 'a', text: 'Cytosol' },
          { id: 'b', text: 'Mitochondrial matrix' },
          { id: 'c', text: 'Thylakoid lumen' },
          { id: 'd', text: 'Nucleolus' },
        ],
        correct_option_ids: ['a'],
        explanation:
          'Glycolysis occurs in the cytosol and does not require oxygen or mitochondria.',
      },
      {
        id: 'bio-q2',
        type: 'multiple_choice',
        text: 'A researcher isolates mitochondria in a buffered medium containing glucose, ADP, and inorganic phosphate, but observes no net oxygen consumption and no measurable ATP synthesis.\n\nWhich explanation best accounts for why intact mitochondria fail to oxidize glucose directly under these experimental conditions?',
        section: 'Cellular Energetics',
        points: 2,
        original_number: 2,
        options: [
          {
            id: 'a',
            text: 'Mitochondria lack the cytosolic enzymes of glycolysis needed to break glucose down into pyruvate before mitochondrial transport.',
          },
          {
            id: 'b',
            text: 'Inorganic phosphate competitively inhibits ATP synthase when dissolved oxygen exceeds atmospheric saturation levels.',
          },
          {
            id: 'c',
            text: 'Glucose permanently cross-links inner membrane porins, preventing protons from returning to the intermembrane space.',
          },
          {
            id: 'd',
            text: 'Oxygen consumption only proceeds in the presence of light-dependent chlorophyll excitation complexes.',
          },
        ],
        correct_option_ids: ['a'],
        explanation:
          'Pyruvate—not glucose—is transported into the mitochondrial matrix for pyruvate oxidation and the citric acid cycle.',
      },
      {
        id: 'bio-q3',
        type: 'multiple_choice',
        text: 'During prolonged vigorous exercise, mammalian skeletal muscle cells temporarily switch to lactic acid fermentation primarily to:',
        section: 'Cellular Energetics',
        points: 1,
        original_number: 3,
        options: [
          {
            id: 'a',
            text: 'Generate extra molecular oxygen inside the sarcoplasmic reticulum',
          },
          {
            id: 'b',
            text: 'Regenerate NAD⁺ from NADH so glycolysis can continue producing ATP',
          },
          {
            id: 'c',
            text: 'Convert carbon dioxide directly into stored glycogen granules',
          },
          {
            id: 'd',
            text: 'Increase proton pumping across the outer nuclear envelope',
          },
        ],
        correct_option_ids: ['b'],
        explanation:
          'Reducing pyruvate to lactate oxidizes NADH back to NAD⁺, preventing glycolysis from stalling.',
      },
    ],
  },
];
