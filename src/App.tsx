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
        await evaluateRole(nextSession.user.id)
      } else {
        setRoleState('none')
      }
    })

    return () => {
      subscription?.data.subscription.unsubscribe()
    }
  }, [evaluateRole])

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
