import { Navigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BookOpen } from 'lucide-react'
import Button from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { getAuthConfig, getCurrentUser, API_BASE } from '@/lib/api'

export default function Login() {
  const [searchParams] = useSearchParams()

  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ['auth-user'],
    queryFn: async () => {
      const res = await getCurrentUser()
      return res.data
    },
    retry: false,
  })

  const { data: authConfig, isLoading: configLoading } = useQuery({
    queryKey: ['auth-config'],
    queryFn: async () => {
      const res = await getAuthConfig()
      return res.data
    },
  })

  if (currentUser) {
    return <Navigate to="/" replace />
  }

  const error = searchParams.get('error')
  const isLoading = userLoading || configLoading
  const allowedDomain = authConfig?.allowed_email_domain?.replace(/^@/, '')

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.98),_rgba(248,250,252,0.9),_rgba(241,245,249,0.78))] p-4 selection:bg-black selection:text-white">
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-black/10 bg-white shadow-[0_16px_40px_-28px_rgba(15,23,42,0.3)]">
            <BookOpen className="h-7 w-7 text-black" strokeWidth={1.5} />
          </div>
          <h1 className="text-4xl font-semibold tracking-[-0.06em] text-black">CenLearn</h1>
          <p className="mt-3 text-sm leading-7 text-black/60">
            Private study workspace for structured guides, adaptive recall, and Quizlet-plus-Brilliant style learning loops.
          </p>
        </div>

        <Card className="overflow-hidden border-black/10 bg-white/92 shadow-[0_28px_64px_-40px_rgba(15,23,42,0.34)]">
          <div className="h-28 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.96),_rgba(239,246,255,0.8),_rgba(226,232,240,0.6))]" />
          <CardContent className="relative -mt-10 px-7 pb-8 pt-0 sm:px-8">
            <div className="mb-6 inline-flex rounded-full border border-black/10 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-black/45">
              Microsoft Sign-In
            </div>
            <h2 className="text-2xl font-semibold tracking-[-0.04em] text-black">Continue with your school account</h2>
            <p className="mt-3 text-sm leading-7 text-black/60">
              {allowedDomain
                ? `Only ${allowedDomain} Microsoft accounts are allowed into this workspace.`
                : 'Authentication is handled through Azure AD so access stays tied to your Microsoft identity.'}
            </p>

            {error && (
              <div className="mt-6 rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                {humanizeError(error)}
              </div>
            )}

            {!authConfig?.enabled && !isLoading && (
              <div className="mt-6 rounded-[22px] border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
                Microsoft sign-in is not configured yet. Add the Azure env vars in the backend before using the app.
              </div>
            )}

            <Button
              className="mt-8 h-12 w-full rounded-full text-base font-semibold"
              disabled={!authConfig?.enabled || isLoading}
              onClick={() => {
                window.location.href = `${API_BASE}/auth/login`
              }}
            >
              {isLoading ? 'Checking sign-in...' : 'Continue with Microsoft'}
            </Button>

            <p className="mt-6 text-center text-[11px] leading-6 text-black/45">
              Azure app registration required:
              {' '}
              `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID`, `AZURE_REDIRECT_URI`, `JWT_SECRET`
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function humanizeError(error: string) {
  switch (error) {
    case 'unauthorized_domain':
      return 'That Microsoft account is outside the allowed school domain.'
    case 'microsoft_sign_in_not_configured':
      return 'Microsoft sign-in is not configured on the backend yet.'
    case 'state_mismatch':
    case 'missing_state_cookie':
    case 'missing_oauth_state':
      return 'The sign-in session expired or became invalid. Try again.'
    case 'token_exchange_failed':
    case 'userinfo_request_failed':
      return 'Microsoft sign-in failed while verifying your account. Try again.'
    default:
      return error.replace(/_/g, ' ')
  }
}
