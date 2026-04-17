import { useMemo, useState } from 'react'
import { BookOpen, Gauge, Layers3, Sparkles } from 'lucide-react'
import { Content } from '@/lib/api'
import { analyzeStudyMl, splitStudyGuidePages } from '@/lib/studyml'
import StudyMLRenderer from './StudyMLRenderer'
import Button from './ui/Button'
import { Card, CardContent } from './ui/Card'

interface Props {
  content: Content
}

export default function StudyGuideTab({ content }: Props) {
  const [currentPage, setCurrentPage] = useState(0)
  const pages = useMemo(() => splitStudyGuidePages(content.studyml_content), [content.studyml_content])
  const metrics = useMemo(() => analyzeStudyMl(content.studyml_content, 'study-guide'), [content.studyml_content])

  const current = pages[currentPage] || ''

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="rounded-[30px] border border-black/10 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.98),_rgba(248,250,252,0.9),_rgba(241,245,249,0.72))] p-6 shadow-[0_24px_50px_-38px_rgba(15,23,42,0.32)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/85 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-black/45">
              <BookOpen className="h-3.5 w-3.5" />
              Study Guide
            </div>
            <h2 className="text-3xl font-semibold tracking-[-0.04em] text-black">{content.title}</h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-black/60">
              Read the concept, pause on the knowledge checks, then move into flashcards and quizzes while the ideas are still fresh.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <MetricChip icon={Layers3} label="Pages" value={metrics.pageCount.toString()} />
            <MetricChip icon={Sparkles} label="Checks" value={metrics.questionCount.toString()} />
            <MetricChip icon={Gauge} label="Read Time" value={`${metrics.estimatedMinutes} min`} />
          </div>
        </div>

        {pages.length > 1 && (
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-black/40">
                Page {currentPage + 1} of {pages.length}
              </p>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/[0.06]">
                <div
                  className="h-full bg-black transition-all duration-500"
                  style={{ width: `${((currentPage + 1) / pages.length) * 100}%` }}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {pages.map((_page, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentPage(index)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    index === currentPage
                      ? 'bg-black text-white'
                      : 'border border-black/10 bg-white text-black/60 hover:border-black/20 hover:text-black'
                  }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_260px]">
        <StudyMLRenderer content={current} variant="page" showWarnings />

        <Card className="h-max border-black/10 bg-white/92 shadow-[0_20px_44px_-34px_rgba(15,23,42,0.24)]">
          <CardContent className="p-5">
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-black/40">How To Use This Page</p>
            <div className="space-y-4 text-sm leading-7 text-black/65">
              <p>Read one section straight through before you check yourself.</p>
              <p>Answer the embedded questions without peeking at nearby text.</p>
              <p>When a page feels easy, move immediately to flashcards or the quiz to lock it in.</p>
            </div>

            {pages.length > 1 && (
              <div className="mt-6 flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 rounded-full"
                  onClick={() => setCurrentPage((page) => Math.max(0, page - 1))}
                  disabled={currentPage === 0}
                >
                  Previous
                </Button>
                <Button
                  className="flex-1 rounded-full"
                  onClick={() => setCurrentPage((page) => Math.min(pages.length - 1, page + 1))}
                  disabled={currentPage === pages.length - 1}
                >
                  Next
                </Button>
              </div>
            )}

            {metrics.warnings.length > 0 && (
              <div className="mt-6 rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-900">
                {metrics.warnings.slice(0, 3).map((warning) => (
                  <p key={warning}>{warning}</p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MetricChip({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BookOpen
  label: string
  value: string
}) {
  return (
    <div className="rounded-[24px] border border-black/10 bg-white/85 px-4 py-3">
      <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/[0.04] text-black/60">
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/40">{label}</p>
      <p className="text-xl font-semibold tracking-[-0.03em] text-black">{value}</p>
    </div>
  )
}
