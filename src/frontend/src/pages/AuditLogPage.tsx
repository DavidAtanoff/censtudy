import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowLeft, Clock, FileText, User } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { getAuditLogs } from '@/lib/api'

export default function AuditLogPage() {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const res = await getAuditLogs()
      return res.data
    },
  })

  const getActionColor = (action: string) => {
    if (action.includes('create')) return 'bg-green-50 text-green-600'
    if (action.includes('update')) return 'bg-blue-50 text-blue-600'
    if (action.includes('delete')) return 'bg-red-50 text-red-600'
    return 'bg-gray-50 text-gray-600'
  }

  const getActionIcon = (entityType: string) => {
    switch (entityType) {
      case 'course':
      case 'unit':
      case 'content':
        return <FileText className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
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
        <h1 className="mb-8 text-3xl font-bold">Audit Log</h1>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {logs.length > 0 ? (
              <div className="space-y-3">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-4 rounded-lg bg-gray-50 p-4 transition-colors hover:bg-gray-100"
                  >
                    <div className={`rounded-lg p-2 ${getActionColor(log.action)}`}>
                      {getActionIcon(log.entity_type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">You</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(log.created_at)}
                        </span>
                      </div>
                      <p className="text-sm">
                        <span className="font-medium capitalize">{log.action}</span>{' '}
                        <span className="text-muted-foreground">{log.entity_type}</span>{' '}
                        <span className="rounded bg-gray-200 px-2 py-1 font-mono text-xs">
                          #{log.entity_id}
                        </span>
                      </p>
                      {log.details && (
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {log.details}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-muted-foreground">
                No activity logged yet
              </p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
