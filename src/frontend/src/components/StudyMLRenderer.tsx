import { useEffect, useMemo, useRef } from 'react'
import { cn } from '@/lib/utils'
import { gradeAnswer } from '@/lib/api'
import { renderStudyMlToHtml } from '@/lib/studyml'

interface Props {
  content: string
  variant?: 'page' | 'inline'
  className?: string
  showWarnings?: boolean
}

export default function StudyMLRenderer({
  content,
  variant = 'inline',
  className,
  showWarnings = false,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const rendered = useMemo(() => renderStudyMlToHtml(content), [content])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const normalizeAnswer = (value: string) => value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    const handleInput = (event: Event) => {
      const target = event.target as HTMLInputElement | null
      if (!target?.classList.contains('studyml-slider')) return

      const targetId = target.getAttribute('data-target-id')
      if (!targetId) return

      const valueNode = root.querySelector<HTMLElement>(`#${targetId}`)
      if (valueNode) {
        valueNode.innerText = target.value
      }
    }

    const handleClick = async (event: MouseEvent) => {
      const button = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>('.studyml-check-answer')
      if (!button) return

      const card = button.closest<HTMLElement>('.studyml-question-card')
      if (!card) return

      const result = card.querySelector<HTMLElement>('.studyml-result')
      if (!result) return

      const explanationHtml = card.dataset.explanationHtml ?? ''
      const questionType = card.dataset.questionType ?? 'multiple-choice'

      if (questionType === 'short-answer') {
        const field = card.querySelector<HTMLTextAreaElement>('.studyml-short-answer')
        const userAnswer = field?.value.trim() ?? ''
        const modelAnswer = normalizeAnswer(card.dataset.answer ?? '')
        let keywords: string[] = []
        try {
          keywords = JSON.parse(card.dataset.keywords ?? '[]') as string[]
        } catch {
          keywords = []
        }
        const normalizedInput = normalizeAnswer(userAnswer)
        const matchedKeywords = keywords.filter((keyword) => normalizedInput.includes(normalizeAnswer(keyword)))
        const missingKeywords = keywords.filter((keyword) => !normalizedInput.includes(normalizeAnswer(keyword)))
        const hasDirectMatch = Boolean(modelAnswer) && (
          normalizedInput === modelAnswer
          || normalizedInput.includes(modelAnswer)
          || (normalizedInput.length > 12 && modelAnswer.includes(normalizedInput))
        )
        const isCorrect = hasDirectMatch || (keywords.length > 0 && matchedKeywords.length === keywords.length)

        if (!userAnswer) {
          result.innerHTML = '<span class="font-medium text-[#b45309]">Write an answer first.</span>'
          return
        }

        const setLocalFeedback = () => {
          if (isCorrect) {
            result.innerHTML = `
              <div class="rounded-2xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-[#166534]">
                <div class="font-semibold">Strong answer.</div>
                <div class="mt-1 text-sm leading-6 text-[#166534]/85">You captured the core idea in your own words.</div>
                ${explanationHtml ? `<div class="mt-2 text-sm leading-6 text-[#166534]/85">${explanationHtml}</div>` : ''}
              </div>
            `
          } else {
            const feedback = missingKeywords.length > 0
              ? `Try to mention: ${missingKeywords.join(', ')}.`
              : 'Tighten the answer so it states the key relationship more directly.'
            result.innerHTML = `
              <div class="rounded-2xl border border-[#fed7aa] bg-[#fff7ed] px-4 py-3 text-[#9a3412]">
                <div class="font-semibold">Close, but it needs one more idea.</div>
                <div class="mt-1 text-sm leading-6 text-[#9a3412]/80">${feedback}</div>
                ${explanationHtml ? `<div class="mt-2 text-sm leading-6 text-[#9a3412]/80">${explanationHtml}</div>` : ''}
              </div>
            `
          }
        }

        const previousLabel = button.innerHTML
        button.disabled = true
        button.innerHTML = 'Checking...'

        try {
          const response = await gradeAnswer({
            user_answer: userAnswer,
            correct_answer: card.dataset.answer ?? '',
            keywords,
          })

          const feedback = response.data
          const tone = feedback.score >= 80
            ? {
                border: 'border-[#bbf7d0]',
                background: 'bg-[#f0fdf4]',
                text: 'text-[#166534]',
                title: 'Strong answer.',
              }
            : {
                border: 'border-[#fed7aa]',
                background: 'bg-[#fff7ed]',
                text: 'text-[#9a3412]',
                title: 'Close, but it needs one more idea.',
              }

          const missingConcepts = feedback.missing_concepts?.length
            ? `<div class="mt-3 flex flex-wrap gap-2">
                ${feedback.missing_concepts.map((concept) => `<span class="rounded-full border border-current/10 bg-white/70 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]">${concept}</span>`).join('')}
              </div>`
            : ''

          result.innerHTML = `
            <div class="rounded-2xl border ${tone.border} ${tone.background} px-4 py-3 ${tone.text}">
              <div class="font-semibold">${tone.title}</div>
              <div class="mt-1 text-sm leading-6 ${tone.text}" style="opacity:0.85">${feedback.feedback}</div>
              ${missingConcepts}
              ${explanationHtml ? `<div class="mt-2 text-sm leading-6 ${tone.text}" style="opacity:0.85">${explanationHtml}</div>` : ''}
            </div>
          `
        } catch {
          setLocalFeedback()
        } finally {
          button.disabled = false
          button.innerHTML = previousLabel
        }

        return
      }

      const selected = card.querySelector<HTMLInputElement>('input[type="radio"]:checked')
      if (!selected) {
        result.innerHTML = '<span class="font-medium text-[#b45309]">Choose an answer first.</span>'
        return
      }

      if (selected.value === 'true') {
        result.innerHTML = `
          <div class="rounded-2xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-[#166534]">
            <div class="font-semibold">Correct.</div>
            ${explanationHtml ? `<div class="mt-2 text-sm leading-6 text-[#166534]/85">${explanationHtml}</div>` : ''}
          </div>
        `
      } else {
        result.innerHTML = `
          <div class="rounded-2xl border border-[#fed7aa] bg-[#fff7ed] px-4 py-3 text-[#9a3412]">
            <div class="font-semibold">Not quite yet.</div>
            <div class="mt-1 text-sm leading-6 text-[#9a3412]/80">Try again and look for the most conceptually precise choice.</div>
          </div>
        `
      }
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'studyml:resize' || !event.data?.iframeId) return
      const iframe = root.querySelector<HTMLIFrameElement>(`#${event.data.iframeId}`)
      if (iframe && typeof event.data.height === 'number') {
        iframe.style.height = `${Math.max(240, event.data.height + 8)}px`
      }
    }

    root.addEventListener('input', handleInput)
    root.addEventListener('click', handleClick)
    window.addEventListener('message', handleMessage)

    return () => {
      root.removeEventListener('input', handleInput)
      root.removeEventListener('click', handleClick)
      window.removeEventListener('message', handleMessage)
    }
  }, [rendered.html])

  const contentNode = (
    <div
      ref={rootRef}
      className={cn(
        'studyml-content prose prose-stone max-w-none',
        'prose-headings:font-semibold prose-headings:tracking-[-0.03em] prose-headings:text-black',
        'prose-p:text-black/75 prose-p:leading-8 prose-strong:text-black prose-li:text-black/75',
        'prose-code:rounded prose-code:bg-black/[0.04] prose-code:px-1.5 prose-code:py-0.5 prose-code:text-[0.92em] prose-code:text-black',
        'prose-pre:rounded-[24px] prose-pre:border prose-pre:border-black/10 prose-pre:bg-[#111827] prose-pre:text-white',
        'prose-blockquote:border-l-black/15 prose-blockquote:text-black/65',
        'prose-a:text-black prose-a:underline prose-a:decoration-black/20 prose-a:underline-offset-4',
        'prose-img:rounded-[20px] prose-img:border prose-img:border-black/10',
        variant === 'page' && [
          'rounded-[32px] border border-black/10 bg-white/92 px-6 py-8 shadow-[0_28px_60px_-36px_rgba(15,23,42,0.28)] backdrop-blur-sm',
          'sm:px-8 sm:py-10 lg:px-14 lg:py-14',
          'prose-h1:text-4xl prose-h2:text-2xl prose-h3:text-xl',
        ],
        variant === 'inline' && [
          'prose-sm sm:prose-base',
          'prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg',
        ],
        className,
      )}
      dangerouslySetInnerHTML={{ __html: rendered.html }}
    />
  )

  if (variant === 'page') {
    return (
      <div className="space-y-4">
        <div className="relative overflow-hidden rounded-[36px] bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.95),_rgba(248,250,252,0.78)_55%,_rgba(241,245,249,0.72))] p-2 sm:p-3">
          <div className="pointer-events-none absolute inset-0 opacity-70 [background-image:linear-gradient(to_right,rgba(15,23,42,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.03)_1px,transparent_1px)] [background-size:24px_24px]" />
          <div className="relative">{contentNode}</div>
        </div>
        {showWarnings && rendered.warnings.length > 0 && (
          <div className="rounded-[24px] border border-[#fed7aa] bg-[#fff7ed] px-4 py-3 text-sm text-[#9a3412]">
            {rendered.warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {contentNode}
      {showWarnings && rendered.warnings.length > 0 && (
        <div className="rounded-2xl border border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-xs text-[#92400e]">
          {rendered.warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      )}
    </div>
  )
}
