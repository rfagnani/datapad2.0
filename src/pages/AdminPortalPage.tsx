import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { User } from '@supabase/supabase-js'
import LanguageSelector from '../components/LanguageSelector'
import ToolbarActionButton from '../components/ToolbarActionButton'
import logo from '../img/tiga_hor.png'
import { supabase } from '../lib/supabaseClient'
import '../styles/admin.css'

type AdminPortalPageProps = {
  user: User
  onSignOut: () => Promise<void>
}

type SummaryCard = {
  id: string
  label: string
  value: string
  helper: string
  iconSrc?: string
  iconClass?: string
  iconColor?: string
  iconBg: string
  helperTone: 'positive' | 'neutral' | 'danger'
}

type PortalAdminOverview = {
  total_users: number | null
  total_customers: number | null
  active_sessions: number | null
  pending_users: number | null
}

const FALLBACK_OVERVIEW: PortalAdminOverview = {
  total_users: 247,
  total_customers: 89,
  active_sessions: 156,
  pending_users: 7,
}

type UserRow = {
  id: string
  name: string
  email: string
  role: string
  roleVariant: 'admin' | 'user' | 'support' | 'danger'
  customer: string
  lastLogin: string
  status: 'Active' | 'Inactive'
  actionLabel: string
}
const statusTone: Record<UserRow['status'], 'success' | 'warning'> = {
  Active: 'success',
  Inactive: 'warning',
}
function AdminPortalPage({ user, onSignOut }: AdminPortalPageProps) {
  const { t, i18n } = useTranslation()
  const [signingOut, setSigningOut] = useState(false)
  const [overview, setOverview] = useState<PortalAdminOverview | null>(null)
  useEffect(() => {
    document.body.classList.add('admin-body')
    return () => {
      document.body.classList.remove('admin-body')
    }
  }, [])
  useEffect(() => {
    if (!supabase) {
      console.warn('Supabase client is not configured.')
      return
    }

    const appSchemaClient = supabase.schema('app')

    let isSubscribed = true

    const fetchOverview = async () => {
      try {
        const { data, error } = await appSchemaClient.rpc('fn_portal_admin_overview')

        if (!isSubscribed) {
          return
        }

        if (error) {
          console.error('Failed to load portal admin overview', error)
          setOverview(null)
          return
        }

        const payload = Array.isArray(data) ? data[0] : data
        setOverview((payload ?? null) as PortalAdminOverview | null)
      } catch (fetchError) {
        if (isSubscribed) {
          console.error('Failed to load portal admin overview', fetchError)
          setOverview(null)
        }
      }
    }

    fetchOverview()

    return () => {
      isSubscribed = false
    }
  }, [user])

  const numberFormatter = useMemo(
    () => new Intl.NumberFormat(i18n.language),
    [i18n.language],
  )

  const summaryCards: SummaryCard[] = useMemo(() => {
    const metrics = overview ?? FALLBACK_OVERVIEW
    const formatValue = (value: number | null | undefined) =>
      numberFormatter.format(Math.max(0, value ?? 0))
    const pendingValue = metrics.pending_users ?? 0

    return [
      {
        id: 'portalUsers',
        label: t('admin.cards.portalUsers.label'),
        value: formatValue(metrics.total_users),
        helper: t('admin.cards.portalUsers.helper'),
        iconClass: 'bi-people-fill',
        iconColor: '#2563EB',
        iconBg: '#DBEAFE',
        helperTone: 'positive',
      },
      {
        id: 'customers',
        label: t('admin.cards.customers.label'),
        value: formatValue(metrics.total_customers),
        helper: t('admin.cards.customers.helper'),
        iconClass: 'bi-buildings-fill',
        iconColor: '#16A34A',
        iconBg: '#DCFCE7',
        helperTone: 'positive',
      },
      {
        id: 'sessions',
        label: t('admin.cards.sessions.label'),
        value: formatValue(metrics.active_sessions),
        helper: t('admin.cards.sessions.helper'),
        iconClass: 'bi-graph-up',
        iconColor: '#FABD05',
        iconBg: '#FEF9C3',
        helperTone: 'neutral',
      },
      {
        id: 'approvals',
        label: t('admin.cards.approvals.label'),
        value: formatValue(pendingValue),
        helper:
          pendingValue > 0
            ? t('admin.cards.approvals.helper')
            : t('admin.cards.approvals.helperResolved'),
        iconClass: 'bi-card-checklist',
        iconColor: '#EA4436',
        iconBg: '#FDE5E1',
        helperTone: pendingValue > 0 ? 'danger' : 'positive',
      },
    ]
  }, [numberFormatter, overview, t])

  const users: UserRow[] = useMemo(
    () => [
      {
        id: '1',
        name: 'John Smith',
        email: 'john.smith@techcorp.com',
        role: t('admin.table.roles.customerAdmin'),
        roleVariant: 'admin',
        customer: 'TechCorp Inc.',
        lastLogin: t('admin.table.lastLogin.hours', { count: 2 }),
        status: 'Active',
        actionLabel: t('admin.table.actions.customerAdmin'),
      },
      {
        id: '2',
        name: 'Anna Johnson',
        email: 'anna@globalsol.com',
        role: t('admin.table.roles.customerUser'),
        roleVariant: 'user',
        customer: 'Global Solutions',
        lastLogin: t('admin.table.lastLogin.days', { count: 1 }),
        status: 'Active',
        actionLabel: t('admin.table.actions.customerUser'),
      },
      {
        id: '3',
        name: 'David Wilson',
        email: 'david@creative.com',
        role: t('admin.table.roles.supportAgent'),
        roleVariant: 'support',
        customer: 'Creative Agency',
        lastLogin: t('admin.table.lastLogin.days', { count: 5 }),
        status: 'Inactive',
        actionLabel: t('admin.table.actions.supportAgent'),
      },
      {
        id: '4',
        name: 'Mike Chen',
        email: 'mike@startupxyz.com',
        role: t('admin.table.roles.portalAdmin'),
        roleVariant: 'danger',
        customer: 'StartupXYZ',
        lastLogin: t('admin.table.lastLogin.minutes', { count: 30 }),
        status: 'Active',
        actionLabel: t('admin.table.actions.portalAdmin'),
      },
    ],
    [t],
  )
  const initials = useMemo(() => {
    const rawName = (user.user_metadata?.full_name as string | undefined)?.trim()
    const source = rawName && rawName.length > 0 ? rawName : user.email ?? ''
    return source
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('')
      .padEnd(2, 'T')
  }, [user])
  const displayName = useMemo(() => {
    const rawName = (user.user_metadata?.full_name as string | undefined)?.trim()
    if (rawName && rawName.length > 0) {
      return rawName
    }
    return user.email ?? ''
  }, [user])
  const avatarUrl = useMemo(() => {
    const rawUrl = (user.user_metadata?.avatar_url as string | undefined)?.trim()
    return rawUrl && rawUrl.length > 0 ? rawUrl : undefined
  }, [user])
  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      await onSignOut()
    } finally {
      setSigningOut(false)
    }
  }
  return (
    <div className="admin-root">
      <header className="admin-header">
        <div className="admin-header__brand">
          <img src={logo} alt="Tigabytes" />
          <nav className="admin-header__nav" aria-label={t('admin.nav.label')}>
            <a href="#" className="is-active">
              {t('admin.nav.admin')}
            </a>
            <a href="#">{t('admin.nav.licenses')}</a>
            <a href="#">{t('admin.nav.support')}</a>
            <a href="#">{t('admin.nav.billing')}</a>
          </nav>
        </div>
        <div className="admin-header__controls">
          <LanguageSelector />
          <button className="header-icon" type="button" aria-label={t('admin.nav.notifications')}>
            <i className="bi bi-bell-fill" aria-hidden="true"></i>
            <span className="header-icon__badge">3</span>
          </button>
          <div className="admin-user-chip">
            <div className="admin-user-chip__avatar">
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div className="admin-user-chip__info">
              <span className="admin-user-chip__name">{displayName}</span>
              <span className="admin-user-chip__role">{t('admin.userRole')}</span>
            </div>
            <button className="admin-user-chip__logout" type="button" onClick={handleSignOut} disabled={signingOut}>
              {signingOut ? t('signingOut') : t('signOut')}
            </button>
          </div>
        </div>
      </header>
      <main className="admin-content">
        <section className="admin-content__hero">
          <h1>{t('admin.title')}</h1>
          <p>{t('admin.subtitle')}</p>
        </section>
        <section className="admin-metrics" aria-label={t('admin.cards.ariaLabel')}>
          {summaryCards.map((card) => (
            <article key={card.id} className="admin-card">
              <div className="admin-card__content">
                <span className="admin-card__label">{card.label}</span>
                <strong className="admin-card__value">{card.value}</strong>
                <span className={`admin-card__helper admin-card__helper--${card.helperTone}`}>
                  {card.helper}
                </span>
              </div>
              <div className="admin-card__icon" aria-hidden="true" style={{ backgroundColor: card.iconBg }}>
                {card.iconClass ? (
                  <i className={`bi ${card.iconClass}`} style={{ color: card.iconColor }} aria-hidden="true"></i>
                ) : card.iconSrc ? (
                  <img src={card.iconSrc} alt="" />
                ) : null}
              </div>
            </article>
          ))}
        </section>
        <section className="admin-panel" aria-labelledby="user-management-heading">
          <header className="admin-panel__header">
            <div>
              <h2 id="user-management-heading">{t('admin.table.title')}</h2>
              <p>{t('admin.table.subtitle')}</p>
            </div>
          </header>
          <div className="admin-panel__toolbar">
            <div className="search-input">
              <i className="bi bi-search" aria-hidden="true"></i>
              <input type="search" placeholder={t('admin.table.searchPlaceholder')} />
            </div>
            <div className="toolbar-actions">
              <div className="toolbar-actions__primary">
                <ToolbarActionButton
                  label={t('admin.actions.manageRoles')}
                  icon="bi-shield-shaded"
                  backgroundColor="#391199"
                />
                <ToolbarActionButton
                  label={t('admin.actions.createRole')}
                  icon="bi-plus"
                  backgroundColor="#2662DB"
                />
              </div>
              <select className="toolbar-select" aria-label={t('admin.table.roleFilterLabel')} defaultValue="all">
                <option value="all">{t('admin.table.roleFilterAll')}</option>
              </select>
              <button type="button" className="toolbar-filter" aria-label={t('admin.table.filterLabel')}>
                <i className="bi bi-funnel-fill" aria-hidden="true"></i>
              </button>
            </div>
          </div>
          <div className="admin-table" role="table">
            <div className="admin-table__head" role="row">
              <span role="columnheader">{t('admin.table.headers.user')}</span>
              <span role="columnheader">{t('admin.table.headers.role')}</span>
              <span role="columnheader">{t('admin.table.headers.customer')}</span>
              <span role="columnheader">{t('admin.table.headers.lastLogin')}</span>
              <span role="columnheader">{t('admin.table.headers.status')}</span>
              <span role="columnheader" className="is-actions">{t('admin.table.headers.actions')}</span>
            </div>
            {users.map((item) => (
              <div key={item.id} className="admin-table__row" role="row">
                <div role="cell" className="user-cell">
                  <div className="avatar" aria-hidden="true">
                    {item.name
                      .split(' ')
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((word) => word[0]?.toUpperCase() ?? '')
                      .join('')}
                  </div>
                  <div>
                    <span className="user-name">{item.name}</span>
                    <span className="user-email">{item.email}</span>
                  </div>
                </div>
                <div role="cell">
                  <span className={`role-badge role-badge--${item.roleVariant}`}>{item.role}</span>
                </div>
                <div role="cell" className="customer-cell">
                  {item.customer}
                  <button type="button" aria-label={t('admin.table.openCustomer')}>
                    ↗
                  </button>
                </div>
                <div role="cell">{item.lastLogin}</div>
                <div role="cell">
                  <span className={`status-chip status-chip--${statusTone[item.status]}`}>{t(`admin.table.status.${item.status.toLowerCase()}`)}</span>
                </div>
                <div role="cell" className="is-actions">
                  <button type="button" className="btn btn--ghost">
                    {item.actionLabel}
                  </button>
                  <button type="button" className="btn btn--danger btn--icon" aria-label={t('admin.table.removeUser')}>
                    <i className="bi bi-trash3-fill" aria-hidden="true"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
          <footer className="admin-panel__footer">
            <span>{t('admin.table.pagination.summary', { range: '1-4', total: 247 })}</span>
            <div className="pagination">
              <button type="button" className="btn btn--ghost" disabled>
                {t('admin.table.pagination.prev')}
              </button>
              <button type="button" className="btn btn--primary is-active">
                1
              </button>
              <button type="button" className="btn btn--ghost">
                2
              </button>
              <button type="button" className="btn btn--ghost">
                3
              </button>
              <button type="button" className="btn btn--ghost">
                {t('admin.table.pagination.next')}
              </button>
            </div>
          </footer>
        </section>
      </main>
    </div>
  )
}

export default AdminPortalPage
