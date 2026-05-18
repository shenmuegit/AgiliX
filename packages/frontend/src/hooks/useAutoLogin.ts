import { useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { api } from '@/lib/api'
import type { User } from '@agilix/shared'

export function useAutoLogin() {
  const { isAuthenticated, setAuth } = useAuthStore()

  useEffect(() => {
    if (isAuthenticated) return

    api.post<{ data: { token: string; user: User } }>('/auth/dev-login')
      .then((res) => {
        setAuth(res.data.user, res.data.token)
      })
      .catch(() => {
        // Backend not available, continue without auth
      })
  }, [isAuthenticated, setAuth])
}
