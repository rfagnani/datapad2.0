import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { User } from '@supabase/supabase-js'
import PortalHeader from '../components/PortalHeader'
import { buildHeaderNavItems, type HeaderRole } from '../lib/headerNavigation'
import { supabase } from '../lib/supabaseClient'
import '../styles/support-analytics.css'

type SupportAnalyticsPageProps = {
  user: User
  roleState: Extract<HeaderRole, 'customerAdmin'>
  onSignOut: () => Promise<void>
}

type SummaryMetric = {
  totalTickets: number
  avgResponseHours: number | null
  resolutionRate: number | null
  resellerName: string | null
  monthly: Array<{ period: string; label: string; total: number }>
  categories: Array<{ category: string; total: number }>
  responseMetrics: Array<{ urgency: string; avgHours: number | null; targetHours: number | null }>
}

type SupportTicket = {
  ticketId: number | string
  subject: string
  description: string
  category: string
  priority: string
  status: string
  statusCode: number | null
  createdAt: string | null
  updatedAt: string | null
}

const ROLE_ID_LABEL_MAPPING: Record<number, string> = {
  1: 'Portal Admin',
  2: 'Customer Admin',
  3: 'PartnerOps Admin',
  4: 'Customer User',
  5: 'Pending',
}

const ROLE_KEY_LABEL_MAPPING: Record<string, string> = {
  customer_admin: 'Customer Admin',
  customer_user: 'Customer User',
  portal_admin: 'Portal Admin',
  support_agent: 'Support Agent',
  partnerops_admin: 'PartnerOps Admin',
  partner_ops_admin: 'PartnerOps Admin',
  pending: 'Pending',
}

const normalizeRoleLabel = (value: unknown): string | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return ROLE_ID_LABEL_MAPPING[Math.trunc(value)] ?? null
  }

  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  if (trimmed.length === 0) {
    return null
  }

  const normalized = trimmed.toLowerCase().replace(/\s+/g, '_')
  if (normalized in ROLE_KEY_LABEL_MAPPING) {
    return ROLE_KEY_LABEL_MAPPING[normalized]
  }

  return trimmed
}

const deriveRoleLabel = (user: User): string => {
  const candidates: (unknown | undefined)[] = [
    user.user_metadata?.role_label,
    user.app_metadata?.role_label,
    user.user_metadata?.role,
    user.app_metadata?.role,
    user.user_metadata?.portal_role,
    user.app_metadata?.portal_role,
    user.user_metadata?.role_id,
    user.app_metadata?.role_id,
  ]

  for (const candidate of candidates) {
    const resolved = normalizeRoleLabel(candidate)
    if (resolved) {
      return resolved
    }
  }

  return 'Customer Workspace'
}

const getUserDisplayName = (user: User): string => {
  const metadata = user.user_metadata ?? {}
  const candidates = [
    metadata.full_name,
    metadata.name,
    metadata.display_name,
    metadata.given_name && metadata.family_name ? `${metadata.given_name} ${metadata.family_name}` : undefined,
  ]

  for (const entry of candidates) {
    if (typeof entry === 'string' && entry.trim().length > 0) {
      return entry.trim()
    }
  }

  return user.email?.trim() || 'Customer User'
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const asNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string') {
    const parsed = Number(value.trim())
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }
  return null
}

const asString = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }
  return null
}

const statusCodeOptions = [
  { key: 'all', value: null },
  { key: 'open', value: 2 },
  { key: 'pending', value: 3 },
  { key: 'resolved', value: 4 },
  { key: 'closed', value: 5 },
] as const

const formatHours = (value: number | null, locale?: string): string => {
  if (value === null) {
    return '-'
  }
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: value >= 10 ? 0 : 1 }).format(value)}h`
}

const formatPercent = (value: number | null, locale?: string): string => {
  if (value === null) {
    return '-'
  }
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value)}%`
}

const formatDateTime = (value: string | null, locale?: string): { date: string; time: string } => {
  if (!value) {
    return { date: '-', time: '-' }
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return { date: '-', time: '-' }
  }

  return {
    date: parsed.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' }),
    time: parsed.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }),
  }
}

function SupportAnalyticsPage({ user, roleState, onSignOut }: SupportAnalyticsPageProps) {
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage ?? i18n.language ?? undefined

  const [months, setMonths] = useState(24)
  const [statusCodeFilter, setStatusCodeFilter] = useState<number | null>(null)
  const [summary, setSummary] = useState<SummaryMetric | null>(null)
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const displayName = useMemo(() => getUserDisplayName(user), [user])
  const roleLabel = useMemo(() => deriveRoleLabel(user), [user])

  const headerNavItems = useMemo(
    () =>
      buildHeaderNavItems({
        t,
        role: roleState,
        activeSection: 'supportAnalytics',
        showSupportAnalytics: true,
      }),
    [roleState, t],
  )

  useEffect(() => {
    document.body.classList.add('customer-body', 'support-analytics-body')
    return () => {
      document.body.classList.remove('customer-body', 'support-analytics-body')
    }
  }, [])

  useEffect(() => {
    let isActive = true

    const load = async () => {
      if (!supabase) {
        if (isActive) {
          setError(t('customer.supportAnalytics.errors.missingSupabase'))
          setLoading(false)
        }
        return
      }

      setLoading(true)
      setError(null)

      try {
        const appClient = supabase.schema('app')

        const [{ data: summaryData, error: summaryError }, { data: ticketsData, error: ticketsError }] = await Promise.all([
          appClient.rpc('fn_support_analytics_summary', {
            p_months: months,
            p_company_mapping_id: null,
          }),
          appClient.rpc('fn_support_analytics_tickets', {
            p_months: months,
            p_limit: 20,
            p_status: statusCodeFilter,
            p_company_mapping_id: null,
          }),
        ])

        if (summaryError) {
          throw summaryError
        }

        if (ticketsError) {
          throw ticketsError
        }

        const summaryRecord = isRecord(summaryData) ? summaryData : {}
        const monthlyRaw = Array.isArray(summaryRecord.monthly) ? summaryRecord.monthly : []
        const categoriesRaw = Array.isArray(summaryRecord.categories) ? summaryRecord.categories : []
        const responseRaw = Array.isArray(summaryRecord.response_metrics) ? summaryRecord.response_metrics : []

        const nextSummary: SummaryMetric = {
          totalTickets: asNumber(summaryRecord.total_tickets) ?? 0,
          avgResponseHours: asNumber(summaryRecord.avg_response_hours),
          resolutionRate: asNumber(summaryRecord.resolution_rate),
          resellerName: asString(summaryRecord.reseller_name),
          monthly: monthlyRaw
            .map((entry) => {
              if (!isRecord(entry)) {
                return null
              }
              const total = asNumber(entry.total)
              const period = asString(entry.period)
              const label = asString(entry.label)
              if (total === null || !period) {
                return null
              }
              return {
                period,
                label: label ?? period,
                total,
              }
            })
            .filter((entry): entry is { period: string; label: string; total: number } => entry !== null),
          categories: categoriesRaw
            .map((entry) => {
              if (!isRecord(entry)) {
                return null
              }
              const total = asNumber(entry.total)
              const category = asString(entry.category)
              if (total === null || !category) {
                return null
              }
              return { category, total }
            })
            .filter((entry): entry is { category: string; total: number } => entry !== null),
          responseMetrics: responseRaw
            .map((entry) => {
              if (!isRecord(entry)) {
                return null
              }
              const urgency = asString(entry.urgency)
              if (!urgency) {
                return null
              }
              return {
                urgency,
                avgHours: asNumber(entry.avg_hours),
                targetHours: asNumber(entry.target_hours),
              }
            })
            .filter((entry): entry is { urgency: string; avgHours: number | null; targetHours: number | null } => entry !== null),
        }

        const ticketRows = Array.isArray(ticketsData) ? ticketsData : []
        const nextTickets: SupportTicket[] = ticketRows
          .map((entry) => {
            if (!isRecord(entry)) {
              return null
            }
            const ticketId = asNumber(entry.ticket_id) ?? asString(entry.ticket_id)
            if (ticketId === null) {
              return null
            }
            return {
              ticketId,
              subject: asString(entry.subject) ?? '-',
              description: asString(entry.description) ?? '',
              category: asString(entry.category) ?? '-',
              priority: asString(entry.priority) ?? '-',
              status: asString(entry.status) ?? '-',
              statusCode: asNumber(entry.status_code),
              createdAt: asString(entry.created_at),
              updatedAt: asString(entry.updated_at),
            }
          })
          .filter((entry): entry is SupportTicket => entry !== null)

        if (isActive) {
          setSummary(nextSummary)
          setTickets(nextTickets)
        }
      } catch (loadError) {
        console.error('Failed to load support analytics', loadError)
        if (isActive) {
          setError(t('customer.supportAnalytics.errors.loadFailed'))
          setSummary(null)
          setTickets([])
        }
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      isActive = false
    }
  }, [months, statusCodeFilter, t])

  const maxMonthlyValue = useMemo(() => {
    if (!summary || summary.monthly.length === 0) {
      return 0
    }
    return Math.max(...summary.monthly.map((entry) => entry.total), 0)
  }, [summary])

  const linePath = useMemo(() => {
    if (!summary || summary.monthly.length === 0) {
      return ''
    }

    const width = 640
    const height = 220
    const points = summary.monthly.map((entry, index) => {
      const x = summary.monthly.length === 1 ? width / 2 : (index / (summary.monthly.length - 1)) * width
      const y = maxMonthlyValue > 0 ? height - (entry.total / maxMonthlyValue) * height : height
      return `${x},${y}`
    })

    return `M ${points.join(' L ')}`
  }, [maxMonthlyValue, summary])

  return (
    <div className="customer-root support-analytics-root">
      <PortalHeader
        navItems={headerNavItems}
        navAriaLabel={t('customer.nav.label')}
        notificationsCount={null}
        notificationsLabel={t('customer.nav.notifications')}
        displayName={displayName}
        roleLabel={roleLabel}
        avatarUrl={
          typeof user.user_metadata?.avatar_url === 'string' && user.user_metadata.avatar_url.trim().length > 0
            ? user.user_metadata.avatar_url
            : undefined
        }
        onSignOut={onSignOut}
        signOutLabel={t('signOut')}
        signingOutLabel={t('signingOut')}
      />

      <main className="support-analytics-content">
        <section className="support-analytics-topbar">
          <div>
            <h1>{t('customer.supportAnalytics.title')}</h1>
            <p>
              {summary?.resellerName
                ? t('customer.supportAnalytics.subtitleWithCustomer', { customer: summary.resellerName })
                : t('customer.supportAnalytics.subtitle')}
            </p>
          </div>
          <div className="support-analytics-topbar__actions">
            <select value={months} onChange={(event) => setMonths(Number(event.target.value))}>
              <option value={3}>{t('customer.supportAnalytics.period.last3Months')}</option>
              <option value={6}>{t('customer.supportAnalytics.period.last6Months')}</option>
              <option value={12}>{t('customer.supportAnalytics.period.last12Months')}</option>
              <option value={24}>{t('customer.supportAnalytics.period.last24Months')}</option>
            </select>
            <button
              type="button"
              className="support-analytics-export"
              onClick={() => window.print()}
            >
              <i className="bi bi-download" aria-hidden="true"></i>
              {t('customer.supportAnalytics.export')}
            </button>
          </div>
        </section>

        {error ? <p className="support-analytics-error">{error}</p> : null}

        <section className="support-analytics-metrics">
          <article className="support-analytics-metric">
            <span className="support-analytics-metric__label">{t('customer.supportAnalytics.metrics.totalTickets')}</span>
            <strong>{summary?.totalTickets ?? 0}</strong>
          </article>
          <article className="support-analytics-metric">
            <span className="support-analytics-metric__label">{t('customer.supportAnalytics.metrics.avgResponse')}</span>
            <strong>{formatHours(summary?.avgResponseHours ?? null, locale)}</strong>
          </article>
          <article className="support-analytics-metric">
            <span className="support-analytics-metric__label">{t('customer.supportAnalytics.metrics.resolutionRate')}</span>
            <strong>{formatPercent(summary?.resolutionRate ?? null, locale)}</strong>
          </article>
        </section>

        <section className="support-analytics-panels support-analytics-panels--split">
          <article className="support-analytics-panel">
            <header>
              <h2>{t('customer.supportAnalytics.charts.ticketsOverTime')}</h2>
            </header>
            {loading || !summary ? (
              <p className="support-analytics-empty">{t('loading.generic')}</p>
            ) : summary.monthly.length === 0 ? (
              <p className="support-analytics-empty">{t('customer.supportAnalytics.empty')}</p>
            ) : (
              <div className="support-analytics-line-chart">
                <svg viewBox="0 0 680 240" role="img" aria-label={t('customer.supportAnalytics.charts.ticketsOverTime')}>
                  <path d={linePath} />
                  {summary.monthly.map((entry, index) => {
                    const x = summary.monthly.length === 1 ? 640 / 2 : (index / (summary.monthly.length - 1)) * 640
                    const y = maxMonthlyValue > 0 ? 220 - (entry.total / maxMonthlyValue) * 220 : 220
                    return <circle key={entry.period} cx={x} cy={y} r={5}></circle>
                  })}
                </svg>
                <div className="support-analytics-line-chart__labels">
                  {summary.monthly.map((entry) => (
                    <span key={entry.period}>{entry.label}</span>
                  ))}
                </div>
              </div>
            )}
          </article>

          <article className="support-analytics-panel">
            <header>
              <h2>{t('customer.supportAnalytics.charts.responseMetrics')}</h2>
            </header>
            {loading || !summary ? (
              <p className="support-analytics-empty">{t('loading.generic')}</p>
            ) : summary.responseMetrics.length === 0 ? (
              <p className="support-analytics-empty">{t('customer.supportAnalytics.empty')}</p>
            ) : (
              <ul className="support-analytics-response-list">
                {summary.responseMetrics.map((entry) => (
                  <li key={entry.urgency}>
                    <div>
                      <strong>{entry.urgency}</strong>
                      <span>
                        {t('customer.supportAnalytics.responseTarget', {
                          hours: entry.targetHours ?? '-',
                        })}
                      </span>
                    </div>
                    <strong>{formatHours(entry.avgHours, locale)}</strong>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </section>

        <section className="support-analytics-panel">
          <header>
            <h2>{t('customer.supportAnalytics.charts.ticketsByCategory')}</h2>
          </header>
          {loading || !summary ? (
            <p className="support-analytics-empty">{t('loading.generic')}</p>
          ) : summary.categories.length === 0 ? (
            <p className="support-analytics-empty">{t('customer.supportAnalytics.empty')}</p>
          ) : (
            <ul className="support-analytics-category-bars">
              {summary.categories.map((entry) => {
                const max = Math.max(...summary.categories.map((item) => item.total), 1)
                const width = (entry.total / max) * 100
                return (
                  <li key={entry.category}>
                    <span>{entry.category}</span>
                    <div>
                      <i style={{ width: `${width}%` }}></i>
                    </div>
                    <strong>{entry.total}</strong>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="support-analytics-panel">
          <header className="support-analytics-panel__table-head">
            <h2>{t('customer.supportAnalytics.recentTickets.title')}</h2>
            <select
              value={statusCodeFilter ?? 'all'}
              onChange={(event) => {
                const value = event.target.value
                setStatusCodeFilter(value === 'all' ? null : Number(value))
              }}
            >
              {statusCodeOptions.map((option) => (
                <option key={option.key} value={option.value ?? 'all'}>
                  {t(`customer.supportAnalytics.statusFilter.${option.key}`)}
                </option>
              ))}
            </select>
          </header>
          {loading ? (
            <p className="support-analytics-empty">{t('loading.generic')}</p>
          ) : tickets.length === 0 ? (
            <p className="support-analytics-empty">{t('customer.supportAnalytics.empty')}</p>
          ) : (
            <div className="support-analytics-table-wrap">
              <table className="support-analytics-table">
                <thead>
                  <tr>
                    <th>{t('customer.supportAnalytics.recentTickets.headers.ticketId')}</th>
                    <th>{t('customer.supportAnalytics.recentTickets.headers.subject')}</th>
                    <th>{t('customer.supportAnalytics.recentTickets.headers.category')}</th>
                    <th>{t('customer.supportAnalytics.recentTickets.headers.priority')}</th>
                    <th>{t('customer.supportAnalytics.recentTickets.headers.status')}</th>
                    <th>{t('customer.supportAnalytics.recentTickets.headers.created')}</th>
                    <th>{t('customer.supportAnalytics.recentTickets.headers.updated')}</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket) => {
                    const created = formatDateTime(ticket.createdAt, locale)
                    const updated = formatDateTime(ticket.updatedAt, locale)
                    return (
                      <tr key={`${ticket.ticketId}-${ticket.createdAt ?? ''}`}>
                        <td className="support-analytics-table__id">#{ticket.ticketId}</td>
                        <td>
                          <strong>{ticket.subject}</strong>
                          {ticket.description ? <span>{ticket.description}</span> : null}
                        </td>
                        <td>{ticket.category}</td>
                        <td>
                          <span className={`support-tag support-tag--priority-${ticket.priority.toLowerCase()}`}>
                            {ticket.priority}
                          </span>
                        </td>
                        <td>
                          <span className={`support-tag support-tag--status-${ticket.status.toLowerCase().replace(/\s+/g, '-')}`}>
                            {ticket.status}
                          </span>
                        </td>
                        <td>
                          <strong>{created.date}</strong>
                          <span>{created.time}</span>
                        </td>
                        <td>
                          <strong>{updated.date}</strong>
                          <span>{updated.time}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default SupportAnalyticsPage
