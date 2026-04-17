import katex from 'katex'
import { marked } from 'marked'

marked.setOptions({
  breaks: true,
  gfm: true,
})

export type StudyMlContentType = 'study-guide' | 'quiz' | 'flashcard-deck' | 'test'

export type StudyMlQuestionType = 'multiple-choice' | 'short-answer' | 'true-false'

export interface StudyMlFlashcard {
  index: number
  raw: string
  front: string
  back: string
  warnings: string[]
}

export interface StudyMlQuestion {
  index: number
  raw: string
  type: StudyMlQuestionType
  question: string
  options: string[]
  correctAnswer?: string
  explanation?: string
  keywords: string[]
  warnings: string[]
}

export interface StudyMlMetrics {
  pageCount: number
  flashcardCount: number
  questionCount: number
  interactiveCount: number
  estimatedMinutes: number
  warnings: string[]
}

interface ExtractedBlock {
  attrs: Record<string, string>
  body: string
  raw: string
}

export interface RenderedStudyMl {
  html: string
  warnings: string[]
}

const PLACEHOLDER_PREFIX = '@@@STUDYML_SLOT_'
const IMAGE_DATA_URL_RE = /^data:image\/(?:png|jpeg|jpg|gif|webp|svg\+xml);/i
const SAFE_URL_RE = /^(https?:|mailto:|tel:|\/|#)/i

const allowedTags = new Set([
  'a',
  'article',
  'aside',
  'blockquote',
  'br',
  'button',
  'canvas',
  'code',
  'del',
  'details',
  'div',
  'em',
  'figcaption',
  'figure',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'iframe',
  'img',
  'input',
  'kbd',
  'label',
  'li',
  'mark',
  'ol',
  'p',
  'pre',
  'section',
  'small',
  'span',
  'strong',
  'sub',
  'summary',
  'sup',
  'table',
  'textarea',
  'tbody',
  'td',
  'th',
  'thead',
  'tr',
  'u',
  'ul',
])

const globalAttributes = new Set([
  'aria-label',
  'aria-hidden',
  'data-answer',
  'class',
  'data-explanation-html',
  'data-keywords',
  'data-question-type',
  'data-target-id',
  'data-unit',
  'id',
  'name',
  'role',
  'style',
  'title',
  'value',
])

const tagAttributes: Record<string, Set<string>> = {
  a: new Set(['href', 'target', 'rel']),
  button: new Set(['disabled', 'type']),
  iframe: new Set(['sandbox', 'scrolling', 'srcdoc']),
  img: new Set(['alt', 'loading', 'src']),
  input: new Set(['checked', 'disabled', 'max', 'min', 'step', 'type']),
  textarea: new Set(['placeholder']),
}

export function normalizeStudyMl(content: string): string {
  return content.replace(/\r\n?/g, '\n')
}

export function parseStudyMLAttrs(attrString: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  const regex = /([a-zA-Z0-9_-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s}]+))/g

  let match: RegExpExecArray | null = null
  while ((match = regex.exec(attrString)) !== null) {
    attrs[match[1]] = match[2] ?? match[3] ?? match[4] ?? ''
  }

  return attrs
}

export function splitStudyGuidePages(content: string): string[] {
  const lines = normalizeStudyMl(content).split('\n')
  const pages: string[] = []
  const current: string[] = []
  let inFence = false
  let interactiveDepth = 0

  for (const line of lines) {
    const trimmed = line.trim()

    if (trimmed.startsWith('```')) {
      inFence = !inFence
    }

    if (/^:{3,4}interactive\b/.test(trimmed)) {
      interactiveDepth += 1
    }

    if (!inFence && interactiveDepth === 0 && trimmed === '---') {
      const page = current.join('\n').trim()
      if (page) pages.push(page)
      current.length = 0
      continue
    }

    current.push(line)

    if (interactiveDepth > 0 && /^:{3,4}\s*$/.test(trimmed)) {
      interactiveDepth -= 1
    }
  }

  const finalPage = current.join('\n').trim()
  if (finalPage) pages.push(finalPage)

  return pages.length > 0 ? pages : ['']
}

export function parseFlashcards(content: string): StudyMlFlashcard[] {
  return extractStudyMlBlocks(content, 'flashcard').map((block, index) => {
    const warnings: string[] = []
    const frontMatch = block.body.match(/\*\*\s*front\s*\*\*\s*:\s*([\s\S]*?)(?=\*\*\s*back\s*\*\*\s*:)/i)
    const backMatch = block.body.match(/\*\*\s*back\s*\*\*\s*:\s*([\s\S]*)$/i)

    const front = frontMatch?.[1]?.trim() ?? ''
    const back = backMatch?.[1]?.trim() ?? ''

    if (!front) warnings.push(`Flashcard ${index + 1} is missing a front side.`)
    if (!back) warnings.push(`Flashcard ${index + 1} is missing a back side.`)

    return {
      index,
      raw: block.body,
      front,
      back,
      warnings,
    }
  })
}

export function parseQuizQuestions(content: string): StudyMlQuestion[] {
  const choiceLineRe = /^\s*(?:[*-]|\d+\.)\s*(?:\[[ xX]\])?\s+/

  return extractStudyMlBlocks(content, 'question').map((block, index) => {
    const warnings: string[] = []
    const rawLines = block.body
      .split('\n')
      .map((line) => line.trimEnd())
      .filter((line) => line.trim().length > 0)

    const choiceLines = rawLines.filter((line) => choiceLineRe.test(line))
    const questionLines = rawLines.filter((line) => !choiceLineRe.test(line))
    const options = choiceLines.map((line) => {
      const cleaned = line.replace(/^\s*(?:[*-]|\d+\.)\s*/, '')
      const isCorrect = /^\[[xX]\]\s*/.test(cleaned)
      return {
        text: cleaned.replace(/^\[[ xX]\]\s*/, '').trim(),
        isCorrect,
      }
    })

    const question = questionLines.join('\n').trim()
    const correctChoice = options.find((option) => option.isCorrect)?.text
    const keywords = (block.attrs.keywords ?? '')
      .split(',')
      .map((keyword) => keyword.trim())
      .filter(Boolean)

    let type: StudyMlQuestionType = 'short-answer'
    if (options.length > 0) {
      type = options.length === 2 && options.every((option) => /^(true|false)$/i.test(option.text))
        ? 'true-false'
        : 'multiple-choice'
    }

    if (!question) warnings.push(`Question ${index + 1} is missing a prompt.`)
    if (options.length > 0 && options.length < 2) warnings.push(`Question ${index + 1} needs at least two answer choices.`)
    if (options.length > 0 && !correctChoice) warnings.push(`Question ${index + 1} has no correct answer marked with [x].`)
    if (options.length === 0 && !(block.attrs.answer ?? '').trim()) warnings.push(`Question ${index + 1} is missing an answer="" attribute for short-answer grading.`)

    return {
      index,
      raw: block.body,
      type,
      question,
      options: options.map((option) => option.text),
      correctAnswer: correctChoice ?? block.attrs.answer,
      explanation: block.attrs.explanation,
      keywords,
      warnings,
    }
  })
}

export function analyzeStudyMl(content: string, contentType?: StudyMlContentType): StudyMlMetrics {
  const normalized = normalizeStudyMl(content)
  const flashcards = parseFlashcards(normalized)
  const questions = parseQuizQuestions(normalized)
  const warnings = [
    ...flashcards.flatMap((card) => card.warnings),
    ...questions.flatMap((question) => question.warnings),
  ]

  const flashcardStarts = (normalized.match(/::flashcard\b/g) ?? []).length
  const questionStarts = (normalized.match(/::question\b/g) ?? []).length
  if (flashcardStarts !== flashcards.length) {
    warnings.push('Some flashcard blocks look unclosed or malformed.')
  }
  if (questionStarts !== questions.length) {
    warnings.push('Some question blocks look unclosed or malformed.')
  }
  if ((normalized.match(/:{3,4}interactive\b/g) ?? []).length !== (normalized.match(/^:{3,4}\s*$/gm) ?? []).length) {
    warnings.push('An interactive block appears to be missing its closing ::: marker.')
  }
  if (content.includes('::') && flashcardStarts === 0 && questionStarts === 0 && !/::(?:center|right|justify|indent|font|size|color|hl|b|i|u|strike|sub|sup|small|muted|lead|badge|note|quote|card|columns|divider|image|slider|question|flashcard)\b/.test(content)) {
    warnings.push('Unknown StudyML tags detected.')
  }

  if (contentType === 'flashcard-deck' && flashcards.length === 0) {
    warnings.push('Flashcard decks should include at least one ::flashcard block.')
  }
  if ((contentType === 'quiz' || contentType === 'test') && questions.length === 0) {
    warnings.push('Quizzes should include at least one ::question block.')
  }

  const words = normalized
    .replace(/:{3,4}interactive[\s\S]*?:{3,4}/g, ' ')
    .replace(/::[a-zA-Z]+(?:\{[^}]*\})?/g, ' ')
    .replace(/::/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length

  return {
    pageCount: splitStudyGuidePages(normalized).length,
    flashcardCount: flashcards.length,
    questionCount: questions.length,
    interactiveCount: (normalized.match(/:{3,4}interactive\b/g) ?? []).length,
    estimatedMinutes: Math.max(1, Math.ceil(words / 180)),
    warnings,
  }
}

export function getStudyMlStarter(contentType: StudyMlContentType): string {
  switch (contentType) {
    case 'flashcard-deck':
      return [
        '::flashcard',
        '**Front**: What is the central idea of this unit?',
        '**Back**: Summarize the key concept in one clean sentence.',
        '::',
        '',
        '::flashcard',
        '**Front**: Which formula, date, or definition matters most here?',
        '**Back**: Add the exact answer, then a quick memory hook.',
        '::',
      ].join('\n')
    case 'quiz':
    case 'test':
      return [
        '::question{explanation="Explain why the correct answer matters."}',
        '# Which idea best matches this concept?',
        '* [x] Correct choice',
        '* Another choice',
        '* A distractor',
        '::',
        '',
        '::question{answer="Concise model answer" keywords="keyword one,keyword two" explanation="Point out the missing ideas you want the learner to notice."}',
        '# Answer this in one or two clear sentences.',
        '::',
      ].join('\n')
    case 'study-guide':
    default:
      return [
        '::center',
        '::font{size="40px" weight="800" color="#111827" family="Outfit" lh="1.05"}',
        'Unit Title',
        '::',
        '::font{size="18px" color="#6b7280" weight="500" family="Outfit"}',
        'A clean subtitle that frames what matters',
        '::',
        '::',
        '',
        '::lead',
        'Open with the single most important idea in clear, confident language.',
        '::',
        '',
        '::justify',
        'Start with the big idea. Define the concept in plain language, then explain why it matters.',
        '::',
        '',
        '::note{type="info" title="Key Reminder"}',
        '**Remember:** Add the one detail students usually forget.',
        '::',
        '',
        '::columns{count="2"}',
        '### Column One',
        '* Fast fact',
        '* Definition',
        '|||',
        '### Column Two',
        '* Example',
        '* Counterexample',
        '::',
        '',
        '::question{explanation="Reinforce the concept right after teaching it."}',
        '# Which statement is most accurate?',
        '* [x] The strongest answer',
        '* A tempting distractor',
        '* Another distractor',
        '::',
      ].join('\n')
  }
}

export function renderStudyMlToHtml(content: string): RenderedStudyMl {
  const source = normalizeStudyMl(content)
  let processed = source
  const warnings: string[] = []
  const placeholders: Record<string, string> = {}
  let placeholderCount = 0
  let componentCount = 0

  const createPlaceholder = (html: string) => {
    const id = `${PLACEHOLDER_PREFIX}${placeholderCount++}@@@`
    placeholders[id] = html
    return id
  }

  processed = processed.replace(/==([^=\n][\s\S]*?)==/g, (_match, inner: string) => {
    return createPlaceholder(
      `<mark class="rounded-md bg-[#fef3c7] px-1.5 py-0.5 font-medium text-[#7c2d12]">${markdownToInlineHtml(inner.trim())}</mark>`,
    )
  })

  processed = processed.replace(/:{3,4}interactive\s*([\s\S]*?)\s*:{3,4}/g, (_match, code: string) => {
    const iframeId = `studyml-iframe-${Math.random().toString(36).slice(2, 10)}`
    const srcDoc = [
      '<!DOCTYPE html><html><head><meta charset="UTF-8">',
      '<style>body{margin:0;padding:24px;font-family:ui-sans-serif,system-ui,sans-serif;line-height:1.6;background:#fff;color:#0f172a}canvas,img,svg{display:block;max-width:100%;height:auto;margin:0 auto}*{box-sizing:border-box}</style>',
      '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">',
      '</head><body>',
      code,
      `<script>
        const sendHeight = () => {
          const h = Math.max(
            document.body.scrollHeight,
            document.documentElement.scrollHeight,
            document.body.offsetHeight,
            document.documentElement.offsetHeight
          );
          parent.postMessage({ type: 'studyml:resize', iframeId: '${iframeId}', height: h }, '*');
        };
        new ResizeObserver(sendHeight).observe(document.body);
        window.addEventListener('load', sendHeight);
        setTimeout(sendHeight, 50);
        setTimeout(sendHeight, 400);
      </script>`,
      '</body></html>',
    ].join('')

    return createPlaceholder(
      `<div class="my-10 overflow-hidden rounded-[24px] border border-black/10 bg-white shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
        <iframe
          id="${escapeAttribute(iframeId)}"
          sandbox="allow-scripts"
          scrolling="no"
          style="display:block;width:100%;height:240px;border:0;background:#fff"
          srcdoc="${escapeAttribute(srcDoc)}"
        ></iframe>
      </div>`,
    )
  })

  processed = processed.replace(/\$\$\s*([\s\S]*?)\s*\$\$/g, (_match, math: string) => {
    return createPlaceholder(
      `<div class="my-8 overflow-x-auto rounded-2xl bg-[#f8fafc] px-4 py-5 text-center">${katex.renderToString(math.trim(), {
        displayMode: true,
        throwOnError: false,
      })}</div>`,
    )
  })

  processed = processed.replace(/\$([^$\n]+?)\$/g, (_match, math: string) => {
    return createPlaceholder(
      `<span class="rounded-md bg-[#f8fafc] px-1 py-0.5 text-[0.97em]">${katex.renderToString(math.trim(), {
        displayMode: false,
        throwOnError: false,
      })}</span>`,
    )
  })

  const tagRegex = /::([a-zA-Z]+)(\{[^}]*\})?\s*((?:(?!::[a-zA-Z])[\s\S])*?)\s*::(?![a-zA-Z])/g
  let current = processed
  let safety = 0

  while (current.includes('::') && safety < 150) {
    safety += 1
    let matched = false

    current = current.replace(tagRegex, (match, rawTag: string, rawAttrs: string | undefined, rawInner: string) => {
      matched = true
      const tag = rawTag.toLowerCase()
      const inner = rawInner.trim()
      const attrs = parseStudyMLAttrs(rawAttrs?.slice(1, -1) ?? '')

      if (tag === 'b') return createPlaceholder(`<strong>${markdownToInlineHtml(inner)}</strong>`)
      if (tag === 'i') return createPlaceholder(`<em>${markdownToInlineHtml(inner)}</em>`)
      if (tag === 'u') return createPlaceholder(`<u class="underline decoration-black/20 underline-offset-4">${markdownToInlineHtml(inner)}</u>`)
      if (tag === 'strike') return createPlaceholder(`<del class="text-black/55">${markdownToInlineHtml(inner)}</del>`)
      if (tag === 'sub') return createPlaceholder(`<sub>${markdownToInlineHtml(inner)}</sub>`)
      if (tag === 'sup') return createPlaceholder(`<sup>${markdownToInlineHtml(inner)}</sup>`)
      if (tag === 'small') return createPlaceholder(`<small class="text-sm leading-6 text-black/55">${markdownToInlineHtml(inner)}</small>`)
      if (tag === 'muted') return createPlaceholder(`<span class="text-black/55">${markdownToInlineHtml(inner)}</span>`)
      if (tag === 'lead') return createPlaceholder(`<div class="my-6 text-[1.08rem] leading-8 text-black/75">${markdownToHtml(inner)}</div>`)
      if (tag === 'badge') return createPlaceholder(`<span class="inline-flex items-center rounded-full border border-black/10 bg-black/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-black/65">${markdownToInlineHtml(inner)}</span>`)

      if (tag === 'center') return createPlaceholder(`<div class="my-6 text-center">${markdownToHtml(inner)}</div>`)
      if (tag === 'right') return createPlaceholder(`<div class="my-6 text-right">${markdownToHtml(inner)}</div>`)
      if (tag === 'justify') return createPlaceholder(`<div class="my-6 text-justify leading-8 text-black/80">${markdownToHtml(inner)}</div>`)
      if (tag === 'indent') return createPlaceholder(`<div class="my-5 border-l border-black/10 pl-5 md:pl-8">${markdownToHtml(inner)}</div>`)

      if (tag === 'quote') {
        const cite = attrs.cite || attrs.by
        return createPlaceholder(
          `<blockquote class="my-8 rounded-[24px] border border-black/10 bg-[#fafaf9] px-6 py-5 text-black/75 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.25)]">
            <div class="text-base leading-8">${markdownToHtml(inner)}</div>
            ${cite ? `<footer class="mt-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-black/40">${markdownToInlineHtml(cite)}</footer>` : ''}
          </blockquote>`,
        )
      }

      if (tag === 'card') {
        return createPlaceholder(
          `<section class="my-8 rounded-[26px] border border-black/10 bg-white px-6 py-5 shadow-[0_18px_36px_-30px_rgba(15,23,42,0.22)]">${markdownToHtml(inner)}</section>`,
        )
      }

      if (tag === 'divider') {
        const label = (attrs.label || inner).trim()
        return createPlaceholder(
          `<div class="my-8 flex items-center gap-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-black/35">
            <div class="h-px flex-1 bg-black/10"></div>
            ${label ? `<span>${markdownToInlineHtml(label)}</span>` : ''}
            <div class="h-px flex-1 bg-black/10"></div>
          </div>`,
        )
      }

      if (tag === 'columns') {
        const segments = splitColumns(inner)
        const columnCount = getSafeColumnCount(attrs.count, segments.length)
        return createPlaceholder(
          `<div class="my-8 grid gap-4 ${getColumnClasses(columnCount)}">
            ${segments.map((segment) => `<div class="rounded-[22px] border border-black/10 bg-white/92 px-5 py-4">${markdownToHtml(segment)}</div>`).join('')}
          </div>`,
        )
      }

      if (tag === 'image') {
        const src = attrs.src && isSafeUrl(attrs.src) ? attrs.src : ''
        const alt = attrs.alt || ''
        const caption = attrs.caption || inner
        const width = attrs.width && /^-?\d+(?:\.\d+)?(?:px|rem|em|%)$/.test(attrs.width) ? attrs.width : '100%'
        if (!src) {
          warnings.push('An ::image block is missing a safe src attribute.')
          return ''
        }
        return createPlaceholder(
          `<figure class="my-8">
            <img src="${escapeAttribute(src)}" alt="${escapeAttribute(alt)}" loading="lazy" style="width:${escapeAttribute(width)};max-width:100%" class="mx-auto rounded-[24px] border border-black/10 bg-white shadow-[0_18px_36px_-30px_rgba(15,23,42,0.22)]" />
            ${caption ? `<figcaption class="mt-3 text-center text-sm leading-6 text-black/50">${markdownToInlineHtml(caption)}</figcaption>` : ''}
          </figure>`,
        )
      }

      if (tag === 'font') {
        const style = buildSafeInlineStyle(attrs)
        return createPlaceholder(`<span${style ? ` style="${escapeAttribute(style)}"` : ''}>${markdownToInlineHtml(inner)}</span>`)
      }
      if (tag === 'size') {
        const style = attrs.v && /^-?\d+(?:\.\d+)?(?:px|rem|em|%)$/.test(attrs.v) ? `font-size:${attrs.v}` : ''
        return createPlaceholder(`<span${style ? ` style="${escapeAttribute(style)}"` : ''}>${markdownToInlineHtml(inner)}</span>`)
      }
      if (tag === 'color') {
        const color = sanitizeColor(attrs.v)
        return createPlaceholder(`<span${color ? ` style="color:${escapeAttribute(color)}"` : ''}>${markdownToInlineHtml(inner)}</span>`)
      }
      if (tag === 'hl') {
        const color = sanitizeColor(attrs.v) ?? '#fef3c7'
        return createPlaceholder(`<mark style="background-color:${escapeAttribute(color)};padding:0.1rem 0.35rem;border-radius:0.4rem">${markdownToInlineHtml(inner)}</mark>`)
      }

      if (tag === 'slider') {
        const id = `studyml-slider-${componentCount++}`
        const min = sanitizeNumber(attrs.min, '0')
        const max = sanitizeNumber(attrs.max, '100')
        const defaultValue = sanitizeNumber(attrs.default, '50')
        const unit = escapeAttribute(attrs.unit ?? '')
        return createPlaceholder(
          `<div class="my-8 rounded-[24px] border border-black/10 bg-[#fbfbfa] p-6">
            <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
              <label class="text-sm font-semibold tracking-[-0.01em] text-black">${markdownToInlineHtml(inner)}</label>
              <span class="rounded-full bg-black px-3 py-1 text-xs font-semibold text-white">
                <span id="${id}-value">${defaultValue}</span>${unit ? ` <span data-unit="${unit}">${unit}</span>` : ''}
              </span>
            </div>
            <input class="studyml-slider h-2 w-full cursor-pointer appearance-none rounded-full bg-black/10 accent-black" data-target-id="${id}-value" id="${id}" type="range" min="${min}" max="${max}" value="${defaultValue}" />
          </div>`,
        )
      }

      if (tag === 'question') {
        const id = `studyml-question-${componentCount++}`
        const parsedQuestion = parseQuestionBody(inner, attrs)
        warnings.push(...parsedQuestion.warnings)
        const explanationHtml = parsedQuestion.explanation ? markdownToHtml(parsedQuestion.explanation) : ''
        const isShortAnswer = parsedQuestion.mode === 'short-answer'
        const optionsHtml = isShortAnswer
          ? `<label class="block">
              <span class="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-black/40">Your Answer</span>
              <textarea class="studyml-short-answer min-h-[132px] w-full rounded-[22px] border border-black/10 bg-white px-4 py-3 text-sm leading-6 text-black outline-none transition placeholder:text-black/30 focus:border-black/25" placeholder="Write the idea in your own words..."></textarea>
            </label>`
          : parsedQuestion.options.map((option, optionIndex) => {
            return `<label class="flex cursor-pointer items-start gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3 transition hover:border-black/25 hover:bg-black/[0.02]">
              <input class="mt-1 h-4 w-4 shrink-0 accent-black" type="radio" name="${id}" value="${option.isCorrect ? 'true' : 'false'}" />
              <span class="text-sm leading-6 text-black/80">
                <span class="mr-2 text-xs font-semibold uppercase tracking-[0.2em] text-black/35">${String.fromCharCode(65 + optionIndex)}</span>
                ${markdownToInlineHtml(option.text)}
              </span>
            </label>`
          }).join('')

        return createPlaceholder(
          `<div
            class="studyml-question-card my-10 rounded-[28px] border border-black/10 bg-[#fcfcfb] p-6 shadow-[0_20px_40px_-32px_rgba(15,23,42,0.35)]"
            data-answer="${escapeAttribute(parsedQuestion.answer)}"
            data-explanation-html="${escapeAttribute(explanationHtml)}"
            data-keywords="${escapeAttribute(JSON.stringify(parsedQuestion.keywords))}"
            data-question-type="${escapeAttribute(parsedQuestion.mode)}"
          >
            <div class="mb-5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-black/45">
              <span class="inline-block h-1.5 w-1.5 rounded-full bg-black/35"></span>
              Knowledge Check
            </div>
            <div class="mb-6 text-black">${markdownToHtml(parsedQuestion.prompt)}</div>
            <div class="${isShortAnswer ? '' : 'grid gap-3 md:grid-cols-2'}">${optionsHtml}</div>
            <div class="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <button class="studyml-check-answer inline-flex items-center justify-center rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-black/90" type="button">Check Answer</button>
              <div class="studyml-result text-sm leading-6 text-black/65"></div>
            </div>
          </div>`,
        )
      }

      if (tag === 'note') {
        const tone = getNoteTone(attrs.type)
        const title = attrs.title || tone.title
        return createPlaceholder(
          `<aside class="my-8 rounded-[24px] border ${tone.border} ${tone.background} p-5 text-black/80 shadow-[0_12px_24px_-22px_rgba(15,23,42,0.28)]">
            <div class="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] ${tone.label}">${markdownToInlineHtml(title)}</div>
            ${markdownToHtml(inner)}
          </aside>`,
        )
      }

      return match
    })

    if (!matched) break
  }

  let finalHtml = markdownToHtml(current)
  let swapped = true
  let swapSafety = 0

  while (swapped && swapSafety < 20) {
    swapped = false
    swapSafety += 1
    Object.entries(placeholders).forEach(([marker, html]) => {
      if (finalHtml.includes(marker)) {
        finalHtml = finalHtml.split(marker).join(html)
        swapped = true
      }
    })
  }

  if (current.includes('::')) {
    warnings.push('Some StudyML tags look unfinished or nested incorrectly.')
  }

  return {
    html: sanitizeHtml(finalHtml),
    warnings: Array.from(new Set(warnings)),
  }
}

function extractStudyMlBlocks(content: string, tag: string): ExtractedBlock[] {
  const source = normalizeStudyMl(content)
  const blocks: ExtractedBlock[] = []
  let cursor = 0
  const openToken = `::${tag}`

  while (cursor < source.length) {
    const start = source.indexOf(openToken, cursor)
    if (start === -1) break

    const open = readBlockOpen(source, start, tag)
    if (!open) {
      cursor = start + openToken.length
      continue
    }

    const closeIndex = findMatchingClose(source, open.bodyStart)
    if (closeIndex === -1) {
      break
    }

    blocks.push({
      attrs: open.attrs,
      body: source.slice(open.bodyStart, closeIndex).trim(),
      raw: source.slice(start, closeIndex + 2),
    })

    cursor = closeIndex + 2
  }

  return blocks
}

function readBlockOpen(source: string, start: number, tag: string) {
  let cursor = start + tag.length + 2
  let attrText = ''

  if (source[cursor] === '{') {
    const attrEnd = source.indexOf('}', cursor + 1)
    if (attrEnd === -1) return null
    attrText = source.slice(cursor + 1, attrEnd)
    cursor = attrEnd + 1
  }

  while (cursor < source.length && /\s/.test(source[cursor])) {
    cursor += 1
  }

  return {
    attrs: parseStudyMLAttrs(attrText),
    bodyStart: cursor,
  }
}

function findMatchingClose(source: string, start: number): number {
  let depth = 0
  let cursor = start

  while (cursor < source.length - 1) {
    if (source.startsWith('::', cursor)) {
      const nextChar = source[cursor + 2]
      if (nextChar && /[a-zA-Z]/.test(nextChar)) {
        depth += 1
        cursor += 2
        continue
      }

      if (depth === 0) {
        return cursor
      }

      depth -= 1
      cursor += 2
      continue
    }

    cursor += 1
  }

  return -1
}

function parseQuestionBody(body: string, attrs: Record<string, string>) {
  const choiceLineRe = /^\s*(?:[*-]|\d+\.)\s*(?:\[[ xX]\])?\s+/
  const lines = body
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0)

  const choiceLines = lines.filter((line) => choiceLineRe.test(line))
  const promptLines = lines.filter((line) => !choiceLineRe.test(line))
  const options = choiceLines.map((line) => {
    const cleaned = line.replace(/^\s*(?:[*-]|\d+\.)\s*/, '')
    const isCorrect = /^\[[xX]\]\s*/.test(cleaned)
    return {
      text: cleaned.replace(/^\[[ xX]\]\s*/, '').trim(),
      isCorrect,
    }
  })

  const warnings: string[] = []
  const answer = (attrs.answer ?? '').trim()
  const keywords = splitKeywords(attrs.keywords)
  const mode = options.length > 0 ? 'multiple-choice' : 'short-answer'

  if (!promptLines.join('\n').trim()) warnings.push('A StudyML question is missing its prompt.')

  if (mode === 'multiple-choice') {
    if (options.length < 2) warnings.push('A StudyML question should include at least two options.')
    if (!options.some((option) => option.isCorrect)) warnings.push('A multiple-choice StudyML question should mark one option with [x].')
  } else if (!answer && keywords.length === 0) {
    warnings.push('A short-answer StudyML question should include answer="" or keywords="" for grading.')
  }

  return {
    prompt: promptLines.join('\n').trim(),
    options,
    answer,
    explanation: attrs.explanation ?? '',
    keywords,
    mode,
    warnings,
  }
}

function splitKeywords(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((keyword) => keyword.trim())
    .filter(Boolean)
}

function markdownToHtml(markdown: string): string {
  return marked.parse(prepareMarkdown(markdown)) as string
}

function markdownToInlineHtml(markdown: string): string {
  return marked.parseInline(prepareMarkdown(markdown)) as string
}

function prepareMarkdown(markdown: string): string {
  return normalizeStudyMl(markdown)
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function sanitizeHtml(html: string): string {
  if (typeof window === 'undefined') return html

  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  Array.from(doc.body.querySelectorAll('*')).forEach((element) => {
    const tagName = element.tagName.toLowerCase()
    if (!allowedTags.has(tagName)) {
      element.replaceWith(...Array.from(element.childNodes))
      return
    }

    Array.from(element.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase()
      const value = attribute.value
      const allowed = globalAttributes.has(name) || tagAttributes[tagName]?.has(name)

      if (!allowed || name.startsWith('on')) {
        element.removeAttribute(attribute.name)
        return
      }

      if ((name === 'href' || name === 'src') && !isSafeUrl(value)) {
        element.removeAttribute(attribute.name)
        return
      }

      if (tagName === 'a' && name === 'href') {
        element.setAttribute('rel', 'noopener noreferrer')
        if (!element.getAttribute('target')) {
          element.setAttribute('target', '_blank')
        }
      }

      if (tagName === 'img' && name === 'src' && !value) {
        element.removeAttribute(attribute.name)
      }
    })
  })

  return doc.body.innerHTML
}

function isSafeUrl(value: string): boolean {
  return SAFE_URL_RE.test(value) || IMAGE_DATA_URL_RE.test(value) || !value.includes(':')
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function sanitizeColor(value?: string): string | null {
  if (!value) return null
  if (/^#[0-9a-f]{3,8}$/i.test(value)) return value
  if (/^(?:rgb|rgba|hsl|hsla)\([\d\s.,%]+\)$/i.test(value)) return value
  if (/^[a-z]+$/i.test(value)) return value
  return null
}

function sanitizeNumber(value: string | undefined, fallback: string): string {
  return value && /^-?\d+(?:\.\d+)?$/.test(value) ? value : fallback
}

function buildSafeInlineStyle(attrs: Record<string, string>): string {
  const styles: string[] = []

  if (attrs.size && /^-?\d+(?:\.\d+)?(?:px|rem|em|%)$/.test(attrs.size)) {
    styles.push(`font-size:${attrs.size}`)
  }
  if (attrs.weight && /^(?:[1-9]00|normal|bold|lighter|bolder)$/i.test(attrs.weight)) {
    styles.push(`font-weight:${attrs.weight}`)
  }
  if (attrs.color) {
    const color = sanitizeColor(attrs.color)
    if (color) styles.push(`color:${color}`)
  }
  if (attrs.bg) {
    const color = sanitizeColor(attrs.bg)
    if (color) styles.push(`background-color:${color}`)
  }
  if (attrs.align && /^(left|center|right|justify)$/i.test(attrs.align)) {
    styles.push(`text-align:${attrs.align}`)
  }
  if (attrs.lh && /^-?\d+(?:\.\d+)?(?:px|rem|em|%)?$/.test(attrs.lh)) {
    styles.push(`line-height:${attrs.lh}`)
  }
  if (attrs.family && /^[a-zA-Z0-9\s,-]+$/.test(attrs.family)) {
    styles.push(`font-family:${attrs.family},sans-serif`)
  }

  return styles.join(';')
}

function splitColumns(inner: string): string[] {
  const segments = inner
    .split(/\n\s*\|\|\|\s*\n/g)
    .map((segment) => segment.trim())
    .filter(Boolean)

  return segments.length > 0 ? segments : [inner]
}

function getSafeColumnCount(rawCount: string | undefined, segmentCount: number): number {
  const parsed = rawCount ? Number.parseInt(rawCount, 10) : segmentCount
  if (!Number.isFinite(parsed)) return Math.max(1, Math.min(4, segmentCount || 1))
  return Math.max(1, Math.min(4, parsed))
}

function getColumnClasses(count: number): string {
  switch (count) {
    case 4:
      return 'md:grid-cols-2 xl:grid-cols-4'
    case 3:
      return 'md:grid-cols-3'
    case 2:
      return 'md:grid-cols-2'
    default:
      return 'grid-cols-1'
  }
}

function getNoteTone(type?: string) {
  switch ((type ?? 'info').toLowerCase()) {
    case 'warning':
      return {
        title: 'Warning',
        background: 'bg-[#fff7ed]',
        border: 'border-[#fdba74]',
        label: 'text-[#c2410c]',
      }
    case 'success':
      return {
        title: 'Success',
        background: 'bg-[#ecfdf5]',
        border: 'border-[#86efac]',
        label: 'text-[#15803d]',
      }
    case 'danger':
      return {
        title: 'Important',
        background: 'bg-[#fff1f2]',
        border: 'border-[#fda4af]',
        label: 'text-[#be123c]',
      }
    case 'info':
    default:
      return {
        title: 'Note',
        background: 'bg-[#eff6ff]',
        border: 'border-[#93c5fd]',
        label: 'text-[#1d4ed8]',
      }
  }
}
