import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { getCourse, getUnits, deleteUnit, deleteCourse, getCurrentUser } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'

export default function CourseView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const courseId = parseInt(id!)

  const { data: course, isError: courseError } = useQuery({
    queryKey: ['course', courseId],
    queryFn: async () => {
      const res = await getCourse(courseId)
      return res.data
    },
    retry: false
  })

  const { data: currentUser } = useQuery({
    queryKey: ['auth-user'],
    queryFn: async () => {
      const res = await getCurrentUser()
      return res.data
    },
    retry: false,
  })

  const isAdmin = currentUser?.email === 'atanodav@berkeleyprep.org'

  const { data: units } = useQuery({
    queryKey: ['units', courseId],
    queryFn: async () => {
      const res = await getUnits(courseId)
      return res.data
    },
    enabled: !!course,
  })

  if (courseError) {
    navigate('/404')
    return null
  }

  const deleteUnitMutation = useMutation({
    mutationFn: deleteUnit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units', courseId] })
    },
  })

  const deleteCourseMutation = useMutation({
    mutationFn: deleteCourse,
    onSuccess: () => {
      navigate('/')
    },
  })

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-white/80 glass-panel sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <>
                <Link to={`/edit/course/${courseId}`}>
                  <Button variant="outline">
                    Edit Course
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (confirm('Delete this entire course and all its units? This cannot be undone.')) {
                      deleteCourseMutation.mutate(courseId)
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Course
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">{course?.title}</h1>
            <p className="text-muted-foreground">{course?.description}</p>
          </div>
          {isAdmin && (
            <Link to={`/create/unit/${courseId}`}>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Unit
              </Button>
            </Link>
          )}
        </div>

        {units && units.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {units.map((unit) => (
              <Card key={unit.id} className="group relative overflow-hidden border-black/10 bg-white/92 shadow-[0_22px_50px_-40px_rgba(15,23,42,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_28px_56px_-40px_rgba(15,23,42,0.34)]">
                <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.98),_rgba(239,246,255,0.72),_rgba(226,232,240,0.55))]" />
                <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
                  {isAdmin && (
                    <>
                      <Link to={`/edit/unit/${unit.id}`}>
                        <Button variant="ghost" size="sm" className="rounded-full bg-white/80 backdrop-blur">
                          Edit
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-full bg-white/80 backdrop-blur"
                        onClick={() => {
                          if (confirm('Delete this unit?')) {
                            deleteUnitMutation.mutate(unit.id)
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
                <CardContent className="relative flex h-full flex-col items-center justify-center px-8 py-12 text-center">
                  <Link to={`/unit/${unit.id}`} className="block w-full">
                    <div className="mx-auto mb-4 inline-flex rounded-full border border-black/10 bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-black/45">
                      Unit {unit.order_index}
                    </div>
                    <h3 className="text-2xl font-semibold tracking-[-0.04em] text-black transition-colors group-hover:text-black/80">
                      {unit.title}
                    </h3>
                    <p className="mx-auto mt-3 max-w-sm text-sm leading-7 text-black/55">
                      {unit.description || 'No unit description yet.'}
                    </p>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <h3 className="text-xl font-semibold mb-2">No units yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first unit to add content
            </p>
            {isAdmin && (
              <Link to={`/create/unit/${courseId}`}>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Unit
                </Button>
              </Link>
            )}
          </Card>
        )}
      </main>
    </div>
  )
}
