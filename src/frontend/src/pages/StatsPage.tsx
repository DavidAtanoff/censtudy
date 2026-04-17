import axios from 'axios'
import { useQuery } from '@tanstack/react-query'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowLeft, Award, Clock, Flame, TrendingUp, Trophy } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { getCurrentUser, getLeaderboard, getUserStats } from '@/lib/api'

export default function StatsPage() {
  const { userId } = useParams<{ userId: string }>()
  const requestedUserId = Number.parseInt(userId ?? '', 10)

  const { data: currentUser, isLoading: userLoading, isError: userError } = useQuery({
    queryKey: ['auth-user'],
    queryFn: async () => {
      const res = await getCurrentUser()
      return res.data
    },
    retry: false,
    staleTime: 60_000,
  })

  const uid = currentUser?.id ?? (Number.isFinite(requestedUserId) ? requestedUserId : 0)

  const {
    data: stats,
    isLoading: statsLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['user-stats', uid],
    queryFn: async () => {
      const res = await getUserStats(uid)
      return res.data
    },
    retry: 1,
    enabled: !!currentUser && uid > 0,
  })

  const { data: leaderboard = [] } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      const res = await getLeaderboard()
      return res.data
    },
    retry: 1,
    placeholderData: [],
    enabled: !!currentUser,
  })

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  if (userLoading || statsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    )
  }

  if (userError || !currentUser) {
    return <Navigate to="/login" replace />
  }

  if (Number.isFinite(requestedUserId) && requestedUserId > 0 && requestedUserId !== currentUser.id) {
    return <Navigate to={`/stats/${currentUser.id}`} replace />
  }

  if (isError) {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined
    const title = status === 401
      ? 'Session expired'
      : status === 403
        ? 'This stats page belongs to a different account'
        : 'Unable to load stats'
    const description = status === 401
      ? 'Your Microsoft sign-in session is no longer valid. Sign in again to keep tracking progress.'
      : status === 403
        ? 'You can only view the stats tied to the Microsoft account you are currently using.'
        : 'The stats endpoint returned an error. This usually means the backend is down or the local database has a query issue.'
    const href = status === 401 ? '/login' : status === 403 ? `/stats/${currentUser.id}` : '/'
    const cta = status === 401 ? 'Sign In Again' : status === 403 ? 'Open My Stats' : 'Back to Dashboard'

    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-white">
          <div className="container mx-auto px-4 py-4 sm:px-6">
            <Link to="/">
              <Button variant="ghost">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8 sm:px-6">
          <Card className="p-12 text-center">
            <h3 className="mb-2 text-xl font-semibold">{title}</h3>
            <p className="mb-6 text-muted-foreground">{description}</p>
            <Link to={href}>
              <Button>{cta}</Button>
            </Link>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-4 sm:px-6">
          <Link to="/">
            <Button variant="ghost">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 sm:px-6">
        <h1 className="mb-8 text-3xl font-bold">Your Statistics</h1>

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Study Time</p>
                  <p className="text-3xl font-bold">{formatTime(stats?.total_time_spent || 0)}</p>
                </div>
                <Clock className="h-12 w-12 text-primary opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Current Streak</p>
                  <p className="text-3xl font-bold">{stats?.current_streak || 0} days</p>
                </div>
                <Flame className="h-12 w-12 text-orange-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Cards Mastered</p>
                  <p className="text-3xl font-bold">{stats?.flashcards_mastered || 0}</p>
                </div>
                <Award className="h-12 w-12 text-green-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Courses Started</p>
                  <p className="text-3xl font-bold">{stats?.courses_started || 0}</p>
                </div>
                <TrendingUp className="h-12 w-12 text-blue-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Quizzes Completed</p>
                  <p className="text-3xl font-bold">{stats?.quizzes_completed || 0}</p>
                </div>
                <Trophy className="h-12 w-12 text-yellow-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Quiz Score</p>
                  <p className="text-3xl font-bold">{(stats?.average_quiz_score ?? 0).toFixed(0)}%</p>
                </div>
                <Award className="h-12 w-12 text-purple-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Content Progress</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.content_stats && stats.content_stats.length > 0 ? (
              <div className="space-y-4">
                {stats.content_stats.map((content) => (
                  <div key={content.content_id} className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
                    <div className="flex-1">
                      <h3 className="font-medium">{content.content_title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {formatTime(content.time_spent_seconds)} studied
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Mastery</p>
                        <p className="font-bold">{(content.mastery_level * 100).toFixed(0)}%</p>
                      </div>
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-200">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${content.mastery_level * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-muted-foreground">
                No study activity yet. Start learning to see your progress!
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Leaderboard</CardTitle>
          </CardHeader>
          <CardContent>
            {leaderboard.length > 0 ? (
              <div className="space-y-2">
                {leaderboard.map((entry, index) => (
                  <div
                    key={entry.user_id}
                    className={`flex items-center justify-between rounded-lg p-4 ${
                      entry.user_id === uid ? 'border-2 border-primary bg-primary/10' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full font-bold ${
                          index === 0
                            ? 'bg-yellow-500 text-white'
                            : index === 1
                              ? 'bg-gray-400 text-white'
                              : index === 2
                                ? 'bg-orange-600 text-white'
                                : 'bg-gray-200'
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{entry.display_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {`${formatTime(entry.total_time_spent)} • ${entry.flashcards_mastered} cards`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{entry.average_quiz_score.toFixed(0)}%</p>
                      <p className="text-xs text-muted-foreground">avg score</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-muted-foreground">
                No leaderboard data yet
              </p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
