import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { createContent } from '@/lib/api'
import { StudyMlContentType } from '@/lib/studyml'
import StudyMLWorkbench from '@/components/StudyMLWorkbench'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

export default function CreateContent() {
  const { unitId } = useParams<{ unitId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const requestedType = searchParams.get('type') as StudyMlContentType | null

  const [title, setTitle] = useState('')
  const [contentType, setContentType] = useState<StudyMlContentType>(
    requestedType === 'flashcard-deck' || requestedType === 'quiz' || requestedType === 'test'
      ? requestedType
      : 'study-guide',
  )
  const [studymlContent, setStudymlContent] = useState('')

  const mutation = useMutation({
    mutationFn: (data: { title: string; content_type: string; studyml_content: string }) =>
      createContent(Number(unitId), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content', Number(unitId)] })
      navigate(`/unit/${unitId}`)
    },
  })

  const saveContent = () => {
    if (!title.trim() || !studymlContent.trim()) return

    mutation.mutate({
      title: title.trim(),
      content_type: contentType,
      studyml_content: studymlContent,
    })
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    saveContent()
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.96),_rgba(248,250,252,0.9),_rgba(241,245,249,0.78))]">
      <header className="sticky top-0 z-10 border-b border-black/5 bg-white/80 backdrop-blur-xl">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <Button variant="ghost" onClick={() => navigate(`/unit/${unitId}`)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Unit
          </Button>
          <Button onClick={saveContent} disabled={mutation.isPending || !title.trim() || !studymlContent.trim()}>
            {mutation.isPending ? 'Creating...' : 'Create Content'}
          </Button>
        </div>
      </header>

      <main className="container mx-auto max-w-7xl px-6 py-8">
        <Card className="border-black/10 shadow-[0_24px_50px_-38px_rgba(15,23,42,0.24)]">
          <CardHeader>
            <CardTitle>Create Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_240px]">
                <div>
                  <label className="mb-2 block text-sm font-medium text-black/75">Title</label>
                  <Input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="e.g. Stoichiometry Study Guide"
                    className="bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-black/75">Content Type</label>
                  <select
                    value={contentType}
                    onChange={(event) => setContentType(event.target.value as StudyMlContentType)}
                    className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm outline-none transition focus:border-black/20"
                  >
                    <option value="study-guide">Study Guide</option>
                    <option value="flashcard-deck">Flashcard Deck</option>
                    <option value="quiz">Quiz</option>
                  </select>
                </div>
              </div>

              {mutation.isError && (
                <div className="rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                  The content could not be saved. Check the StudyML warnings and make sure the selected content type includes the required blocks.
                </div>
              )}

              <StudyMLWorkbench contentType={contentType} value={studymlContent} onChange={setStudymlContent} />

              <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={mutation.isPending || !title.trim() || !studymlContent.trim()}>
                  {mutation.isPending ? 'Creating...' : 'Create Content'}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate(`/unit/${unitId}`)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
