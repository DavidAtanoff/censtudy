import { Eye, FileText, Lightbulb, Sparkles } from 'lucide-react'
import { analyzeStudyMl, getStudyMlStarter, StudyMlContentType } from '@/lib/studyml'
import Textarea from './ui/Textarea'
import StudyMLRenderer from './StudyMLRenderer'
import Button from './ui/Button'
import { Card, CardContent } from './ui/Card'

interface Props {
  contentType: StudyMlContentType
  value: string
  onChange: (value: string) => void
}

export default function StudyMLWorkbench({ contentType, value, onChange }: Props) {
  const metrics = analyzeStudyMl(value, contentType)
  const previewVariant = contentType === 'study-guide' ? 'page' : 'inline'

  const applyStarter = () => {
    if (value.trim() && !window.confirm('Replace the current StudyML with a starter template?')) {
      return
    }
    onChange(getStudyMlStarter(contentType))
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-[28px] border border-black/10 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.98),_rgba(248,250,252,0.9),_rgba(241,245,249,0.72))] p-5 shadow-[0_20px_44px_-34px_rgba(15,23,42,0.28)] lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-black/40">StudyML Workbench</p>
          <p className="max-w-2xl text-sm leading-7 text-black/60">
            Write, lint, and preview the content in one place so malformed blocks get caught before your friends ever see them.
          </p>
        </div>
        <Button type="button" variant="outline" className="rounded-full" onClick={applyStarter}>
          <Sparkles className="mr-2 h-4 w-4" />
          Load Starter Template
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <WorkbenchMetric icon={FileText} label="Pages" value={metrics.pageCount.toString()} />
        <WorkbenchMetric icon={Lightbulb} label="Checks" value={metrics.questionCount.toString()} />
        <WorkbenchMetric icon={Sparkles} label="Flashcards" value={metrics.flashcardCount.toString()} />
        <WorkbenchMetric icon={Eye} label="Warnings" value={metrics.warnings.length.toString()} accent={metrics.warnings.length > 0} />
      </div>

      {metrics.warnings.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 text-sm leading-7 text-amber-950">
            {metrics.warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card className="border-black/10">
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/40">Editor</p>
              <p className="text-xs text-black/45">Use `::question`, `::flashcard`, and `::note` blocks.</p>
            </div>
            <Textarea
              value={value}
              onChange={(event) => onChange(event.target.value)}
              rows={24}
              className="min-h-[560px] rounded-[22px] border-black/10 bg-[#fafaf9] font-mono text-[13px] leading-6"
              placeholder="Write your StudyML here..."
            />
          </CardContent>
        </Card>

        <Card className="border-black/10">
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/40">Live Preview</p>
              <p className="text-xs text-black/45">Rendered using the same parser learners see.</p>
            </div>
            <div className="max-h-[740px] overflow-auto rounded-[24px] bg-[#f5f5f4] p-3">
              <StudyMLRenderer content={value || 'Start typing to preview your content.'} variant={previewVariant} showWarnings />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function WorkbenchMetric({
  icon: Icon,
  label,
  value,
  accent = false,
}: {
  icon: typeof FileText
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className="rounded-[22px] border border-black/10 bg-white/90 px-4 py-4">
      <div className={`mb-2 inline-flex h-8 w-8 items-center justify-center rounded-full ${accent ? 'bg-amber-100 text-amber-700' : 'bg-black/[0.04] text-black/60'}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/40">{label}</p>
      <p className="text-xl font-semibold tracking-[-0.03em] text-black">{value}</p>
    </div>
  )
}
