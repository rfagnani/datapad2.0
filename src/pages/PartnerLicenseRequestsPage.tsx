import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { User } from '@supabase/supabase-js'
import PortalHeader, { type PortalHeaderNavItem } from '../components/PortalHeader'
import '../styles/partner-requests.css'

type RequestStatus = 'pendingReview' | 'evaluation' | 'approved' | 'rejected'
type RequestPriority = 'low' | 'medium' | 'high'
type LicenseType = 'starter' | 'business' | 'enterprise'

type LicenseRequestRow = {
  id: string
  code: string
  seats: number
  customerName: string
  customerEmail: string
  company: string
  plan: string
  monthlyPrice: number
  priority: RequestPriority
  status: RequestStatus
  submittedAt: string
  licenseType: LicenseType
  avatarColor: string
}

const REQUESTS_SEED: LicenseRequestRow[] = [
  {
    id: 'req-001',
    code: '#LR-2024-001',
    seats: 25,
    customerName: 'TechCorp Inc.',
    customerEmail: 'john@techcorp.com',
    company: 'TechCorp Inc.',
    plan: 'Google Workspace Business Standard',
    monthlyPrice: 300,
    priority: 'high',
    status: 'pendingReview',
    submittedAt: '2024-01-15T14:30:00Z',
    licenseType: 'business',
    avatarColor: '#eef2ff',
  },
  {
    id: 'req-002',
    code: '#LR-2024-002',
    seats: 15,
    customerName: 'Startup XYZ',
    customerEmail: 'mike@startupxyz.com',
    company: 'StartupXYZ',
    plan: 'Google Workspace Business Plus',
    monthlyPrice: 270,
    priority: 'medium',
    status: 'evaluation',
    submittedAt: '2024-01-14T11:15:00Z',
    licenseType: 'business',
    avatarColor: '#fce7f3',
  },
  {
    id: 'req-003',
    code: '#LR-2024-003',
    seats: 50,
    customerName: 'Global Retailers',
    customerEmail: 'sofia@globalretailers.com',
    company: 'Global Retailers',
    plan: 'Google Workspace Enterprise Standard',
    monthlyPrice: 1200,
    priority: 'high',
    status: 'pendingReview',
    submittedAt: '2024-01-13T16:45:00Z',
    licenseType: 'enterprise',
    avatarColor: '#dcfce7',
  },
  {
    id: 'req-004',
    code: '#LR-2024-004',
    seats: 10,
    customerName: 'Fintech Now',
    customerEmail: 'team@fintechnow.io',
    company: 'Fintech Now',
    plan: 'Google Workspace Business Starter',
    monthlyPrice: 120,
    priority: 'low',
    status: 'approved',
    submittedAt: '2024-01-12T10:10:00Z',
    licenseType: 'starter',
    avatarColor: '#fee2e2',
  },
  {
    id: 'req-005',
    code: '#LR-2024-005',
    seats: 40,
    customerName: 'Acme Studios',
    customerEmail: 'lucas@acmestudios.com',
    company: 'Acme Studios',
    plan: 'Google Workspace Business Plus',
    monthlyPrice: 720,
    priority: 'medium',
    status: 'evaluation',
    submittedAt: '2024-01-11T09:00:00Z',
    licenseType: 'business',
    avatarColor: '#fef9c3',
  },
  {
    id: 'req-006',
    code: '#LR-2024-006',
    seats: 60,
    customerName: 'LogiMove',
    customerEmail: 'support@logimove.co',
    company: 'LogiMove',
    plan: 'Google Workspace Enterprise Plus',
    monthlyPrice: 1800,
    priority: 'high',
    status: 'rejected',
    submittedAt: '2024-01-10T13:20:00Z',
    licenseType: 'enterprise',
    avatarColor: '#e0f2fe',
  },
]

const statusClassName: Record<RequestStatus, string> = {
  pendingReview: 'status-pill--pending',
  evaluation: 'status-pill--evaluation',
  approved: 'status-pill--approved',
  rejected: 'status-pill--rejected',
}

const priorityClassName: Record<RequestPriority, string> = {
  high: 'priority-tag--high',
  medium: 'priority-tag--medium',
  low: 'priority-tag--low',
}

const getInitials = (value: string): string => {
  const trimmed = value.trim()
  if (!trimmed) {
    return '--'
  }
  return trimmed
    .split(/\s+/)
    .slice(0, 2)
    .map((segment) => segment[0]?.toUpperCase() ?? '')
    .join('')
}

type PartnerLicenseRequestsPageProps = {
  user: User
  onSignOut: () => Promise<void>
}

type FiltersState = {
  status: 'all' | RequestStatus
  priority: 'all' | RequestPriority
  licenseType: 'all' | LicenseType
  customer: string
  startDate: string
  endDate: string
}

const DEFAULT_FILTERS: FiltersState = {
  status: 'all',
  priority: 'all',
  licenseType: 'all',
  customer: '',
  startDate: '',
  endDate: '',
}

function PartnerLicenseRequestsPage({ user, onSignOut }: PartnerLicenseRequestsPageProps) {
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage ?? i18n.language
  const [filters, setFilters] = useState<FiltersState>(DEFAULT_FILTERS)
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)

  useEffect(() => {
    document.body.classList.add('admin-body')
    return () => {
      document.body.classList.remove('admin-body')
    }
  }, [])

  useEffect(() => {
    if (!feedbackMessage) {
      return
    }
    const timeoutId = window.setTimeout(() => setFeedbackMessage(null), 4000)
    return () => window.clearTimeout(timeoutId)
  }, [feedbackMessage])

  const headerNavItems = useMemo<PortalHeaderNavItem[]>(
    () => [
      { id: 'overview', label: t('admin.nav.admin'), icon: 'bi-speedometer2', href: '/admin' },
      {
        id: 'requests',
        label: t('admin.licenseRequests.navLabel'),
        icon: 'bi-card-checklist',
        href: '/admin/license-requests',
        isActive: true,
      },
      { id: 'support', label: t('admin.nav.support'), icon: 'bi-life-preserver', href: '#' },
    ],
    [t],
  )

  const handleFilterChange =
    (key: keyof FiltersState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = event.target.value
      setFilters((previous) => ({
        ...previous,
        [key]: value,
      }))
    }

  const handleClearFilters = () => {
    setFilters(DEFAULT_FILTERS)
  }

  const parseDate = (value: string): Date | null => {
    if (!value) {
      return null
    }
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  const filteredRequests = useMemo(() => {
    const start = parseDate(filters.startDate)
    const end = parseDate(filters.endDate)
    const normalizedSearch = filters.customer.trim().toLowerCase()

    return REQUESTS_SEED.filter((request) => {
      if (filters.status !== 'all' && request.status !== filters.status) {
        return false
      }
      if (filters.priority !== 'all' && request.priority !== filters.priority) {
        return false
      }
      if (filters.licenseType !== 'all' && request.licenseType !== filters.licenseType) {
        return false
      }

      if (normalizedSearch.length > 0) {
        const haystack = `${request.customerName} ${request.customerEmail} ${request.company}`.toLowerCase()
        if (!haystack.includes(normalizedSearch)) {
          return false
        }
      }

      const submitted = new Date(request.submittedAt)
      if (start && submitted < start) {
        return false
      }
      if (end) {
        const endOfDay = new Date(end)
        endOfDay.setHours(23, 59, 59, 999)
        if (submitted > endOfDay) {
          return false
        }
      }

      return true
    })
  }, [filters])

  const pendingReviewsCount = useMemo(
    () => REQUESTS_SEED.filter((request) => request.status === 'pendingReview').length,
    [],
  )

  const numberFormatter = useMemo(
    () => new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }),
    [locale],
  )

  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', year: 'numeric' }),
    [locale],
  )
  const timeFormatter = useMemo(() => new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }), [locale])

  const handleAction = (request: LicenseRequestRow, action: 'approve' | 'reject') => () => {
    const key =
      action === 'approve'
        ? 'admin.licenseRequests.actions.approved'
        : 'admin.licenseRequests.actions.rejected'
    setFeedbackMessage(t(key, { code: request.code }))
  }

  const handleExport = () => {
    setFeedbackMessage(t('admin.licenseRequests.actions.exported'))
  }

  const handleRefresh = () => {
    setFeedbackMessage(t('admin.licenseRequests.actions.refreshSuccess'))
  }

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

  const statusLabel = (status: RequestStatus) => t(`admin.licenseRequests.statuses.${status}`)
  const priorityLabel = (priority: RequestPriority) => t(`admin.licenseRequests.priorities.${priority}`)

  return (
    <div className="admin-root partner-requests-root">
      <PortalHeader
        navItems={headerNavItems}
        navAriaLabel={t('admin.nav.label')}
        notificationsCount={pendingReviewsCount}
        notificationsLabel={t('admin.nav.notifications')}
        displayName={displayName}
        roleLabel={t('admin.userRole')}
        avatarUrl={avatarUrl}
        onSignOut={onSignOut}
        signOutLabel={t('admin.actions.signOut')}
        signingOutLabel={t('admin.actions.signingOut')}
      />
      <main className="partner-requests-content">
        <section className="partner-requests-header">
          <div>
            <p className="partner-requests-header__eyebrow">{t('admin.licenseRequests.eyebrow')}</p>
            <h1>{t('admin.licenseRequests.title')}</h1>
            <p className="partner-requests-header__subtitle">{t('admin.licenseRequests.subtitle')}</p>
          </div>
          <div className="partner-requests-header__actions">
            <button type="button" className="partner-requests-pill" onClick={handleRefresh}>
              <i className="bi bi-clock-history" aria-hidden="true"></i>
              {t('admin.licenseRequests.pendingReviews', { count: pendingReviewsCount })}
            </button>
            <button type="button" className="partner-requests-primary" onClick={handleExport}>
              <i className="bi bi-download" aria-hidden="true"></i>
              {t('admin.licenseRequests.export')}
            </button>
          </div>
        </section>

        {feedbackMessage ? (
          <div className="partner-requests-feedback" role="status">
            <i className="bi bi-check-circle-fill" aria-hidden="true"></i>
            <span>{feedbackMessage}</span>
          </div>
        ) : null}

        <section className="partner-requests-filters" aria-label={t('admin.licenseRequests.filters.title')}>
          <div className="partner-requests-filters__header">
            <h2>{t('admin.licenseRequests.filters.title')}</h2>
            <button type="button" className="partner-requests-link" onClick={handleClearFilters}>
              {t('admin.licenseRequests.filters.clearAll')}
            </button>
          </div>
          <div className="partner-requests-filters__controls">
            <label>
              <span>{t('admin.licenseRequests.filters.statusLabel')}</span>
              <select value={filters.status} onChange={handleFilterChange('status')}>
                <option value="all">{t('admin.licenseRequests.filters.statusAll')}</option>
                <option value="pendingReview">{statusLabel('pendingReview')}</option>
                <option value="evaluation">{statusLabel('evaluation')}</option>
                <option value="approved">{statusLabel('approved')}</option>
                <option value="rejected">{statusLabel('rejected')}</option>
              </select>
            </label>
            <label>
              <span>{t('admin.licenseRequests.filters.priorityLabel')}</span>
              <select value={filters.priority} onChange={handleFilterChange('priority')}>
                <option value="all">{t('admin.licenseRequests.filters.priorityAll')}</option>
                <option value="high">{priorityLabel('high')}</option>
                <option value="medium">{priorityLabel('medium')}</option>
                <option value="low">{priorityLabel('low')}</option>
              </select>
            </label>
            <label>
              <span>{t('admin.licenseRequests.filters.licenseTypeLabel')}</span>
              <select value={filters.licenseType} onChange={handleFilterChange('licenseType')}>
                <option value="all">{t('admin.licenseRequests.filters.typeAll')}</option>
                <option value="starter">{t('admin.licenseRequests.licenseTypes.starter')}</option>
                <option value="business">{t('admin.licenseRequests.licenseTypes.business')}</option>
                <option value="enterprise">{t('admin.licenseRequests.licenseTypes.enterprise')}</option>
              </select>
            </label>
            <label>
              <span>{t('admin.licenseRequests.filters.startDateLabel')}</span>
              <input
                type="date"
                value={filters.startDate}
                onChange={handleFilterChange('startDate')}
                placeholder={t('admin.licenseRequests.filters.datePlaceholder')}
              />
            </label>
            <label>
              <span>{t('admin.licenseRequests.filters.endDateLabel')}</span>
              <input
                type="date"
                value={filters.endDate}
                onChange={handleFilterChange('endDate')}
                placeholder={t('admin.licenseRequests.filters.datePlaceholder')}
              />
            </label>
            <label className="partner-requests-filters__search">
              <span>{t('admin.licenseRequests.filters.customerLabel')}</span>
              <div className="partner-requests-input-icon">
                <i className="bi bi-search" aria-hidden="true"></i>
                <input
                  type="search"
                  value={filters.customer}
                  onChange={handleFilterChange('customer')}
                  placeholder={t('admin.licenseRequests.filters.searchPlaceholder')}
                />
              </div>
            </label>
          </div>
        </section>

        <section className="partner-requests-table-card">
          <div className="partner-requests-table-card__header">
            <div>
              <h2>{t('admin.licenseRequests.table.title')}</h2>
              <p>{t('admin.licenseRequests.table.totalLabel', { count: filteredRequests.length })}</p>
            </div>
            <button type="button" className="partner-requests-icon-button" onClick={handleRefresh}>
              <i className="bi bi-arrow-repeat" aria-hidden="true"></i>
              <span>{t('admin.licenseRequests.table.refresh')}</span>
            </button>
          </div>
          <div className="partner-requests-table-wrapper">
            <table className="partner-requests-table">
              <thead>
                <tr>
                  <th>{t('admin.licenseRequests.table.headers.request')}</th>
                  <th>{t('admin.licenseRequests.table.headers.customer')}</th>
                  <th>{t('admin.licenseRequests.table.headers.details')}</th>
                  <th>{t('admin.licenseRequests.table.headers.priority')}</th>
                  <th>{t('admin.licenseRequests.table.headers.status')}</th>
                  <th>{t('admin.licenseRequests.table.headers.submitted')}</th>
                  <th>{t('admin.licenseRequests.table.headers.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="partner-requests-table__empty">
                      {t('admin.licenseRequests.table.empty')}
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((request) => {
                    const submitted = new Date(request.submittedAt)
                    return (
                      <tr key={request.id}>
                        <td>
                          <div className="partner-requests-request-cell">
                            <strong>{request.code}</strong>
                            <span>{t('admin.licenseRequests.table.seatsLabel', { count: request.seats })}</span>
                          </div>
                        </td>
                        <td>
                          <div className="partner-requests-customer">
                            <span
                              className="partner-requests-avatar"
                              style={{ backgroundColor: request.avatarColor }}
                            >
                              {getInitials(request.customerName)}
                            </span>
                            <div>
                              <strong>{request.customerName}</strong>
                              <span>{request.customerEmail}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="partner-requests-license">
                            <strong>{request.plan}</strong>
                            <span>
                              {t('admin.licenseRequests.table.pricePerMonth', {
                                value: numberFormatter.format(request.monthlyPrice),
                              })}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className={`priority-tag ${priorityClassName[request.priority]}`}>
                            {priorityLabel(request.priority)}
                          </span>
                        </td>
                        <td>
                          <span className={`status-pill ${statusClassName[request.status]}`}>
                            {statusLabel(request.status)}
                          </span>
                        </td>
                        <td>
                          <div className="partner-requests-date">
                            <strong>{dateFormatter.format(submitted)}</strong>
                            <span>{timeFormatter.format(submitted)}</span>
                          </div>
                        </td>
                        <td>
                          <div className="partner-requests-actions">
                            <button
                              type="button"
                              className="partner-requests-approve"
                              onClick={handleAction(request, 'approve')}
                            >
                              {t('admin.licenseRequests.table.approve')}
                            </button>
                            <button
                              type="button"
                              className="partner-requests-reject"
                              onClick={handleAction(request, 'reject')}
                            >
                              {t('admin.licenseRequests.table.reject')}
                            </button>
                            <button type="button" className="partner-requests-icon-only" aria-label={t('admin.licenseRequests.table.view')}>
                              <i className="bi bi-eye" aria-hidden="true"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  )
}

export default PartnerLicenseRequestsPage
