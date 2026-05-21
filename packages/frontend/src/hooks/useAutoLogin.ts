import { useEffect, useRef, useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { api } from '@/lib/api'
import type { User } from '@agilix/shared'

const FEISHU_APP_ID = 'cli_aa81793863badbc9'
const IS_DEV = location.hostname === 'localhost' || location.hostname === '127.0.0.1'

function getFeishuAuthUrl(): string {
  const redirectUri = encodeURIComponent(window.location.origin + '/')
  return `https://open.feishu.cn/open-apis/authen/v1/authorize?app_id=${FEISHU_APP_ID}&redirect_uri=${redirectUri}&response_type=code`
}

function canRedirect(): boolean {
  const last = sessionStorage.getItem('agilix_auth_redirect')
  if (!last) return true
  return Date.now() - Number(last) > 30_000
}

function markRedirect() {
  sessionStorage.setItem('agilix_auth_redirect', String(Date.now()))
}

export function useAutoLogin() {
  const { isAuthenticated, setAuth, logout } = useAuthStore()
  const ran = useRef(false)
  const [showLogin, setShowLogin] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')

    if (code) {
      window.history.replaceState({}, '', window.location.pathname)
      api.post<{ data: { token: string; user: User } }>('/auth/feishu/callback', { code })
        .then((res) => {
          sessionStorage.removeItem('agilix_auth_redirect')
          setAuth(res.data.user, res.data.token)
        })
        .catch((err) => {
          setErrorMsg(`飞书回调失败: ${err.message || err}`)
          setShowLogin(true)
        })
      return
    }

    if (isAuthenticated) {
      api.get('/auth/me').catch((err) => {
        logout()
        setErrorMsg(`Token 验证失败: ${err.message || err}`)
        setShowLogin(true)
      })
      return
    }

    if (IS_DEV) {
      api.post<{ data: { token: string; user: User } }>('/auth/dev-login')
        .then((res) => setAuth(res.data.user, res.data.token))
        .catch(() => setShowLogin(true))
    } else if (canRedirect()) {
      markRedirect()
      window.location.href = getFeishuAuthUrl()
    } else {
      setShowLogin(true)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { showLogin, errorMsg, loginUrl: getFeishuAuthUrl() }
}
