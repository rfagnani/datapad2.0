import { useState } from 'react'
import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import LanguageSelector from '../components/LanguageSelector'
import logo from '../img/tiga_hor.png'
import googleLogo from '../image/google.svg'
import { supabase } from '../lib/supabaseClient'
import '../App.css'

type FormStatus = 'idle' | 'loading' | 'success' | 'error'

type LoginPageProps = {
  isCheckingAccess?: boolean
  unauthorizedMessage?: string | null
  onSignOut?: () => Promise<void>
}

function LoginPage({ isCheckingAccess = false, unauthorizedMessage, onSignOut }: LoginPageProps) {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [status, setStatus] = useState<FormStatus>('idle')
  const [feedback, setFeedback] = useState('')
  const [signingOut, setSigningOut] = useState(false)

  const resetFeedback = () => {
    setStatus('idle')
    setFeedback('')
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!supabase) {
      setStatus('error')
      setFeedback(t('missingSupabaseConfig'))
      return
    }

    setStatus('loading')
    setFeedback(t('signingIn'))

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setStatus('error')
      setFeedback(t('authError'))
      return
    }

    localStorage.setItem('tigabytes::rememberDevice', rememberMe ? 'true' : 'false')

    setStatus('success')
    setFeedback(t('authSuccess'))
  }

  const handleGoogleSignIn = async () => {
    if (!supabase) {
      setStatus('error')
      setFeedback(t('missingSupabaseConfig'))
      return
    }

    setStatus('loading')
    setFeedback(t('signingIn'))
    localStorage.setItem('tigabytes::rememberDevice', rememberMe ? 'true' : 'false')

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    })

    if (error) {
      setStatus('error')
      setFeedback(t('authError'))
      return
    }

    if (data?.url) {
      window.location.assign(data.url)
    }
  }

  const handleLocalSignOut = async () => {
    if (!onSignOut) {
      return
    }
    setSigningOut(true)
    try {
      await onSignOut()
    } finally {
      setSigningOut(false)
    }
  }

  const isLoading = status === 'loading' || isCheckingAccess

  return (
    <div className="page">
      <main className="login-shell">
        <header className="login-shell__header">
          <img className="brand-logo" src={logo} alt="Tigabytes Datapad" />
          <LanguageSelector />
        </header>

        <section className="login-panel">
          <div className="login-panel__intro">
            <h1>{t('title')}</h1>
            <p>{t('subtitle')}</p>
            <p className="trusted">{t('trustedBy')}</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <fieldset className="login-form__fields" disabled={isLoading}>
              <label className="field" htmlFor="email">
                <span>{t('emailLabel')}</span>
                <input
                  id="email"
                  type="email"
                  placeholder={t('emailPlaceholder')}
                  value={email}
                  onChange={(event) => {
                    if (status !== 'idle') {
                      resetFeedback()
                    }
                    setEmail(event.target.value)
                  }}
                  autoComplete="email"
                  required
                />
              </label>

              <label className="field" htmlFor="password">
                <span>{t('passwordLabel')}</span>
                <input
                  id="password"
                  type="password"
                  placeholder={t('passwordPlaceholder')}
                  value={password}
                  onChange={(event) => {
                    if (status !== 'idle') {
                      resetFeedback()
                    }
                    setPassword(event.target.value)
                  }}
                  autoComplete="current-password"
                  required
                />
              </label>

              <div className="login-form__options">
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                  />
                  <span>{t('sessionPersist')}</span>
                </label>
                <a className="forgot-link" href="mailto:support@tigabytes.com">
                  {t('forgotPassword')}
                </a>
              </div>
            </fieldset>

            {(feedback || unauthorizedMessage) && (
              <div
                className={`form-feedback form-feedback--${status === 'idle' ? 'error' : status}`}
                role="status"
              >
                {unauthorizedMessage ?? feedback}
              </div>
            )}

            <button className="primary-action" type="submit" disabled={isLoading}>
              {isLoading ? t('signingIn') : t('signIn')}
            </button>

            <div className="divider">
              <span>{t('or')}</span>
            </div>

            <button className="secondary-action" type="button" onClick={handleGoogleSignIn} disabled={isLoading}>
              <img src={googleLogo} alt="" aria-hidden="true" />
              {t('googleLogin')}
            </button>

            {unauthorizedMessage && onSignOut && (
              <button
                className="secondary-action"
                style={{ marginTop: 12 }}
                type="button"
                onClick={handleLocalSignOut}
                disabled={signingOut}
              >
                {signingOut ? t('signingOut') : t('signOut')}
              </button>
            )}
          </form>
        </section>
      </main>
    </div>
  )
}

export default LoginPage

