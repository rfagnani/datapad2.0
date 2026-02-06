import { useCallback, useEffect, useMemo, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { Session } from '@supabase/supabase-js'
import LoginPage from './pages/LoginPage'
import AdminPortalPage from './pages/AdminPortalPage'
import CustomerHomePage from './pages/CustomerHomePage'
import LicenseRequestPage from './pages/LicenseRequestPage'
import LicenseRequestStatusPage from './pages/LicenseRequestStatusPage'
import PartnerLicenseRequestsPage from './pages/PartnerLicenseRequestsPage'
import TestPage from './pages/TestPage'
import { supabase, supabaseStorageKey } from './lib/supabaseClient'
import './i18n'
import './index.css'

type RoleState = 'unknown' | 'admin' | 'customerAdmin' | 'customerUser' | 'supportAgent' | 'none'

const parseTimeout = (rawValue: string | undefined, fallback: number): number => {
  if (!rawValue) {
    return fallback
  }

  const parsed = Number.parseInt(rawValue, 10)
  if (Number.isFinite(parsed) && parsed >= 0) {
    return parsed
  }

  return fallback
}

const DEFAULT_SESSION_TIMEOUT_MS = parseTimeout(import.meta.env.VITE_SUPABASE_REQUEST_TIMEOUT_MS, 0)
const SESSION_REQUEST_TIMEOUT_MS = parseTimeout(
  import.meta.env.VITE_SUPABASE_SESSION_TIMEOUT_MS,
  DEFAULT_SESSION_TIMEOUT_MS,
)
const REMEMBER_DEVICE_KEY = 'tigabytes::rememberDevice'

const mapRoleIdToState = (roleId: number | null | undefined): RoleState => {
  if (typeof roleId !== 'number') {
    return 'customerUser'
  }

  switch (roleId) {
    case 1:
      return 'admin'
    case 2:
      return 'customerAdmin'
    case 3:
      return 'customerUser'
    case 4:
      return 'supportAgent'
    default:
      return 'customerUser'
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
  if (typeof window === 'undefined' || !Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return promise
  }

  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error(timeoutMessage))
    }, timeoutMs)

    promise
      .then((value) => {
        window.clearTimeout(timeoutId)
        resolve(value)
      })
      .catch((error) => {
        window.clearTimeout(timeoutId)
        reject(error)
      })
  })
}

const extractRefreshToken = (rawValue: string | null): { refreshToken: string | null; hadToken: boolean } => {
  if (!rawValue) {
    return { refreshToken: null, hadToken: false }
  }

  try {
    const parsed = JSON.parse(rawValue) as Record<string, unknown>
    const candidates: unknown[] = [
      parsed.refresh_token,
      parsed.refreshToken,
    ]

    if (parsed.currentSession && typeof parsed.currentSession === 'object') {
      const currentSession = parsed.currentSession as Record<string, unknown>
      candidates.push(currentSession.refresh_token, currentSession.refreshToken)
    }

    if (parsed.session && typeof parsed.session === 'object') {
      const session = parsed.session as Record<string, unknown>
      candidates.push(session.refresh_token, session.refreshToken)
    }

    for (const candidate of candidates) {
      if (typeof candidate === 'string') {
        const trimmed = candidate.trim()
        if (trimmed.length > 0) {
          return { refreshToken: trimmed, hadToken: true }
        }
      }
    }

    return { refreshToken: null, hadToken: true }
  } catch (error) {
    console.error('Failed to parse cached Supabase session payload', error)
    return { refreshToken: null, hadToken: true }
  }
}

function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="full-screen-loader">
      <div className="loader" aria-hidden="true" />
      <span>{message}</span>
    </div>
  )
}

function App() {
  const { t } = useTranslation()
  const [session, setSession] = useState<Session | null>(null)
  const [initializing, setInitializing] = useState(true)
  const [roleState, setRoleState] = useState<RoleState>('unknown')
  const [roleLoading, setRoleLoading] = useState(false)
  const sessionRef = useRef<Session | null>(null)

  const registerOrUpdateUser = useCallback(async (nextSession: Session | null) => {
    if (!supabase || !nextSession?.user) {
      return
    }

    const { user } = nextSession
    const rawName =
      (typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name) ||
      (typeof user.user_metadata?.name === 'string' && user.user_metadata.name) ||
      (typeof user.user_metadata?.display_name === 'string' && user.user_metadata.display_name) ||
      ''
    const normalizedName = rawName.trim()
    const resolvedName = normalizedName.length > 0 ? normalizedName : user.email ?? user.id
    const rawAvatar =
      (typeof user.user_metadata?.avatar_url === 'string' && user.user_metadata.avatar_url) ||
      (typeof user.user_metadata?.picture === 'string' && user.user_metadata.picture) ||
      ''
    const resolvedAvatar = rawAvatar.trim().length > 0 ? rawAvatar.trim() : null
    const rawEmail = (user.email ?? '').trim()
    const resolvedEmail = rawEmail.length > 0 ? rawEmail : `${user.id}@unknown`

    try {
      const appSchemaClient = supabase.schema('app')
      const { error } = await appSchemaClient.rpc('fn_register_or_update_user', {
        p_name: resolvedName,
        p_email: resolvedEmail,
        p_avatar_url: resolvedAvatar,
      })

      if (error) {
        throw error
      }
    } catch (error) {
      console.error('Failed to register or update user profile', error)
    }
  }, [])

  const evaluateRole = useCallback(async (userId: string | null, options?: { suppressLoading?: boolean }) => {
    if (!supabase) {
      setRoleState('customerUser')
      return
    }

    if (!userId) {
      setRoleState('none')
      return
    }

    const manageLoadingState = !options?.suppressLoading

    if (manageLoadingState) {
      setRoleLoading(true)
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('role_id')
        .eq('auth_user_id', userId)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      let roleRecord = data ?? null

      if (!roleRecord) {
        const fallback = await supabase
          .from('users')
          .select('role_id')
          .eq('id', userId)
          .maybeSingle()

        if (fallback.error && fallback.error.code !== 'PGRST116') {
          throw fallback.error
        }

        roleRecord = fallback.data ?? null
      }

      const rawRoleId = roleRecord?.role_id
      const numericRoleId =
        typeof rawRoleId === 'number'
          ? rawRoleId
          : typeof rawRoleId === 'string'
          ? Number(rawRoleId)
          : null

      setRoleState(mapRoleIdToState(Number.isFinite(numericRoleId) ? numericRoleId : null))
    } catch (error) {
      console.error('Unable to determine user role', error)
      setRoleState('customerUser')
    } finally {
      if (manageLoadingState) {
        setRoleLoading(false)
      }
    }
  }, [])

  const getRememberDevicePreference = useCallback(() => {
    if (typeof window === 'undefined') {
      return true
    }

    try {
      const stored = window.localStorage.getItem(REMEMBER_DEVICE_KEY)
      if (stored === null) {
        return true
      }
      return stored === 'true'
    } catch (error) {
      console.error('Unable to read remember device preference', error)
      return true
    }
  }, [])

  const clearStoredSession = useCallback(() => {
    if (!supabaseStorageKey || typeof window === 'undefined') {
      return
    }

    try {
      window.localStorage.removeItem(supabaseStorageKey)
    } catch (error) {
      console.error('Unable to clear cached Supabase session', error)
    }
  }, [supabaseStorageKey])

  const attemptRefreshFromStorage = useCallback(async () => {
    if (!supabase || !supabaseStorageKey || typeof window === 'undefined') {
      return { session: null, hadToken: false }
    }

    if (!getRememberDevicePreference()) {
      clearStoredSession()
      return { session: null, hadToken: false }
    }

    let storedValue: string | null = null

    try {
      storedValue = window.localStorage.getItem(supabaseStorageKey)
    } catch (error) {
      console.error('Unable to access Supabase session storage', error)
      return { session: null, hadToken: false }
    }

    const { refreshToken, hadToken } = extractRefreshToken(storedValue)

    if (!refreshToken) {
      return { session: null, hadToken }
    }

    try {
      const { data, error } = await withTimeout(
        supabase.auth.refreshSession({ refresh_token: refreshToken }),
        SESSION_REQUEST_TIMEOUT_MS,
        'Timed out while refreshing Supabase session',
      )

      if (error) {
        throw error
      }

      return { session: data.session, hadToken: true }
    } catch (refreshError) {
      console.error('Failed to recover Supabase session from cache', refreshError)
      return { session: null, hadToken: true }
    }
  }, [clearStoredSession, getRememberDevicePreference, supabase, supabaseStorageKey])

  const applySession = useCallback(
    async (nextSession: Session | null) => {
      const currentSession = sessionRef.current
      const currentUserId = currentSession?.user?.id ?? null
      const nextUserId = nextSession?.user?.id ?? null
      const isSameUser = currentUserId === nextUserId

      sessionRef.current = nextSession
      setSession(nextSession)

      if (nextSession?.user) {
        if (!isSameUser) {
          await registerOrUpdateUser(nextSession)
          await evaluateRole(nextSession.user.id)
        }
        return
      }

      setRoleState('none')
      setRoleLoading(false)
    },
    [evaluateRole, registerOrUpdateUser],
  )

  const resolveSession = useCallback(
    async (
      reason: string,
      options?: { allowRefresh?: boolean; keepExistingOnFailure?: boolean },
    ) => {
      if (!supabase) {
        sessionRef.current = null
        setSession(null)
        setRoleState('customerUser')
        setRoleLoading(false)
        return null
      }

      const allowRefresh = options?.allowRefresh ?? true
      const keepExistingOnFailure = options?.keepExistingOnFailure ?? false
      const existingSession = sessionRef.current

      const handleMissingSession = async (hadToken: boolean | undefined) => {
        const shouldClearStoredSession =
          (!allowRefresh || hadToken === true) && !keepExistingOnFailure

        if (shouldClearStoredSession) {
          clearStoredSession()
        }

        if (keepExistingOnFailure && existingSession && hadToken !== false) {
          return existingSession
        }

        await applySession(null)
        return null
      }

      try {
        const { data, error } = await withTimeout(
          supabase.auth.getSession(),
          SESSION_REQUEST_TIMEOUT_MS,
          `Timed out while fetching Supabase session (${reason})`,
        )

        if (error) {
          throw error
        }

        if (data.session) {
          await applySession(data.session)
          return data.session
        }

        if (allowRefresh) {
          const attempt = await attemptRefreshFromStorage()
          if (attempt.session) {
            await applySession(attempt.session)
            return attempt.session
          }

          return handleMissingSession(attempt.hadToken)
        }

        return handleMissingSession(false)
      } catch (error) {
        console.error(`Failed to resolve auth session (${reason})`, error)

        if (allowRefresh) {
          const attempt = await attemptRefreshFromStorage()
          if (attempt.session) {
            await applySession(attempt.session)
            return attempt.session
          }

          return handleMissingSession(attempt.hadToken)
        }

        return handleMissingSession(false)
      }
    },
    [applySession, attemptRefreshFromStorage, clearStoredSession, supabase],
  )

  useEffect(() => {
    if (!supabase) {
      sessionRef.current = null
      setRoleState('customerUser')
      setInitializing(false)
      return
    }

    let isActive = true

    const initialise = async () => {
      await resolveSession('initial-load')
      if (isActive) {
        setInitializing(false)
      }
    }

    initialise()

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      await applySession(nextSession)
    })

    const handleWindowFocus = () => {
      void resolveSession('window-focus', { keepExistingOnFailure: true })
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void resolveSession('visibility-change', { keepExistingOnFailure: true })
      }
    }

    const handleStorageChange = (event: StorageEvent) => {
      if (event.storageArea !== window.localStorage) {
        return
      }

      if (event.key === null) {
        void resolveSession('storage-cleared')
        return
      }

      if (supabaseStorageKey && event.key === supabaseStorageKey) {
        void resolveSession('storage-change')
        return
      }

      if (event.key === REMEMBER_DEVICE_KEY && event.newValue === 'false') {
        void resolveSession('remember-device-disabled', { allowRefresh: false })
      }
    }

    window.addEventListener('focus', handleWindowFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('storage', handleStorageChange)

    return () => {
      isActive = false
      authListener.subscription.unsubscribe()
      window.removeEventListener('focus', handleWindowFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [applySession, resolveSession, supabaseStorageKey])

  const signOut = useCallback(async () => {
    if (!supabase) {
      return
    }
    await supabase.auth.signOut()
    clearStoredSession()
    sessionRef.current = null
    setSession(null)
    setRoleState('none')
    setRoleLoading(false)
  }, [clearStoredSession, supabase])

  const loadingMessage = useMemo(() => {
    if (initializing) {
      return t('loading.portal')
    }
    if (roleLoading) {
      return t('loading.access')
    }
    return t('loading.generic')
  }, [initializing, roleLoading, t])

  const isLoading = initializing || roleLoading
  const isTestPageLoading = initializing
  const isAdmin = roleState === 'admin'
  const isCustomerRole = roleState === 'customerAdmin' || roleState === 'customerUser'

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            isLoading ? (
              <LoadingScreen message={loadingMessage} />
            ) : session && isAdmin ? (
              <Navigate to="/admin" replace />
            ) : session && isCustomerRole ? (
              <Navigate to="/home" replace />
            ) : (
              <LoginPage
                isCheckingAccess={roleLoading}
                unauthorizedMessage={session && !isAdmin && !isCustomerRole ? t('admin.accessDenied') : undefined}
                onSignOut={session ? signOut : undefined}
              />
            )
          }
        />
        <Route
          path="/admin"
          element={
            isLoading ? (
              <LoadingScreen message={loadingMessage} />
            ) : !session ? (
              <Navigate to="/" replace />
            ) : isAdmin ? (
              <AdminPortalPage user={session.user} onSignOut={signOut} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/admin/license-requests"
          element={
            isLoading ? (
              <LoadingScreen message={loadingMessage} />
            ) : !session ? (
              <Navigate to="/" replace />
            ) : isAdmin ? (
              <PartnerLicenseRequestsPage user={session.user} onSignOut={signOut} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/home"
          element={
            isLoading ? (
              <LoadingScreen message={loadingMessage} />
            ) : !session ? (
              <Navigate to="/" replace />
            ) : isCustomerRole ? (
              <CustomerHomePage user={session.user} onSignOut={signOut} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/license-request"
          element={
            isLoading ? (
              <LoadingScreen message={loadingMessage} />
            ) : !session ? (
              <Navigate to="/" replace />
            ) : isCustomerRole ? (
              <LicenseRequestPage user={session.user} onSignOut={signOut} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/license-request/status"
          element={
            isLoading ? (
              <LoadingScreen message={loadingMessage} />
            ) : !session ? (
              <Navigate to="/" replace />
            ) : isCustomerRole ? (
              <LicenseRequestStatusPage user={session.user} onSignOut={signOut} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/test-page"
          element={
            isTestPageLoading ? (
              <LoadingScreen message={loadingMessage} />
            ) : !session ? (
              <Navigate to="/" replace />
            ) : (
              <TestPage user={session.user} />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
