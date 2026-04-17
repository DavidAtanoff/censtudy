import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { getContentById, updateContent } from '@/lib/api'
import { StudyMlContentType } from '@/lib/studyml'
import StudyMLWorkbench from '@/components/StudyMLWorkbench'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

export default function EditContent() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const contentId = Number(id)

  const [title, setTitle] = useState('')
  const [contentType, setContentType] = useState<StudyMlContentType>('study-guide')
  const [studymlContent, setStudymlContent] = useState('')

  const { data: contentData, isLoading } = useQuery({
    queryKey: ['contentById', contentId],
    queryFn: async () => {
      const res = await getContentById(contentId)
      return res.data
    },
    retry: false,
  })

  useEffect(() => {
    if (!contentData) return
    setTitle(contentData.title || '')
    setContentType((contentData.content_type as StudyMlContentType) || 'study-guide')
    setStudymlContent(contentData.studyml_content || '')
  }, [contentData])

  const mutation = useMutation({
    mutationFn: (data: { title: string; content_type: string; studyml_content: string }) =>
      updateContent(contentId, data),
    onSuccess: () => {
      if (contentData) {
        queryClient.invalidateQueries({ queryKey: ['content', contentData.unit_id] })
        queryClient.invalidateQueries({ queryKey: ['contentById', contentId] })
        navigate(`/unit/${contentData.unit_id}`)
      } else {
        navigate(-1)
      }
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

  if (isLoading) return <div className="p-8 text-sm text-black/55">Loading content...</div>
  if (!contentData) return <div className="p-8 text-sm text-black/55">Content not found.</div>

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.96),_rgba(248,250,252,0.9),_rgba(241,245,249,0.78))]">
      <header className="sticky top-0 z-10 border-b border-black/5 bg-white/80 backdrop-blur-xl">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button onClick={saveContent} disabled={mutation.isPending || !title.trim() || !studymlContent.trim()}>
            {mutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </header>

      <main className="container mx-auto max-w-7xl px-6 py-8">
        <Card className="border-black/10 shadow-[0_24px_50px_-38px_rgba(15,23,42,0.24)]">
          <CardHeader>
            <CardTitle>Edit Content</CardTitle>
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
                    <option value="test">Test</option>
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
                  {mutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate(-1)}>
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
