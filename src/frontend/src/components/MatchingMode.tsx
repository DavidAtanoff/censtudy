import { useEffect, useMemo, useRef, useState } from 'react'
import { Play, RotateCcw, Trophy } from 'lucide-react'
import { Content } from '@/lib/api'
import { parseFlashcards } from '@/lib/studyml'
import StudyMLRenderer from './StudyMLRenderer'
import Button from './ui/Button'
import { Card, CardContent } from './ui/Card'

interface Props {
  content: Content
}

interface MatchItem {
  id: string
  text: string
  type: 'term' | 'definition'
  pairId: string
  matched: boolean
}

interface MatchFeedback {
  type: 'correct' | 'wrong'
  ids: string[]
}

export default function MatchingMode({ content }: Props) {
  const [playing, setPlaying] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [items, setItems] = useState<MatchItem[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<MatchFeedback | null>(null)
  const [time, setTime] = useState(0)
  const [bestTime, setBestTime] = useState<number | null>(() => {
    const saved = localStorage.getItem(`match-best-${content.id}`)
    return saved ? Number.parseFloat(saved) : null
  })
  const feedbackTimerRef = useRef<number | null>(null)

  const deck = useMemo(() => {
    return parseFlashcards(content.studyml_content)
      .filter((card) => card.front && card.back)
      .map((card) => ({
        id: `pair-${card.index}`,
        term: card.front,
        definition: card.back,
      }))
  }, [content.studyml_content])

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) {
        window.clearTimeout(feedbackTimerRef.current)
      }
    }
  }, [])

  const startGame = () => {
    if (feedbackTimerRef.current) {
      window.clearTimeout(feedbackTimerRef.current)
      feedbackTimerRef.current = null
    }

    const nextItems: MatchItem[] = []
    deck.forEach((pair) => {
      nextItems.push({ id: `t-${pair.id}`, text: pair.term, type: 'term', pairId: pair.id, matched: false })
      nextItems.push({ id: `d-${pair.id}`, text: pair.definition, type: 'definition', pairId: pair.id, matched: false })
    })

    for (let index = nextItems.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1))
      ;[nextItems[index], nextItems[swapIndex]] = [nextItems[swapIndex], nextItems[index]]
    }

    setItems(nextItems)
    setPlaying(true)
    setCompleted(false)
    setSelected(null)
    setFeedback(null)
    setTime(0)
  }

  useEffect(() => {
    let intervalId: number | undefined
    if (playing && !completed) {
      intervalId = window.setInterval(() => setTime((current) => current + 0.1), 100)
    }
    return () => {
      if (intervalId) window.clearInterval(intervalId)
    }
  }, [playing, completed])

  const handleSelect = (id: string) => {
    if (completed || feedback) return

    const clicked = items.find((item) => item.id === id)
    if (!clicked || clicked.matched) return

    if (!selected) {
      setSelected(id)
      return
    }

    if (selected === id) {
      setSelected(null)
      return
    }

    const selectedItem = items.find((item) => item.id === selected)
    if (!selectedItem) {
      setSelected(null)
      return
    }

    const feedbackIds = [selectedItem.id, clicked.id]
    if (selectedItem.pairId === clicked.pairId && selectedItem.type !== clicked.type) {
      setFeedback({ type: 'correct', ids: feedbackIds })
      setSelected(null)

      feedbackTimerRef.current = window.setTimeout(() => {
        const nextItems = items.map((item) =>
          feedbackIds.includes(item.id) ? { ...item, matched: true } : item,
        )
        setItems(nextItems)
        setFeedback(null)
        feedbackTimerRef.current = null

        if (nextItems.every((item) => item.matched)) {
          setCompleted(true)
          if (!bestTime || time < bestTime) {
            setBestTime(time)
            localStorage.setItem(`match-best-${content.id}`, time.toString())
          }
        }
      }, 360)
      return
    }

    setFeedback({ type: 'wrong', ids: feedbackIds })
    setSelected(null)
    feedbackTimerRef.current = window.setTimeout(() => {
      setFeedback(null)
      feedbackTimerRef.current = null
    }, 420)
  }

  if (!playing) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <Card className="border-black/10 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.98),_rgba(238,242,255,0.84),_rgba(224,231,255,0.68))] shadow-[0_26px_52px_-40px_rgba(15,23,42,0.28)]">
          <CardContent className="p-16">
            <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-white text-indigo-600 shadow-sm">
              <Play className="h-10 w-10 pl-1" />
            </div>
            <h2 className="mb-4 text-3xl font-black tracking-tight">Match Mode</h2>
            <p className="mx-auto mb-8 max-w-sm text-lg leading-relaxed text-muted-foreground">
              Pair prompts and answers fast enough that recognition turns into recall.
            </p>
            {bestTime && (
              <div className="mx-auto mb-8 flex w-max items-center justify-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 font-bold text-amber-600">
                <Trophy className="h-4 w-4" />
                Best Time: {bestTime.toFixed(1)}s
              </div>
            )}
            <Button onClick={startGame} size="lg" className="h-14 rounded-full px-12 text-lg">
              Start Game
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (completed) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <Card className="border-emerald-100 bg-emerald-50/80 shadow-[0_26px_52px_-40px_rgba(15,23,42,0.28)]">
          <CardContent className="p-16">
            <Trophy className="mx-auto mb-6 h-20 w-20 text-emerald-500" />
            <h2 className="mb-4 text-4xl font-black tracking-tight text-emerald-900">Board Cleared!</h2>
            <p className="mb-8 text-2xl font-bold text-emerald-700">Time: {time.toFixed(1)} seconds</p>
            <Button onClick={startGame} size="lg" className="h-14 rounded-full bg-emerald-600 px-12 text-lg hover:bg-emerald-700">
              <RotateCcw className="mr-2 h-5 w-5" />
              Play Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-xl font-black tracking-tight">
          <div className="h-3 w-3 rounded-full bg-indigo-500 animate-pulse" />
          Match Mode
        </h3>
        <div className="rounded-lg bg-indigo-50 px-4 py-1 text-2xl font-bold font-mono text-indigo-600">{time.toFixed(1)}s</div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {items.map((item) => {
          const isSelected = selected === item.id
          const feedbackType = feedback?.ids.includes(item.id) ? feedback.type : null
          return (
            <button
              key={item.id}
              onClick={() => handleSelect(item.id)}
              disabled={item.matched}
              className={[
                'relative flex min-h-[120px] items-center justify-center rounded-2xl border-2 bg-white p-6 text-center text-left shadow-sm transition-all duration-200',
                item.matched ? 'pointer-events-none scale-95 opacity-0' : 'scale-100 opacity-100',
                isSelected ? 'border-indigo-500 bg-indigo-50 shadow-md ring-2 ring-indigo-200' : 'border-border/50 hover:border-indigo-300 hover:shadow-md',
                feedbackType === 'wrong' ? 'animate-shake border-rose-400 bg-rose-50 text-rose-900 ring-2 ring-rose-200' : '',
                feedbackType === 'correct' ? 'border-emerald-400 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-200' : '',
              ].join(' ')}
            >
              <div className="pointer-events-none text-sm font-medium">
                <StudyMLRenderer content={item.text} />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
