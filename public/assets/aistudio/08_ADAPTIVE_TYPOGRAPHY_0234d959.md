# 08 — Adaptive Typography and Layout

## 1. Problem

A single fixed font size cannot handle both short and long questions. Large text improves projector readability, but long prompts or lengthy answer choices can overflow the slide. QuizDeck needs automatic fitting plus teacher-controlled sizing.

## 2. Independent typography controls

Provide separate settings for:
- Question text
- Answer choices
- Quiz title/instructions
- Question number/progress
- Answer review text

Changing question font size must not unexpectedly change answer font size.

## 3. Auto-fit behavior

Auto-fit should be enabled by default. It should:
1. Measure the available question/choice container.
2. Render or estimate the content at the preferred font size.
3. Detect overflow in both dimensions.
4. Reduce font size gradually until the content fits within configured minimum/maximum bounds.
5. Preserve line wrapping and readable line height.
6. Recalculate on viewport resize, fullscreen change, font load and content change.

Do not shrink text more than necessary. Prefer using available vertical space, sensible line-height and balanced spacing before reducing font size.

## 4. Manual size behavior

Provide clear increase/decrease controls and optionally a slider. Define:
- Preferred size
- Minimum readable size
- Maximum size
- Reset to default

When auto-fit is enabled, manual size represents the preferred size; auto-fit may reduce it to prevent overflow. When auto-fit is disabled, manual size is applied directly, but the UI must warn or indicate if content overflows.

## 5. Layout strategy

- Use responsive containers and CSS layout rather than fixed coordinates.
- Allow question text to wrap naturally.
- Avoid fixed-height text boxes unless overflow is measured.
- Choices should wrap rather than clip.
- For long choices, use a stacked list instead of a rigid multi-column grid.
- Reserve safe margins around the display.
- Keep the question visually dominant.
- If content is too long even at the minimum size, switch to a scrollable question region or a deliberate split-content mode; do not silently crop it.

Recommended default: a single-question slide with question above choices. Long questions receive more vertical space by reducing header/footer height and tightening spacing within accessible limits.

## 6. Content overflow policy

Priority order:
1. Reflow and wrap.
2. Reduce excess whitespace.
3. Adjust layout density.
4. Reduce font size within a readable range.
5. Use an internal scroll region or split view as a last resort.
6. Show a warning in presenter controls if content still exceeds the safe region.

Never hide the last answer choice or the end of a question without warning.

## 7. Display testing

Test at:
- 1920×1080
- 1366×768
- 1280×720
- 1024×768 (4:3)
- Resized browser window
- Browser zoom changes
- Fullscreen entry and exit

Test text cases:
- Very short question
- Long question paragraph
- Multiple-line question
- Long answer choice
- Unicode and accented characters
- Punctuation, quotes and mathematical symbols
- All choices at maximum expected length

## 8. Accessibility

- Use scalable CSS units where appropriate.
- Respect browser zoom.
- Maintain contrast at all font sizes.
- Avoid overly condensed fonts.
- Do not make text fit by using unreadably small sizes.
- Provide a visible overflow warning to the teacher.
