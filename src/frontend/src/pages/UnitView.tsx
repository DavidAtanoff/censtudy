import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, BookOpen, CheckCircle, FileText, Layers, MessageSquareText, Plus } from 'lucide-react'
import { getContent, getCurrentUser, getUnit, updateUserStats } from '@/lib/api'
import { analyzeStudyMl } from '@/lib/studyml'
import AITutorTab from '@/components/AITutorTab'
import DriveTab from '@/components/DriveTab'
import FlashcardsTab from '@/components/FlashcardsTab'
import QuizTab from '@/components/QuizTab'
import StudyGuideTab from '@/components/StudyGuideTab'
import Button from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

type TabType = 'study-guide' | 'flashcards' | 'quiz' | 'drive' | 'ai-tutor'

export default function UnitView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const unitId = Number(id)

  const [activeTab, setActiveTab] = useState<TabType>('study-guide')
  const [selectedFlashcardId, setSelectedFlashcardId] = useState<number | null>(null)
  const [selectedQuizId, setSelectedQuizId] = useState<number | null>(null)
  const startTimeRef = useRef<number>(Date.now())
  const currentContentIdRef = useRef<number | null>(null)

  const { data: unit, isError: unitError } = useQuery({
    queryKey: ['unit', unitId],
    queryFn: async () => {
      const res = await getUnit(unitId)
      return res.data
    },
    retry: false,
  })

  const { data: content } = useQuery({
    queryKey: ['content', unitId],
    queryFn: async () => {
      const res = await getContent(unitId)
      return res.data
    },
    enabled: !!unit,
  })

  const { data: currentUser } = useQuery({
    queryKey: ['auth-user'],
    queryFn: async () => {
      const res = await getCurrentUser()
      return res.data
    },
    retry: false,
    staleTime: 60_000,
  })

  const studyGuide = content?.find((item) => item.content_type === 'study-guide')
  const flashcardDecks = content?.filter((item) => item.content_type === 'flashcard-deck') || []
  const quizzes = content?.filter((item) => item.content_type === 'quiz') || []
  const selectedFlashcardDeck = flashcardDecks.find((deck) => deck.id === selectedFlashcardId) ?? null
  const selectedQuiz = quizzes.find((quiz) => quiz.id === selectedQuizId) ?? null

  const guideMetrics = useMemo(
    () => analyzeStudyMl(studyGuide?.studyml_content || '', 'study-guide'),
    [studyGuide?.studyml_content],
  )
  const totalFlashcards = useMemo(
    () => flashcardDecks.reduce((sum, deck) => sum + analyzeStudyMl(deck.studyml_content, 'flashcard-deck').flashcardCount, 0),
    [flashcardDecks],
  )

  useEffect(() => {
    if (unitError) navigate('/404')
  }, [navigate, unitError])

  useEffect(() => {
    if (selectedFlashcardId && !flashcardDecks.some((deck) => deck.id === selectedFlashcardId)) {
      setSelectedFlashcardId(null)
    }
  }, [flashcardDecks, selectedFlashcardId])

  useEffect(() => {
    const trackTime = async () => {
      if (!currentContentIdRef.current) return

      const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000)
      if (timeSpent <= 5) return
      if (!currentUser?.id) return

      try {
        await updateUserStats(currentUser.id, currentContentIdRef.current, { time_spent_seconds: timeSpent })
      } catch (error) {
        console.error('Failed to track stats:', error)
      }
    }

    return () => {
      void trackTime()
    }
  }, [currentUser?.id])

  useEffect(() => {
    startTimeRef.current = Date.now()

    if (activeTab === 'study-guide' && studyGuide) {
      currentContentIdRef.current = studyGuide.id
      return
    }
    if (activeTab === 'flashcards' && selectedFlashcardDeck) {
      currentContentIdRef.current = selectedFlashcardDeck.id
      return
    }
    if (activeTab === 'quiz' && selectedQuiz) {
      currentContentIdRef.current = selectedQuiz.id
      return
    }

    currentContentIdRef.current = null
  }, [activeTab, selectedFlashcardDeck, selectedQuiz, studyGuide])

  const tabs: Array<{ id: TabType; label: string; icon: typeof FileText }> = [
    { id: 'study-guide', label: 'Study Guide', icon: FileText },
    { id: 'flashcards', label: 'Flashcards', icon: Layers },
    { id: 'quiz', label: 'Quizzes', icon: CheckCircle },
    { id: 'ai-tutor', label: 'AI Tutor', icon: MessageSquareText },
    { id: 'drive', label: 'Unit Drive', icon: BookOpen },
  ]

  const switchTab = (tab: TabType) => {
    setActiveTab(tab)
    if (tab !== 'quiz') setSelectedQuizId(null)
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.98),_rgba(248,250,252,0.92),_rgba(241,245,249,0.82))]">
      <header className="sticky top-0 z-20 border-b border-black/5 bg-white/80 backdrop-blur-xl">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <Button variant="ghost" onClick={() => navigate(unit?.course_id ? `/course/${unit.course_id}` : '/')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Course
          </Button>
          <Link to={`/edit/unit/${unitId}`}>
            <Button variant="outline">Edit Unit</Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <section className="rounded-[34px] border border-black/10 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.98),_rgba(249,250,251,0.9),_rgba(241,245,249,0.74))] p-6 shadow-[0_24px_56px_-40px_rgba(15,23,42,0.32)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/90 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-black/45">
                <BookOpen className="h-3.5 w-3.5" />
                Learning Loop
              </p>
              <h1 className="text-4xl font-semibold tracking-[-0.05em] text-black">{unit?.title}</h1>
              <p className="mt-3 max-w-xl text-sm leading-7 text-black/60">
                {unit?.description || 'Study the explanation, drill the cards in multiple ways, then pressure-test yourself with quizzes and targeted tutoring.'}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
              <SummaryChip label="Pages" value={guideMetrics.pageCount.toString()} />
              <SummaryChip label="Checks" value={guideMetrics.questionCount.toString()} />
              <SummaryChip label="Cards" value={totalFlashcards.toString()} />
              <SummaryChip label="Quizzes" value={quizzes.length.toString()} />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {tabs.map((tab, index) => (
              <button
                key={tab.id}
                onClick={() => switchTab(tab.id)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeTab === tab.id
                    ? 'bg-black text-white shadow-sm'
                    : 'border border-black/10 bg-white/90 text-black/60 hover:border-black/20 hover:text-black'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{index + 1}. {tab.label}</span>
              </button>
            ))}
          </div>
        </section>

        <div className="mt-8">
          {activeTab === 'study-guide' && (
            studyGuide ? (
              <div className="space-y-4">
                <InlineEditLink href={`/edit/content/${studyGuide.id}`} label="Edit Guide" />
                <StudyGuideTab content={studyGuide} />
              </div>
            ) : (
              <EmptyState
                icon={FileText}
                title="No study guide yet"
                description="Start with the guide first so the rest of the unit has a strong source of truth."
                href={`/create/content/${unitId}?type=study-guide`}
                cta="Create Study Guide"
              />
            )
          )}

          {activeTab === 'flashcards' && (
            selectedFlashcardDeck ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    {flashcardDecks.length > 1 && (
                      <Button variant="ghost" size="sm" onClick={() => setSelectedFlashcardId(null)}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        All Decks
                      </Button>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Link to={`/create/content/${unitId}?type=flashcard-deck`}>
                      <Button variant="ghost" size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Another Deck
                      </Button>
                    </Link>
                    <Link to={`/edit/content/${selectedFlashcardDeck.id}`}>
                      <Button variant="outline" size="sm" className="rounded-full bg-white/90">
                        Edit Deck
                      </Button>
                    </Link>
                  </div>
                </div>
                {flashcardDecks.length > 1 && (
                  <div className="flex flex-wrap gap-2">
                    {flashcardDecks.map((deck) => {
                      const selected = deck.id === selectedFlashcardDeck.id
                      return (
                        <button
                          key={deck.id}
                          onClick={() => setSelectedFlashcardId(deck.id)}
                          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                            selected
                              ? 'bg-black text-white shadow-sm'
                              : 'border border-black/10 bg-white/90 text-black/60 hover:border-black/20 hover:text-black'
                          }`}
                        >
                          {deck.title}
                        </button>
                      )
                    })}
                  </div>
                )}
                <FlashcardsTab content={selectedFlashcardDeck} />
              </div>
            ) : flashcardDecks.length > 0 ? (
              <DeckGrid
                icon={Layers}
                label="Flashcard Deck"
                items={flashcardDecks.map((deck) => ({
                  id: deck.id,
                  title: deck.title,
                  meta: `${analyzeStudyMl(deck.studyml_content, 'flashcard-deck').flashcardCount} cards`,
                  actionLabel: 'Open Deck',
                  onClick: () => setSelectedFlashcardId(deck.id),
                }))}
                createHref={`/create/content/${unitId}?type=flashcard-deck`}
                createLabel="Add Another Deck"
              />
            ) : (
              <EmptyState
                icon={Layers}
                title="No flashcard deck yet"
                description="Create one or several decks for definitions, formulas, timelines, or problem types."
                href={`/create/content/${unitId}?type=flashcard-deck`}
                cta="Create Flashcards"
              />
            )
          )}

          {activeTab === 'quiz' && (
            selectedQuiz ? (
              <div className="space-y-4">
                <Button variant="ghost" size="sm" onClick={() => setSelectedQuizId(null)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  All Quizzes
                </Button>
                <InlineEditLink href={`/edit/content/${selectedQuiz.id}`} label="Edit Quiz" />
                <QuizTab content={selectedQuiz} />
              </div>
            ) : quizzes.length > 0 ? (
              <DeckGrid
                icon={CheckCircle}
                label="Quiz"
                items={quizzes.map((quiz) => ({
                  id: quiz.id,
                  title: quiz.title,
                  meta: `${analyzeStudyMl(quiz.studyml_content, 'quiz').questionCount} questions`,
                  actionLabel: 'Open Quiz',
                  onClick: () => setSelectedQuizId(quiz.id),
                }))}
                createHref={`/create/content/${unitId}?type=quiz`}
                createLabel="Add Another Quiz"
              />
            ) : (
              <EmptyState
                icon={CheckCircle}
                title="No quizzes yet"
                description="Quizzes make the weak spots visible. Add one after the guide and flashcards feel stable."
                href={`/create/content/${unitId}?type=quiz`}
                cta="Create Quiz"
              />
            )
          )}

          {activeTab === 'ai-tutor' && <AITutorTab unitId={unitId} />}
          {activeTab === 'drive' && <DriveTab unitId={unitId} />}
        </div>
      </main>
    </div>
  )
}

function SummaryChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-black/10 bg-white/90 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/40">{label}</p>
      <p className="text-xl font-semibold tracking-[-0.03em] text-black">{value}</p>
    </div>
  )
}

function InlineEditLink({ href, label }: { href: string; label: string }) {
  return (
    <div className="flex justify-end">
      <Link to={href}>
        <Button variant="outline" size="sm" className="rounded-full bg-white/90">
          {label}
        </Button>
      </Link>
    </div>
  )
}

function EmptyState({
  icon: Icon,
  title,
  description,
  href,
  cta,
}: {
  icon: typeof FileText
  title: string
  description: string
  href: string
  cta: string
}) {
  return (
    <Card className="border-dashed border-black/10 py-16 text-center">
      <CardContent className="space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-black/[0.04] text-black/35">
          <Icon className="h-7 w-7" />
        </div>
        <div>
          <h3 className="text-xl font-semibold tracking-[-0.03em] text-black">{title}</h3>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-7 text-black/60">{description}</p>
        </div>
        <Link to={href}>
          <Button className="rounded-full">
            <Plus className="mr-2 h-4 w-4" />
            {cta}
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}

function DeckGrid({
  icon: Icon,
  label,
  items,
  createHref,
  createLabel,
}: {
  icon: typeof FileText
  label: string
  items: Array<{ id: number; title: string; meta: string; actionLabel: string; onClick: () => void }>
  createHref: string
  createLabel: string
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <Card key={item.id} className="border-black/10 hover:-translate-y-0.5 hover:shadow-[0_24px_44px_-36px_rgba(15,23,42,0.28)]">
          <CardHeader>
            <CardTitle className="text-lg">{item.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-black/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-black/60">
              <Icon className="h-3.5 w-3.5" />
              {label}
            </div>
            <p className="mb-4 text-sm text-black/55">{item.meta}</p>
            <Button variant="outline" className="w-full rounded-full" onClick={item.onClick}>
              {item.actionLabel}
            </Button>
          </CardContent>
        </Card>
      ))}
      <Card className="flex min-h-[168px] flex-col items-center justify-center border-dashed border-black/10">
        <CardContent className="p-6 text-center">
          <Link to={createHref}>
            <Button variant="ghost" size="sm">
              <Plus className="mr-2 h-4 w-4" />
              {createLabel}
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
