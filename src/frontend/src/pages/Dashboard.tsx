import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, BookOpen, BarChart3, FileText, LogOut, User, Upload, Key } from 'lucide-react'
import { getCourses, getCurrentUser, getKnowledgeGaps, logout, createCourse, createUnit, createContent, updateGeminiKey } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { formatDate } from '@/lib/utils'
import { AlertCircle } from 'lucide-react'
import { useRef, useState } from 'react'

export default function Dashboard() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: user } = useQuery({
    queryKey: ['auth-user'],
    queryFn: async () => {
      const res = await getCurrentUser()
      return res.data
    },
    retry: false,
  })

  const handleLogout = async () => {
    await logout().catch(() => undefined)
    queryClient.clear()
    navigate('/login')
  }

  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUpdateKey = async () => {
    const newKey = window.prompt("Enter new Gemini API Key to override current one:");
    if (!newKey) return;
    try {
      await updateGeminiKey(newKey);
      alert("Gemini API Key updated successfully!");
    } catch (e) {
      alert("Failed to update API key");
    }
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsImporting(true)
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      
      if (!data.courses || !Array.isArray(data.courses)) {
        alert("Invalid JSON format.")
        setIsImporting(false)
        return
      }

      for (const course of data.courses) {
        const cRes = await createCourse({ title: course.title, description: course.description })
        const newCourseId = cRes.data.id
        
        for (const unit of (course.units || [])) {
          const uRes = await createUnit(newCourseId, { 
            title: unit.title, 
            description: unit.description, 
            order_index: unit.order_index 
          })
          const newUnitId = uRes.data.id

          for (const content of (unit.content || [])) {
            await createContent(newUnitId, {
              content_type: content.content_type,
              title: content.title,
              studyml_content: content.studyml_content
            })
          }
        }
      }
      
      alert("Import successful!")
      queryClient.invalidateQueries({ queryKey: ['courses'] })
    } catch (err) {
      console.error("Import error", err)
      alert("Import failed. Check console for details.")
    } finally {
      setIsImporting(false)
    }
  }

  const { data: courses, isLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const res = await getCourses()
      return res.data
    },
  })

  const { data: gaps } = useQuery({
    queryKey: ['knowledge-gaps', user?.id],
    queryFn: async () => {
      if (!user) return []
      const res = await getKnowledgeGaps(user.id)
      return res.data
    },
    enabled: !!user,
  })

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-white/80 glass-panel sticky top-0 z-10 transition-all">
        <div className="container mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6" />
            <h1 className="text-xl sm:text-2xl font-semibold">CenStudy</h1>
          </div>
          <div className="flex items-center gap-2">
            {user && (
              <div className="hidden sm:flex items-center gap-2 mr-2 px-3 py-1 bg-gray-100 rounded-lg">
                <User className="w-4 h-4" />
                <span className="text-sm">{user.display_name}</span>
              </div>
            )}
            <Link to={user ? `/stats/${user.id}` : '/stats/0'}>
              <Button variant="outline" size="sm">
                <BarChart3 className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Stats</span>
              </Button>
            </Link>
            <Link to="/audit">
              <Button variant="outline" size="sm">
                <FileText className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Audit</span>
              </Button>
            </Link>
            {user?.email === 'atanodav@berkeleyprep.org' && (
              <Link to="/create/course">
                <Button size="sm">
                  <Plus className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">New Course</span>
                </Button>
              </Link>
            )}
            {user?.email === 'atanodav@berkeleyprep.org' && (
              <>
                <Button variant="outline" size="sm" onClick={handleUpdateKey}>
                  <Key className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Set API Key</span>
                </Button>
                <input 
                  type="file" 
                  accept=".json" 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={handleImport} 
                />
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isImporting}>
                  <Upload className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">{isImporting ? 'Importing...' : 'Import'}</span>
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8 flex justify-between items-end">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-2 tracking-tight">Your Courses</h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Master any subject with evidence-based learning
            </p>
          </div>
        </div>

        {gaps && gaps.length > 0 && (
          <div className="mb-12">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-rose-600">
              <AlertCircle className="w-5 h-5" /> Active Knowledge Gaps
            </h3>
            <div className="flex flex-wrap gap-3">
              {gaps.map((gap, i) => (
                <div key={i} className="bg-rose-50 border border-rose-100 text-rose-800 px-4 py-2 rounded-xl text-sm font-medium shadow-sm flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                   {gap.concept}
                   <span className="text-xs text-rose-500 bg-rose-100 px-2 py-0.5 rounded-full ml-1">Missed {gap.count}x</span>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-3 italic">These concepts were flagged by your AI Tutor across recent quizzes. Focus your next study session here.</p>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-3/4" />
                </CardHeader>
                <CardContent>
                  <div className="h-4 bg-muted rounded w-full mb-2" />
                  <div className="h-4 bg-muted rounded w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : courses && courses.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {courses.map((course) => (
              <Link key={course.id} to={`/course/${course.id}`}>
                <Card className="hover-lift cursor-pointer h-full border-border/40">
                  <CardHeader>
                    <CardTitle className="text-xl">{course.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {course.description || 'No description'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Created {formatDate(course.created_at)}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="p-8 sm:p-12 text-center">
            <BookOpen className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg sm:text-xl font-semibold mb-2">No courses yet</h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-6">
              Create your first course to start learning
            </p>
            {user?.email === 'atanodav@berkeleyprep.org' && (
              <Link to="/create/course">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Course
                </Button>
              </Link>
            )}
          </Card>
        )}
      </main>
    </div>
  )
}
