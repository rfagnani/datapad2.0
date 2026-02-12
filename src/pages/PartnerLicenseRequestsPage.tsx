import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { User } from '@supabase/supabase-js'
import PortalHeader from '../components/PortalHeader'
import { supabase } from '../lib/supabaseClient'
import { buildHeaderNavItems, type HeaderRole } from '../lib/headerNavigation'
import '../styles/partner-requests.css'

type RequestStatus = 'pending' | 'approved' | 'rejected'
type LicenseType = 'starter' | 'business' | 'enterprise'
type ToastVariant = 'success' | 'error' | 'loading'

type RequestSource = {
  schema: string
  table: string
}

type CustomerProfile = {
  id: string
  authUserId: string
  name: string
  email: string
}

type NormalizedRequestRow = {
  id: string
  idColumn: string
  rawId: string | number
  source: RequestSource
  code: string
  seats: number
  customerName: string
  customerEmail: string
  company: string
  plan: string
  monthlyPrice: number | null
  status: RequestStatus
  submittedAt: string
  licenseType: LicenseType
  avatarColor: string
  statusColumn: string | null
  stageColumn: string | null
  updatedAtColumn: string | null
}

type RawSourceRow = {
  source: RequestSource
  row: Record<string, unknown>
  index: number
}

type PartnerLicenseRequestsPageProps = {
  user: User
  roleState: Extract<HeaderRole, 'admin' | 'supportAgent'>
  onSignOut: () => Promise<void>
}

type FiltersState = {
  status: 'all' | RequestStatus
  licenseType: 'all' | LicenseType
  customer: string
  startDate: string
  endDate: string
}

type ToastState = {
  message: string
  variant: ToastVariant
}

const statusClassName: Record<RequestStatus, string> = {
  pending: 'status-pill--pending',
  approved: 'status-pill--approved',
  rejected: 'status-pill--rejected',
}

const DEFAULT_FILTERS: FiltersState = {
  status: 'all',
  licenseType: 'all',
  customer: '',
  startDate: '',
  endDate: '',
}

const AVATAR_COLORS = ['#eef2ff', '#fce7f3', '#dcfce7', '#fee2e2', '#fef9c3', '#e0f2fe']

const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const toLowerCaseText = (value: unknown): string =>
  typeof value === 'string' ? value.trim().toLowerCase() : ''

const shouldFallbackToLegacyRequestsSource = (error: unknown): boolean => {
  if (!isObject(error)) {
    return false
  }

  const code = toLowerCaseText(error.code)
  const message = toLowerCaseText(error.message)
  const details = toLowerCaseText(error.details)
  const combined = `${message} ${details}`.trim()

  if (code === '42883' || code === '42p01' || code === 'pgrst202' || code === 'pgrst106') {
    return true
  }

  if (
    (combined.includes('function') && combined.includes('fn_requests_list')) ||
    combined.includes('does not exist') ||
    combined.includes('schema must be one of')
  ) {
    return true
  }

  return false
}

const toRecordArray = (value: unknown): Record<string, unknown>[] => {
  if (Array.isArray(value)) {
    return value.filter(isObject)
  }

  if (isObject(value)) {
    return [value]
  }

  return []
}

const hasKey = (record: Record<string, unknown>, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(record, key)

const resolveExistingKey = (record: Record<string, unknown>, keys: string[]): string | null => {
  for (const key of keys) {
    if (hasKey(record, key)) {
      return key
    }
  }

  return null
}

const pickUnknown = (record: Record<string, unknown>, keys: string[]): unknown => {
  for (const key of keys) {
    const value = record[key]
    if (value !== null && value !== undefined) {
      return value
    }
  }

  return undefined
}

const pickString = (record: Record<string, unknown>, keys: string[]): string | null => {
  const value = pickUnknown(record, keys)

  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }

  return null
}

const pickNumber = (record: Record<string, unknown>, keys: string[]): number | null => {
  const value = pickUnknown(record, keys)

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed.length === 0) {
      return null
    }

    const parsed = Number(trimmed)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}
const toIsoDate = (value: unknown): string | null => {
  if (!value) {
    return null
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString()
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed.length === 0) {
      return null
    }
    const parsed = new Date(trimmed)
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
  }

  return null
}

const normalizeToken = (value: string | null | undefined): string =>
  (value ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_')

const toRequestStatus = (statusValue: string | null, stageValue: string | null): RequestStatus => {
  const statusToken = normalizeToken(statusValue)
  const stageToken = normalizeToken(stageValue)
  const combined = `${statusToken} ${stageToken}`.trim()

  if (combined.length === 0) {
    return 'pending'
  }

  if (/(reject|declin|cancel|denied)/.test(combined)) {
    return 'rejected'
  }

  if (/(approve|complete|done|success|granted)/.test(combined)) {
    return 'approved'
  }

  if (/(evaluat|review|progress|buy|purchas|analysis)/.test(combined)) {
    return 'pending'
  }

  return 'pending'
}

const toLicenseType = (plan: string): LicenseType => {
  const token = normalizeToken(plan)

  if (token.includes('enterprise')) {
    return 'enterprise'
  }

  if (token.includes('starter') || token.includes('basic')) {
    return 'starter'
  }

  return 'business'
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

const toSyntheticCode = (id: string, index: number): string => {
  const compact = id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  const suffix = compact.length > 0 ? compact.slice(-6).padStart(6, '0') : String(index + 1).padStart(6, '0')
  return `#LR-${suffix}`
}

const toAvatarColor = (seed: string): string => {
  let hash = 0
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(index)
    hash |= 0
  }

  const paletteIndex = Math.abs(hash) % AVATAR_COLORS.length
  return AVATAR_COLORS[paletteIndex]
}

const parseDate = (value: string): Date | null => {
  if (!value) {
    return null
  }
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const toCsvCell = (value: string): string => {
  if (value.includes('"') || value.includes(',') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function PartnerLicenseRequestsPage({ user, roleState, onSignOut }: PartnerLicenseRequestsPageProps) {
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage ?? i18n.language
  const [filters, setFilters] = useState<FiltersState>(DEFAULT_FILTERS)
  const [requests, setRequests] = useState<NormalizedRequestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [actionLoadingById, setActionLoadingById] = useState<Record<string, boolean>>({})

  const showToast = useCallback((message: string, variant: ToastVariant) => {
    setToast({ message, variant })
  }, [])

  useEffect(() => {
    document.body.classList.add('admin-body')
    return () => {
      document.body.classList.remove('admin-body')
    }
  }, [])

  useEffect(() => {
    if (!toast || toast.variant === 'loading') {
      return
    }
    const timeoutId = window.setTimeout(() => setToast(null), 4000)
    return () => window.clearTimeout(timeoutId)
  }, [toast])

  const headerNavItems = useMemo(
    () => buildHeaderNavItems({ t, role: roleState, activeSection: 'licenseRequests' }),
    [roleState, t],
  )

  const resolveSourceRows = useCallback(async (): Promise<RawSourceRow[]> => {
    if (!supabase) {
      throw new Error(t('missingSupabaseConfig'))
    }

    const appClient = supabase.schema('app')
    const source: RequestSource = { schema: 'app', table: 'rpc.fn_requests_list' }

    try {
      const { data, error } = await appClient.rpc('fn_requests_list', {
        p_limit: 500,
        p_requester_id: null,
        p_include_all: true,
      })

      if (error) {
        throw error
      }

      return toRecordArray(data).map((row, index) => ({
        source,
        row,
        index,
      }))
    } catch (rpcError) {
      if (!shouldFallbackToLegacyRequestsSource(rpcError)) {
        throw rpcError
      }

      const { data, error } = await appClient.from('license_requests').select('*').limit(500)
      if (error) {
        throw rpcError
      }

      return toRecordArray(data).map((row, index) => ({
        source: { schema: 'app', table: 'license_requests' },
        row,
        index,
      }))
    }
  }, [t])
  const loadProfiles = useCallback(async (rawRows: RawSourceRow[]) => {
    const profileById = new Map<string, CustomerProfile>()
    const profileByAuthId = new Map<string, CustomerProfile>()

    if (!supabase) {
      return { profileById, profileByAuthId }
    }
    const client = supabase

    const userIds = Array.from(
      new Set(
        rawRows
          .map((entry) =>
            pickString(entry.row, [
              'requester_id',
              'requesterId',
              'user_id',
              'userId',
              'portal_user_id',
              'auth_user_id',
            ]),
          )
          .filter((value): value is string => Boolean(value)),
      ),
    )

    if (userIds.length === 0) {
      return { profileById, profileByAuthId }
    }

    const readProfilesByColumn = async (column: 'id' | 'auth_user_id') => {
      const { data, error } = await client.from('users').select('*').in(column, userIds)
      if (error) {
        return []
      }
      return toRecordArray(data)
    }

    const [byIdRows, byAuthRows] = await Promise.all([
      readProfilesByColumn('id'),
      readProfilesByColumn('auth_user_id'),
    ])

    const merged = [...byIdRows, ...byAuthRows]

    for (const row of merged) {
      const id = pickString(row, ['id']) ?? ''
      const authUserId = pickString(row, ['auth_user_id', 'auth_uid', 'user_uid']) ?? ''
      const name =
        pickString(row, ['name', 'full_name', 'display_name', 'user_name']) ??
        pickString(row, ['email']) ??
        'Unknown customer'
      const email = pickString(row, ['email', 'user_email', 'mail']) ?? ''

      const profile: CustomerProfile = {
        id,
        authUserId,
        name,
        email,
      }

      if (id.length > 0) {
        profileById.set(id, profile)
      }
      if (authUserId.length > 0) {
        profileByAuthId.set(authUserId, profile)
      }
    }

    return { profileById, profileByAuthId }
  }, [])

  const loadCompanyNames = useCallback(async (rawRows: RawSourceRow[]) => {
    const companyById = new Map<string, string>()

    if (!supabase) {
      return companyById
    }

    const companyIds = Array.from(
      new Set(
        rawRows
          .map((entry) => pickString(entry.row, ['company_id', 'company_mapping_id']) ?? '')
          .filter((value) => value.length > 0),
      ),
    )

    if (companyIds.length === 0) {
      return companyById
    }

    const { data, error } = await supabase.from('company_mappings').select('*').in('id', companyIds)
    if (error) {
      return companyById
    }

    for (const row of toRecordArray(data)) {
      const id = pickString(row, ['id']) ?? ''
      const name =
        pickString(row, ['company_name_reseller', 'company_name_hub', 'company_name', 'customer_name', 'name']) ?? ''

      if (id.length > 0 && name.length > 0) {
        companyById.set(id, name)
      }
    }

    return companyById
  }, [])

  const normalizeRequests = useCallback(
    async (rawRows: RawSourceRow[]): Promise<NormalizedRequestRow[]> => {
      const { profileById, profileByAuthId } = await loadProfiles(rawRows)
      const companyById = await loadCompanyNames(rawRows)

      const normalized = rawRows.map((entry) => {
        const { row, index, source } = entry
        const idColumn = resolveExistingKey(row, ['id', 'request_id', 'request_uuid']) ?? 'id'
        const rawIdValue = pickUnknown(row, ['id', 'request_id', 'request_uuid'])
        const rawId =
          typeof rawIdValue === 'string' || typeof rawIdValue === 'number'
            ? rawIdValue
            : `request-${index + 1}`
        const id = String(rawId)

        const codeRaw = pickString(row, ['code', 'request_code', 'public_id', 'tracking_code'])
        const code = codeRaw ? (codeRaw.startsWith('#') ? codeRaw : `#${codeRaw}`) : toSyntheticCode(id, index)

        const seats = Math.max(1, Math.trunc(pickNumber(row, ['quantity', 'requested_quantity', 'licenses']) ?? 1))
        const statusRaw = pickString(row, ['status', 'Status', 'request_status', 'state'])
        const stageRaw = pickString(row, ['stage', 'current_stage', 'progress_stage'])
        const requesterId =
          pickString(row, [
            'requester_id',
            'requesterId',
            'user_id',
            'userId',
            'portal_user_id',
            'auth_user_id',
          ]) ?? ''
        const profile =
          (requesterId && profileById.get(requesterId)) ||
          (requesterId && profileByAuthId.get(requesterId)) ||
          null

        const companyId = pickString(row, ['company_id', 'company_mapping_id']) ?? ''
        const companyFromRow =
          pickString(row, [
            'company_name_reseller',
            'company_name_hub',
            'company_name',
            'customer_company',
            'company',
          ]) ?? null
        const company = companyFromRow ?? companyById.get(companyId) ?? 'Unknown company'
        const customerName =
          pickString(row, ['customer_name', 'requester_name', 'user_name', 'name']) ??
          profile?.name ??
          company
        const customerEmail =
          pickString(row, ['customer_email', 'requester_email', 'user_email', 'email']) ??
          profile?.email ??
          'no-email'

        const plan =
          pickString(row, [
            'sku_display_name',
            'license_name',
            'entitlement_name',
            'current_offer_name',
            'offer_name',
            'plan',
          ]) ?? 'Unnamed license'
        const totalPrice =
          pickNumber(row, ['total_price', 'totalPrice', 'estimated_total']) ??
          (() => {
            const perSeat = pickNumber(row, ['price_per_seat', 'unit_price', 'monthly_price'])
            return perSeat !== null ? perSeat * seats : null
          })()
        const submittedAt =
          toIsoDate(
            pickUnknown(row, ['created_at', 'submitted_at', 'requested_at', 'createdAt', 'updated_at']),
          ) ?? new Date().toISOString()

        return {
          id,
          idColumn,
          rawId,
          source,
          code,
          seats,
          customerName,
          customerEmail,
          company,
          plan,
          monthlyPrice: totalPrice,
          status: toRequestStatus(statusRaw, stageRaw),
          submittedAt,
          licenseType: toLicenseType(plan),
          avatarColor: toAvatarColor(customerName),
          statusColumn: resolveExistingKey(row, ['status', 'Status', 'request_status', 'state']),
          stageColumn: resolveExistingKey(row, ['stage', 'current_stage', 'progress_stage']),
          updatedAtColumn: resolveExistingKey(row, ['updated_at', 'last_updated_at']),
        }
      })

      normalized.sort((first, second) => {
        const firstTime = new Date(first.submittedAt).getTime()
        const secondTime = new Date(second.submittedAt).getTime()
        return secondTime - firstTime
      })

      return normalized
    },
    [loadCompanyNames, loadProfiles],
  )

  const loadRequests = useCallback(
    async (options?: { silent?: boolean; notifyRefresh?: boolean }) => {
      if (options?.silent) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      try {
        const rawRows = await resolveSourceRows()
        const normalized = await normalizeRequests(rawRows)
        setRequests(normalized)

        if (options?.notifyRefresh) {
          showToast(t('admin.licenseRequests.actions.refreshSuccess'), 'success')
        }
      } catch (error) {
        console.error('Failed to load partner requests', error)
        const message =
          error instanceof Error && error.message.trim().length > 0
            ? error.message
            : t('admin.table.error')
        showToast(message, 'error')
        setRequests([])
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [normalizeRequests, resolveSourceRows, showToast, t],
  )

  useEffect(() => {
    void loadRequests()
  }, [loadRequests])

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

  const filteredRequests = useMemo(() => {
    const start = parseDate(filters.startDate)
    const end = parseDate(filters.endDate)
    const normalizedSearch = filters.customer.trim().toLowerCase()

    return requests.filter((request) => {
      if (filters.status !== 'all' && request.status !== filters.status) {
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
  }, [filters, requests])
  const pendingReviewsCount = useMemo(
    () => requests.filter((request) => request.status === 'pending').length,
    [requests],
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

  const handleAction = (request: NormalizedRequestRow, action: 'approve' | 'reject') => async () => {
    if (!supabase) {
      showToast(t('missingSupabaseConfig'), 'error')
      return
    }

    setActionLoadingById((current) => ({ ...current, [request.id]: true }))
    showToast(t('loading.generic'), 'loading')

    try {
      const appClient = supabase.schema('app')
      const { error } = await appClient.rpc('fn_requests_set_status', {
        p_request_id: String(request.rawId),
        p_status: action === 'approve' ? 'Approved' : 'Rejected',
        p_stage: action === 'approve' ? 'completed' : 'cancelled',
      })

      if (error) {
        throw error
      }

      const nextStatus: RequestStatus = action === 'approve' ? 'approved' : 'rejected'
      setRequests((current) =>
        current.map((entry) => (entry.id === request.id ? { ...entry, status: nextStatus } : entry)),
      )

      const feedbackKey =
        action === 'approve'
          ? 'admin.licenseRequests.actions.approved'
          : 'admin.licenseRequests.actions.rejected'
      showToast(t(feedbackKey, { code: request.code }), 'success')
    } catch (error) {
      console.error(`Failed to ${action} request`, error)
      const message =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : t('admin.table.error')
      showToast(message, 'error')
    } finally {
      setActionLoadingById((current) => {
        const next = { ...current }
        delete next[request.id]
        return next
      })
    }
  }

  const handleExport = () => {
    if (filteredRequests.length === 0) {
      showToast(t('admin.licenseRequests.table.empty'), 'error')
      return
    }

    const headers = [
      'request_code',
      'company',
      'requester_name',
      'requester_email',
      'license_plan',
      'seats',
      'status',
      'submitted_at',
    ]

    const lines = filteredRequests.map((request) =>
      [
        request.code,
        request.company,
        request.customerName,
        request.customerEmail,
        request.plan,
        String(request.seats),
        request.status,
        request.submittedAt,
      ]
        .map((cell) => toCsvCell(cell))
        .join(','),
    )

    const csvContent = [headers.join(','), ...lines].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
    anchor.href = url
    anchor.download = `partner-license-requests-${timestamp}.csv`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)

    showToast(t('admin.licenseRequests.actions.exported'), 'success')
  }

  const handleRefresh = () => {
    void loadRequests({ silent: true, notifyRefresh: true })
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

  const statusLabel = (status: RequestStatus) => {
    if (status === 'pending') {
      return t('admin.licenseRequests.statuses.pending')
    }
    return t(`admin.licenseRequests.statuses.${status}`)
  }

  return (
    <div className="admin-root partner-requests-root">
      <PortalHeader
        navItems={headerNavItems}
        navAriaLabel={t('admin.nav.label')}
        notificationsCount={pendingReviewsCount}
        notificationsLabel={t('admin.nav.notifications')}
        displayName={displayName}
        roleLabel={roleState === 'admin' ? t('admin.userRole') : t('admin.table.roles.supportAgent')}
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
            <button type="button" className="partner-requests-pill" onClick={handleRefresh} disabled={refreshing}>
              <i className={`bi ${refreshing ? 'bi-arrow-repeat spin' : 'bi-clock-history'}`} aria-hidden="true"></i>
              {t('admin.licenseRequests.pendingReviews', { count: pendingReviewsCount })}
            </button>
            <button type="button" className="partner-requests-primary" onClick={handleExport}>
              <i className="bi bi-download" aria-hidden="true"></i>
              {t('admin.licenseRequests.export')}
            </button>
          </div>
        </section>

        {toast ? (
          <div className={`partner-requests-feedback partner-requests-feedback--${toast.variant}`} role="status">
            <i
              className={`bi ${
                toast.variant === 'error'
                  ? 'bi-exclamation-triangle-fill'
                  : toast.variant === 'loading'
                  ? 'bi-arrow-repeat spin'
                  : 'bi-check-circle-fill'
              }`}
              aria-hidden="true"
            ></i>
            <span>{toast.message}</span>
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
                <option value="pending">{statusLabel('pending')}</option>
                <option value="approved">{statusLabel('approved')}</option>
                <option value="rejected">{statusLabel('rejected')}</option>
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
            <button type="button" className="partner-requests-icon-button" onClick={handleRefresh} disabled={refreshing}>
              <i className={`bi ${refreshing ? 'bi-arrow-repeat spin' : 'bi-arrow-repeat'}`} aria-hidden="true"></i>
              <span>{t('admin.licenseRequests.table.refresh')}</span>
            </button>
          </div>
          <div className="partner-requests-table" role="table">
            <div className="partner-requests-table__head" role="row">
              <span role="columnheader" className="request-header">{t('admin.licenseRequests.table.headers.request')}</span>
              <span role="columnheader" className="customer-header">{t('admin.licenseRequests.table.headers.customer')}</span>
              <span role="columnheader" className="details-header">{t('admin.licenseRequests.table.headers.details')}</span>
              <span role="columnheader" className="requester-header">{t('admin.licenseRequests.table.headers.requester')}</span>
              <span role="columnheader" className="status-header">{t('admin.licenseRequests.table.headers.status')}</span>
              <span role="columnheader" className="submitted-header">{t('admin.licenseRequests.table.headers.submitted')}</span>
              <span role="columnheader" className="is-actions">{t('admin.licenseRequests.table.headers.actions')}</span>
            </div>
            {loading ? (
              <div className="partner-requests-table__row is-loading" role="row">
                <span role="cell" className="partner-requests-table__message">
                  {t('admin.table.loading')}
                </span>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="partner-requests-table__row is-empty" role="row">
                <span role="cell" className="partner-requests-table__message">
                  {t('admin.licenseRequests.table.empty')}
                </span>
              </div>
            ) : (
              filteredRequests.map((request) => {
                const submitted = new Date(request.submittedAt)
                const isBusy = Boolean(actionLoadingById[request.id])
                const isResolved = request.status === 'approved' || request.status === 'rejected'
                const formattedPrice =
                  request.monthlyPrice !== null
                    ? t('admin.licenseRequests.table.pricePerMonth', {
                        value: numberFormatter.format(request.monthlyPrice),
                      })
                    : '-'

                return (
                  <div key={request.id} className="partner-requests-table__row" role="row">
                    <div role="cell" className="partner-requests-request-cell">
                      <strong>{request.code}</strong>
                      <span>{t('admin.licenseRequests.table.seatsLabel', { count: request.seats })}</span>
                    </div>
                    <div role="cell" className="partner-requests-company-cell">
                      <div>
                        <strong>{request.company}</strong>
                      </div>
                    </div>
                    <div role="cell" className="partner-requests-license">
                      <strong>{request.plan}</strong>
                      <span>{formattedPrice}</span>
                    </div>
                    <div role="cell" className="partner-requests-requester-cell">
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
                    <div role="cell" className="partner-requests-status-cell">
                      <span className={`status-pill ${statusClassName[request.status]}`}>
                        {statusLabel(request.status)}
                      </span>
                    </div>
                    <div role="cell" className="partner-requests-date">
                      <strong>{dateFormatter.format(submitted)}</strong>
                      <span>{timeFormatter.format(submitted)}</span>
                    </div>
                    <div role="cell" className="is-actions">
                      <div className="partner-requests-actions">
                        <button
                          type="button"
                          className="partner-requests-approve"
                          onClick={() => {
                            void handleAction(request, 'approve')()
                          }}
                          disabled={isBusy || isResolved}
                        >
                          <i className="bi bi-check-lg" aria-hidden="true"></i>
                          {t('admin.licenseRequests.table.approve')}
                        </button>
                        <button
                          type="button"
                          className="partner-requests-reject"
                          onClick={() => {
                            void handleAction(request, 'reject')()
                          }}
                          disabled={isBusy || isResolved}
                        >
                          <i className="bi bi-x-lg" aria-hidden="true"></i>
                          {t('admin.licenseRequests.table.reject')}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

export default PartnerLicenseRequestsPage
