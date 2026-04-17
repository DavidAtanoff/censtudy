# StudyML Language Guide

StudyML is CenLearn's authoring language for study guides, flashcard decks, quizzes, and tests. It combines Markdown, lightweight formatting tags, live knowledge checks, and sandboxed interactive embeds so one source can drive a Quizlet-like recall flow and a Brilliant-like concept flow.

StudyML is designed around three rules:

1. Write like a teacher, not a programmer.
2. Keep the source readable in plain text.
3. Make active recall part of the document, not an afterthought.

---

## 1. Content Modes

The same language is used across several content types:

| Content Type | Purpose | Primary Blocks |
| --- | --- | --- |
| `study-guide` | Teach the material with formatting, notes, visuals, and embedded checks. | `::note`, `::question`, `::columns`, `:::interactive` |
| `flashcard-deck` | Drill memory with spaced repetition, write-to-recall, and matching. | `::flashcard` |
| `quiz` / `test` | Assess understanding with shuffled questions and AI-graded short answers. | `::question` |

You can create multiple flashcard decks and multiple quizzes inside the same unit. CenLearn treats each content item as its own reusable training set.

---

## 2. Core Authoring Model

StudyML has two layers:

- Standard Markdown for headings, bold, italics, lists, tables, links, images, code blocks, blockquotes, and task lists.
- StudyML tags for layout, typography, notes, flashcards, questions, and interactivity.

Plain Markdown still works:

```markdown
# Cellular Respiration

ATP is the cell's **usable energy currency**.

| Stage | Main Output |
| --- | --- |
| Glycolysis | Pyruvate + ATP |
| Krebs Cycle | NADH, FADH2 |

- [x] Glucose is split during glycolysis
- [ ] The electron transport chain happens in the nucleus
```

Raw HTML outside `:::interactive` is escaped on purpose. If you need live HTML, CSS, or JavaScript, use `:::interactive`.

---

## 3. Text Formatting

StudyML supports Word-style emphasis without forcing you to hand-write HTML.

### Inline Tags

| Tag | Use |
| --- | --- |
| `::b text ::` | Bold emphasis |
| `::i text ::` | Italic emphasis |
| `::u text ::` | Underline |
| `::strike text ::` | Strikethrough |
| `::sub text ::` | Subscript |
| `::sup text ::` | Superscript |
| `::small text ::` | Secondary fine print |
| `::muted text ::` | Muted inline text |
| `::badge text ::` | Small pill label |
| `::hl{v="#fef08a"} text ::` | Highlighted text |
| `==text==` | Quick highlight shorthand |

Examples:

```markdown
Water is written as H::sub 2 ::O.

The exponent in x::sup 2 :: means "square."

::badge Exam Priority ::

Remember the ::u independent variable :: controls the experiment.
```

---

## 4. Typography And Layout

These blocks let StudyML feel closer to Google Docs or Microsoft Word while staying plain-text friendly.

### Alignment And Flow

| Tag | Use |
| --- | --- |
| `::center ... ::` | Centered text or hero sections |
| `::right ... ::` | Right-aligned text |
| `::justify ... ::` | Textbook-style justified paragraphs |
| `::indent ... ::` | Indented section with a guide line |
| `::lead ... ::` | Larger opening paragraph |

### Typography Controls

Use `::font` when you need explicit size, color, weight, line-height, background, or family.

```markdown
::font{size="42px" weight="800" color="#111827" family="Outfit" lh="1.05"}
Momentum And Impulse
::
```

Supported `::font` attributes:

- `size`
- `weight`
- `color`
- `family`
- `align`
- `bg`
- `lh`

Shorter helpers:

- `::size{v="18px"} text ::`
- `::color{v="#2563eb"} text ::`

### Structured Presentation Blocks

| Tag | Use |
| --- | --- |
| `::card ... ::` | Framed content panel |
| `::quote{cite="..."} ... ::` | Pull quote or memorable line |
| `::divider{label="..."} ::` | Labeled horizontal divider |
| `::columns{count="2"} ... ||| ... ::` | Multi-column layout |
| `::image{src="..." alt="..." caption="..."} ::` | Styled image with caption |

Example:

```markdown
::columns{count="2"}
### Definition
Momentum equals mass times velocity.
|||
### Why It Matters
Large momentum means large resistance to change.
::
```

Notes on `::columns`:

- Separate columns with `|||`.
- `count` can be `1`, `2`, `3`, or `4`.
- On smaller screens, columns stack vertically.

---

## 5. Notes And Callouts

Use `::note` for high-signal reminders, warnings, and takeaways.

```markdown
::note{type="info" title="Exam Shortcut"}
If a system is closed and no external impulse acts, total momentum stays constant.
::
```

Supported note types:

- `info`
- `warning`
- `success`
- `danger`

Optional attributes:

- `type`
- `title`

---

## 6. Flashcards

Flashcards use explicit front/back pairs.

```markdown
::flashcard
**Front**: What is Newton's Second Law?
**Back**: Force equals mass times acceleration, written as $F = ma$.
::
```

Authoring rules:

1. Every flashcard must contain `**Front**:` and `**Back**:`.
2. One `flashcard-deck` content item can contain many `::flashcard` blocks.
3. A unit can contain multiple separate flashcard decks.

In the UI, flashcard decks support:

- spaced repetition
- full-deck rotation
- write-to-recall mode
- match mode

---

## 7. Questions And Knowledge Checks

`::question` powers both embedded study-guide checks and full quiz/test content.

### Multiple Choice

```markdown
::question{explanation="Acceleration is the rate of change of velocity."}
# Which quantity measures how quickly velocity changes?
* [x] Acceleration
* Momentum
* Impulse
::
```

Rules:

1. Mark the correct option with `[x]`.
2. Use `*`, `-`, or numbered options.
3. Add `explanation` to give immediate teaching feedback.

### Short Answer

```markdown
::question{answer="Momentum equals mass times velocity." keywords="momentum,mass,velocity" explanation="The key relationship is p = mv."}
# Define momentum in one sentence.
::
```

Short-answer attributes:

- `answer`
- `keywords`
- `explanation`

The backend uses the `answer` and `keywords` to guide grading and retention analytics.

---

## 8. Interactivity

Use `:::interactive` for sandboxed live experiences. This is the only place where raw HTML, CSS, and JavaScript should live.

```markdown
:::interactive
<div style="padding:20px">
  <input id="speed" type="range" min="0" max="30" value="10">
  <p id="output"></p>
</div>
<script>
  const slider = document.getElementById('speed');
  const output = document.getElementById('output');
  const render = () => {
    output.textContent = `Speed: ${slider.value} m/s`;
  };
  slider.addEventListener('input', render);
  render();
</script>
:::
```

Interactive block guidelines:

1. Keep scripts self-contained.
2. Do not assume access to the outer app DOM.
3. Prefer lightweight visualizations that reinforce one idea clearly.
4. Make the embed readable on both desktop and mobile widths.

---

## 9. Pagination

In study guides, a line containing only `---` creates a page break.

```markdown
# Page One
Overview content here.

---

# Page Two
Worked examples here.
```

Page breaks are ignored inside fenced code blocks and inside `:::interactive`.

---

## 10. Word-Processor Style Features

StudyML is not trying to clone every toolbar button from Word, but it covers the high-value document behaviors most school notes need:

- headings and subheadings
- bold, italics, underline, strike, subscript, superscript
- highlights and muted annotations
- custom font size, weight, color, and line height
- centered, right-aligned, and justified text
- cards, quotes, dividers, notes, and columns
- tables and checklists via Markdown
- images with captions
- equations with inline or display KaTeX
- embedded live checks and interactive visualizations

That combination is usually enough to create notes that feel polished without making the source unreadable.

---

## 11. Authoring Patterns That Work Best

### Best-Practice Study Guide Structure

1. Open with a centered title and a short `::lead` paragraph.
2. Teach one concept at a time.
3. Add a `::question` after every major concept.
4. Use `::note` for misconceptions and exam traps.
5. Use `::columns` for compare/contrast material.
6. Use `:::interactive` only where motion or feedback truly helps.

### Best-Practice Flashcard Structure

1. Keep the front focused on one retrieval task.
2. Keep the back concise first, then add a memory hook if needed.
3. Split big subjects into multiple decks instead of one giant dump.

### Best-Practice Quiz Structure

1. Mix recognition and generation.
2. Use short-answer questions for the concepts that matter most.
3. Put explanations on the questions that reveal common misunderstandings.

---

## 12. Syntax Reference

### Block Tags

- `::center`
- `::right`
- `::justify`
- `::indent`
- `::lead`
- `::card`
- `::quote`
- `::divider`
- `::columns`
- `::image`
- `::note`
- `::question`
- `::flashcard`
- `:::interactive`

### Inline Tags

- `::b`
- `::i`
- `::u`
- `::strike`
- `::sub`
- `::sup`
- `::small`
- `::muted`
- `::badge`
- `::font`
- `::size`
- `::color`
- `::hl`

---

## 13. Validation Rules

CenLearn currently validates these conditions before save:

- study guides cannot be empty
- flashcard decks must contain at least one valid `::flashcard`
- quizzes/tests must contain at least one `::question`

The editor also warns about:

- malformed flashcard blocks
- malformed question blocks
- missing correct answers
- missing short-answer keys
- unclosed interactive blocks
- unknown StudyML tags

---

## 14. Example Skeletons

### Study Guide Skeleton

```markdown
::center
::font{size="40px" weight="800" color="#111827" family="Outfit"}
Topic Title
::
::

::lead
State the single most important idea in one clean paragraph.
::

::note{type="info" title="What Students Forget"}
Add the subtle point here.
::

::question{explanation="Reinforce the idea immediately."}
# Which statement is most accurate?
* [x] Best answer
* Distractor
* Distractor
::
```

### Flashcard Skeleton

```markdown
::flashcard
**Front**: What is the definition?
**Back**: The exact answer plus a short cue.
::
```

### Quiz Skeleton

```markdown
::question{answer="Model answer" keywords="keyword one,keyword two" explanation="Tell the learner what mattered."}
# Answer this in one or two sentences.
::
```
