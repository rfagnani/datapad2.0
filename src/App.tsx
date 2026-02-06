import { useCallback, useEffect, useMemo, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Session } from '@supabase/supabase-js'
import LoginPage from './pages/LoginPage'
import AdminPortalPage from './pages/AdminPortalPage'
import { supabase } from './lib/supabaseClient'
import './i18n'
import './index.css'

type RoleState = 'unknown' | 'admin' | 'user' | 'none'

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

  const evaluateRole = useCallback(async (userId: string | null) => {
    if (!supabase) {
      setRoleState('user')
      return
    }

    if (!userId) {
      setRoleState('none')
      return
    }

    setRoleLoading(true)

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

      if (!roleRecord?.role_id) {
        setRoleState('user')
        return
      }

      setRoleState(roleRecord.role_id === 1 ? 'admin' : 'user')
    } catch (error) {
      console.error('Unable to determine user role', error)
      setRoleState('user')
    } finally {
      setRoleLoading(false)
    }
  }, [])

  useEffect(() => {
    const initialise = async () => {
      if (!supabase) {
        setRoleState('user')
        setInitializing(false)
        return
      }

      const { data } = await supabase.auth.getSession()
      setSession(data.session)
      if (data.session) {
        await registerOrUpdateUser(data.session)
        await evaluateRole(data.session.user.id)
      } else {
        setRoleState('none')
      }
      setInitializing(false)
    }

    initialise()

    const subscription = supabase?.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession)
      if (nextSession?.user?.id) {
        await registerOrUpdateUser(nextSession)
        await evaluateRole(nextSession.user.id)
      } else {
        setRoleState('none')
      }
    })

    return () => {
      subscription?.data.subscription.unsubscribe()
    }
  }, [evaluateRole, registerOrUpdateUser])

  const signOut = useCallback(async () => {
    if (!supabase) {
      return
    }
    await supabase.auth.signOut()
    setSession(null)
    setRoleState('none')
  }, [])

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

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            isLoading ? (
              <LoadingScreen message={loadingMessage} />
            ) : session && roleState === 'admin' ? (
              <Navigate to="/admin" replace />
            ) : (
              <LoginPage
                isCheckingAccess={roleLoading}
                unauthorizedMessage={session && roleState !== 'admin' ? t('admin.accessDenied') : undefined}
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
            ) : roleState === 'admin' ? (
              <AdminPortalPage user={session.user} onSignOut={signOut} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
