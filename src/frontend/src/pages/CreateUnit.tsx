import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { createUnit, getUnits } from '@/lib/api'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'

export default function CreateUnit() {
  const { courseId } = useParams<{ courseId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  const { data: units } = useQuery({
    queryKey: ['units', parseInt(courseId!)],
    queryFn: async () => {
      const res = await getUnits(parseInt(courseId!))
      return res.data
    },
  })

  const mutation = useMutation({
    mutationFn: (data: { title: string; description?: string; order_index: number }) => 
      createUnit(parseInt(courseId!), data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['units', parseInt(courseId!)] })
      navigate(`/unit/${res.data.id}`)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (title.trim()) {
      const orderIndex = (units?.length || 0) + 1
      mutation.mutate({ title, description: description.trim() || undefined, order_index: orderIndex })
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-6 py-4">
          <Button variant="ghost" onClick={() => navigate(`/course/${courseId}`)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Course
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Create New Unit</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Unit Title
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Unit 1 - Kinematics"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Unit Description
                </label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What should students understand by the end of this unit?"
                  rows={5}
                />
              </div>

              <div className="flex gap-3">
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? 'Creating...' : 'Create Unit'}
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
