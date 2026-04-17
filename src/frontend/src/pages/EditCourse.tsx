import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { getCourse, updateCourse } from '@/lib/api'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'

export default function EditCourse() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const courseId = parseInt(id!)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  const { data: course, isLoading } = useQuery({
    queryKey: ['course', courseId],
    queryFn: async () => {
      const res = await getCourse(courseId)
      return res.data
    },
    retry: false
  })

  useEffect(() => {
    if (course) {
      setTitle(course.title || '')
      setDescription(course.description || '')
    }
  }, [course])

  const mutation = useMutation({
    mutationFn: (data: { title: string; description?: string }) =>
      updateCourse(courseId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] })
      queryClient.invalidateQueries({ queryKey: ['course', courseId] })
      navigate(`/course/${courseId}`)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (title.trim()) {
      mutation.mutate({ title, description })
    }
  }

  if (isLoading) return <div className="p-8">Loading...</div>
  if (!course) return <div className="p-8">Course not found.</div>

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-white/80 glass-panel sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <Button variant="ghost" onClick={() => navigate(`/course/${courseId}`)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Course
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-2xl">
        <Card className="shadow-soft border-border/50">
          <CardHeader>
            <CardTitle>Edit Course</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground/80">Course Title</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Introduction to Physics"
                  required
                  className="bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-foreground/80">Description (Optional)</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter a brief description..."
                  rows={4}
                  className="bg-white"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`/course/${courseId}`)}
                >
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
