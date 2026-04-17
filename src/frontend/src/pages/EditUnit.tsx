import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { getUnit, updateUnit } from '@/lib/api'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'

export default function EditUnit() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const unitId = parseInt(id!)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [orderIndex, setOrderIndex] = useState(0)

  const { data: unit, isLoading } = useQuery({
    queryKey: ['unit', unitId],
    queryFn: async () => {
      const res = await getUnit(unitId)
      return res.data
    },
    retry: false
  })

  useEffect(() => {
    if (unit) {
      setTitle(unit.title || '')
      setDescription(unit.description || '')
      setOrderIndex(unit.order_index || 0)
    }
  }, [unit])

  const mutation = useMutation({
    mutationFn: (data: { title: string; description?: string; order_index: number }) =>
      updateUnit(unitId, data),
    onSuccess: () => {
      if (unit) {
        queryClient.invalidateQueries({ queryKey: ['units', unit.course_id] })
      }
      queryClient.invalidateQueries({ queryKey: ['unit', unitId] })
      navigate(-1) // Typically go back to whatever opened this 
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (title.trim()) {
      mutation.mutate({ title, description: description.trim() || undefined, order_index: orderIndex })
    }
  }

  if (isLoading) return <div className="p-8">Loading...</div>
  if (!unit) return <div className="p-8">Unit not found.</div>

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-white/80 glass-panel sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-2xl">
        <Card className="shadow-soft border-border/50">
          <CardHeader>
            <CardTitle>Edit Unit</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground/80">Unit Title</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Chapter 1"
                  required
                  className="bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-foreground/80">Unit Description</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  className="bg-white"
                  placeholder="Add a short description learners will see on the course page."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-foreground/80">Order Index</label>
                <Input
                  type="number"
                  value={orderIndex}
                  onChange={(e) => setOrderIndex(parseInt(e.target.value))}
                  required
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
                  onClick={() => navigate(-1)}
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
