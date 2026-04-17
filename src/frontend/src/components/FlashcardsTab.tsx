import { ReactNode, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Brain, FileText, Gamepad2, RotateCcw, Sparkles, TimerReset } from 'lucide-react'
import { Content, getFlashcardStats, getNextFlashcard, submitFlashcardReview } from '@/lib/api'
import { parseFlashcards } from '@/lib/studyml'
import MatchingMode from './MatchingMode'
import StudyMLRenderer from './StudyMLRenderer'
import Button from './ui/Button'
import { Card, CardContent } from './ui/Card'

interface Props {
  content: Content
}

type FlashcardMode = 'practice' | 'write' | 'match'

export default function FlashcardsTab({ content }: Props) {
  const [mode, setMode] = useState<FlashcardMode>('practice')
  const [flipped, setFlipped] = useState(false)
  const [practiceMode, setPracticeMode] = useState(false)
  const [writeDraft, setWriteDraft] = useState('')
  const [writeRevealed, setWriteRevealed] = useState(false)
  const queryClient = useQueryClient()

  const flashcards = useMemo(() => parseFlashcards(content.studyml_content), [content.studyml_content])

  const { data: cardData, isFetching } = useQuery({
    queryKey: ['flashcard-next', content.id, practiceMode],
    queryFn: async () => {
      const res = await getNextFlashcard(content.id, practiceMode)
      return res.data
    },
  })

  const { data: stats } = useQuery({
    queryKey: ['flashcard-stats', content.id],
    queryFn: async () => {
      const res = await getFlashcardStats(content.id)
      return res.data
    },
  })

  const reviewMutation = useMutation({
    mutationFn: (quality: number) =>
      submitFlashcardReview(content.id, {
        flashcard_index: cardData?.flashcard_index || 0,
        quality,
      }),
    onSuccess: async () => {
      resetCardState()
      await queryClient.refetchQueries({ queryKey: ['flashcard-next', content.id, practiceMode] })
      await queryClient.refetchQueries({ queryKey: ['flashcard-stats', content.id] })
    },
  })

  useEffect(() => {
    resetCardState()
  }, [cardData?.flashcard_index, mode, practiceMode])

  useEffect(() => {
    if (isFetching) resetCardState()
  }, [isFetching])

  const resetCardState = () => {
    setFlipped(false)
    setWriteDraft('')
    setWriteRevealed(false)
  }

  if (cardData?.message) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <Card className="overflow-hidden border-black/10 shadow-[0_24px_50px_-34px_rgba(15,23,42,0.28)]">
          <div className="h-24 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.95),_rgba(240,253,244,0.88),_rgba(220,252,231,0.74))]" />
          <CardContent className="relative -mt-10 p-12">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-emerald-200 bg-white text-emerald-600 shadow-sm">
              <Sparkles className="h-7 w-7" />
            </div>
            <h3 className="mb-4 text-2xl font-bold">Session complete</h3>
            <p className="mb-6 text-muted-foreground">{cardData.message}</p>
            {stats && (
              <div className="mb-6 grid grid-cols-3 gap-4">
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4">
                  <p className="text-2xl font-bold text-emerald-600">{stats.mastered}</p>
                  <p className="text-sm text-muted-foreground">Mastered</p>
                </div>
                <div className="rounded-2xl border border-sky-100 bg-sky-50/80 p-4">
                  <p className="text-2xl font-bold text-sky-600">{stats.learning}</p>
                  <p className="text-sm text-muted-foreground">Learning</p>
                </div>
                <div className="rounded-2xl border border-black/10 bg-[#fafaf9] p-4">
                  <p className="text-2xl font-bold text-gray-600">{stats.new}</p>
                  <p className="text-sm text-muted-foreground">New</p>
                </div>
              </div>
            )}
            <div className="flex flex-wrap justify-center gap-3">
              <Button
                onClick={() => {
                  setPracticeMode(false)
                }}
                className="rounded-full px-6"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Review Due Cards
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setPracticeMode(true)
                }}
                className="rounded-full px-6"
              >
                <TimerReset className="mr-2 h-4 w-4" />
                Loop All Cards
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!cardData?.content) {
    return <div className="py-12 text-center text-muted-foreground">Loading flashcards...</div>
  }

  const activeCard = flashcards[cardData.flashcard_index]
  const front = cardData.content.front || activeCard?.front || 'No front content'
  const back = cardData.content.back || activeCard?.back || 'No back content'
  const reviewVisible = mode === 'practice' ? flipped : mode === 'write' ? writeRevealed : false

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 rounded-[30px] border border-black/10 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.98),_rgba(244,248,252,0.9),_rgba(236,242,248,0.76))] p-6 shadow-[0_24px_50px_-38px_rgba(15,23,42,0.3)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-black/45">Recall Engine</p>
            <h2 className="text-3xl font-semibold tracking-[-0.04em] text-black">Flashcard Deck</h2>
            <p className="mt-3 inline-flex rounded-full border border-black/10 bg-white/90 px-3 py-1 text-[12px] font-medium text-black/60">
              {content.title}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-black/55">
            <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/85 px-3 py-2">
              <Brain className="h-4 w-4" />
              {flashcards.length} cards
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/85 px-3 py-2">
              <TimerReset className="h-4 w-4" />
              {practiceMode ? 'All cards rotation' : 'Due cards first'}
            </span>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          {stats && (
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-emerald-700">
                Mastered: <span className="font-semibold">{stats.mastered}</span>
              </span>
              <span className="rounded-full border border-sky-100 bg-sky-50 px-3 py-1.5 text-sky-700">
                Learning: <span className="font-semibold">{stats.learning}</span>
              </span>
              <span className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-black/60">
                New: <span className="font-semibold text-black">{stats.new}</span>
              </span>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <div className="flex rounded-2xl bg-black/[0.04] p-1">
              <button
                onClick={() => setPracticeMode(false)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${!practiceMode ? 'bg-white text-black shadow-sm' : 'text-black/50 hover:text-black'}`}
              >
                Due Now
              </button>
              <button
                onClick={() => setPracticeMode(true)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${practiceMode ? 'bg-white text-black shadow-sm' : 'text-black/50 hover:text-black'}`}
              >
                All Cards
              </button>
            </div>

            <div className="flex rounded-2xl bg-black/[0.04] p-1">
              <ModeButton label="Practice" active={mode === 'practice'} onClick={() => setMode('practice')} icon={<Brain className="h-4 w-4" />} />
              <ModeButton label="Write" active={mode === 'write'} onClick={() => setMode('write')} icon={<FileText className="h-4 w-4" />} />
              <ModeButton label="Match" active={mode === 'match'} onClick={() => setMode('match')} icon={<Gamepad2 className="h-4 w-4" />} />
            </div>
          </div>
        </div>
      </div>

      {mode === 'match' ? (
        <MatchingMode content={content} />
      ) : mode === 'write' ? (
        <WriteModePanel
          front={front}
          back={back}
          cardIndex={cardData.flashcard_index}
          totalCards={flashcards.length}
          draft={writeDraft}
          revealed={writeRevealed}
          onDraftChange={setWriteDraft}
          onReveal={() => setWriteRevealed(true)}
        />
      ) : (
        <PracticeModePanel
          front={front}
          back={back}
          cardIndex={cardData.flashcard_index}
          totalCards={flashcards.length}
          flipped={flipped}
          onFlip={() => setFlipped((current) => !current)}
        />
      )}

      {reviewVisible && (
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <ReviewButton label="Again" quality={0} onReview={reviewMutation.mutate} variant="outline" />
          <ReviewButton label="Hard" quality={1} onReview={reviewMutation.mutate} variant="outline" />
          <ReviewButton label="Good" quality={2} onReview={reviewMutation.mutate} variant="secondary" />
          <ReviewButton label="Easy" quality={3} onReview={reviewMutation.mutate} />
        </div>
      )}
    </div>
  )
}

function PracticeModePanel({
  front,
  back,
  cardIndex,
  totalCards,
  flipped,
  onFlip,
}: {
  front: string
  back: string
  cardIndex: number
  totalCards: number
  flipped: boolean
  onFlip: () => void
}) {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="cursor-pointer" key={cardIndex} onClick={onFlip}>
        <Card className="min-h-[360px] overflow-hidden border-black/10 bg-white shadow-[0_28px_60px_-36px_rgba(15,23,42,0.32)]">
          <div className="px-6 pt-6 sm:px-8 sm:pt-8">
            <div className="rounded-[24px] border border-black/10 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.98),_rgba(243,247,250,0.94),_rgba(232,239,244,0.85))] px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/45">
                  {flipped ? 'Answer' : 'Prompt'}
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/35">
                  {flipped ? 'Rate recall honesty' : `Card ${cardIndex + 1} of ${totalCards}`}
                </p>
              </div>
            </div>
          </div>
          <CardContent className="p-6 pt-5 sm:p-8 sm:pt-6">
            <div className="flex min-h-[240px] items-center justify-center rounded-[28px] border border-black/10 bg-[#fcfcfa] p-8 sm:p-10">
              {!flipped ? (
                <div className="w-full text-center">
                  <div className="text-xl">
                    <StudyMLRenderer content={front} />
                  </div>
                  <p className="mt-12 text-xs text-muted-foreground">Tap to reveal the answer, then rate how quickly it came back.</p>
                </div>
              ) : (
                <div className="w-full text-center">
                  <div className="text-xl">
                    <StudyMLRenderer content={back} />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function WriteModePanel({
  front,
  back,
  cardIndex,
  totalCards,
  draft,
  revealed,
  onDraftChange,
  onReveal,
}: {
  front: string
  back: string
  cardIndex: number
  totalCards: number
  draft: string
  revealed: boolean
  onDraftChange: (value: string) => void
  onReveal: () => void
}) {
  return (
    <div className="mx-auto max-w-3xl">
      <Card className="overflow-hidden border-black/10 bg-white shadow-[0_28px_60px_-36px_rgba(15,23,42,0.32)]">
        <div className="px-6 pt-6 sm:px-8 sm:pt-8">
          <div className="flex items-center justify-between gap-3 rounded-[24px] border border-black/10 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.98),_rgba(243,247,250,0.94),_rgba(232,239,244,0.85))] px-5 py-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Written Recall</p>
              <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-black/35">
                Card {cardIndex + 1} of {totalCards}
              </p>
            </div>
            <span className="rounded-full border border-black/10 bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-black/55">
              Generation effect
            </span>
          </div>
        </div>
        <CardContent className="space-y-6 p-6 pt-5 sm:p-8 sm:pt-6">
          <div className="rounded-[28px] border border-black/10 bg-[#fcfcfa] p-6">
            <StudyMLRenderer content={front} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-black/70">Write the answer from memory before revealing it.</label>
            <textarea
              value={draft}
              onChange={(event) => onDraftChange(event.target.value)}
              className="min-h-[160px] w-full rounded-[24px] border border-black/10 bg-[#fafaf9] p-5 text-base leading-7 outline-none transition focus:border-black/20 focus:bg-white"
              placeholder="Type what you can remember without looking..."
            />
          </div>

          {!revealed ? (
            <div className="flex justify-end">
              <Button onClick={onReveal} className="rounded-full px-6" disabled={!draft.trim()}>
                Reveal Model Answer
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[24px] border border-black/10 bg-[#fafaf9] p-5">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-black/40">Your Answer</p>
                <p className="whitespace-pre-wrap text-sm leading-7 text-black/70">{draft.trim() || 'No answer written.'}</p>
              </div>
              <div className="rounded-[24px] border border-emerald-100 bg-emerald-50/70 p-5">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">Model Answer</p>
                <StudyMLRenderer content={back} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function ModeButton({
  label,
  active,
  onClick,
  icon,
}: {
  label: string
  active: boolean
  onClick: () => void
  icon: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold transition ${
        active ? 'bg-white text-black shadow-sm' : 'text-black/50 hover:text-black'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

function ReviewButton({
  label,
  quality,
  onReview,
  variant = 'default',
}: {
  label: string
  quality: number
  onReview: (quality: number) => void
  variant?: 'default' | 'secondary' | 'outline'
}) {
  return (
    <Button
      variant={variant}
      className="min-w-[130px] rounded-full"
      onClick={(event) => {
        event.stopPropagation()
        onReview(quality)
      }}
    >
      {label}
    </Button>
  )
}
