import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { User } from '@supabase/supabase-js'
import PortalHeader from '../components/PortalHeader'
import { buildHeaderNavItems, type HeaderRole } from '../lib/headerNavigation'
import { supabase } from '../lib/supabaseClient'
import { checkSupportAnalyticsAccess } from '../lib/supportAnalytics'
import '../styles/license-request.css'
import '../styles/license-request-status.css'
import type {
  LicenseRequestFollowUpState,
  LicenseRequestFormSnapshot,
  LicenseRequestRecord,
} from '../types/license-request'

type LicenseRequestStatusPageProps = {
  user: User
  roleState: Extract<HeaderRole, 'customerAdmin' | 'customerUser'>
  onSignOut: () => Promise<void>
}

type StageKey = 'sent' | 'evaluation' | 'buying' | 'done'
type StepStatus = 'complete' | 'active' | 'pending'

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

const STAGE_ORDER: StageKey[] = ['sent', 'evaluation', 'buying', 'done']

const normalizeRoleLabel = (value: unknown): string | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const label = ROLE_ID_LABEL_MAPPING[Math.trunc(value)]
    return label ?? null
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

  const numeric = Number(trimmed)
  if (Number.isFinite(numeric)) {
    const label = ROLE_ID_LABEL_MAPPING[Math.trunc(numeric)]
    if (label) {
      return label
    }
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

  if (typeof user.email === 'string' && user.email.trim().length > 0) {
    return user.email.trim()
  }

  return 'Customer User'
}

const parseDate = (value: string | null): Date | null => {
  if (!value) {
    return null
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const formatCurrencyValue = (value: number | null, currencyCode: string | null, locale?: string): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '—'
  }

  if (currencyCode) {
    try {
      return new Intl.NumberFormat(locale, { style: 'currency', currency: currencyCode }).format(value)
    } catch {
      const formatted = new Intl.NumberFormat(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value)
      return `${currencyCode} ${formatted}`
    }
  }

  return new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
}


const pickString = (record: Record<string, unknown>, keys: string[]): string | null => {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed.length > 0) {
        return trimmed
      }
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value.toString()
    }
  }
  return null
}

const pickNumber = (record: Record<string, unknown>, keys: string[]): number | null => {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value
    }
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed.length > 0) {
        const parsed = Number(trimmed)
        if (!Number.isNaN(parsed)) {
          return parsed
        }
      }
    }
  }
  return null
}

const pickDateString = (record: Record<string, unknown>, keys: string[]): string | null => {
  for (const key of keys) {
    const value = record[key]
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value.toISOString()
    }
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed.length > 0) {
        const parsed = new Date(trimmed)
        if (!Number.isNaN(parsed.getTime())) {
          return parsed.toISOString()
        }
        return trimmed
      }
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      const parsed = new Date(value)
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString()
      }
    }
  }
  return null
}

const normalizeStoredRequest = (record: Record<string, unknown>): LicenseRequestRecord => {
  return {
    id: pickString(record, ['request_id', 'id', 'request_uuid']),
    code: pickString(record, ['request_code', 'code', 'public_id', 'tracking_code']),
    status: pickString(record, ['status', 'Status', 'request_status']) ?? 'submitted',
    stage: pickString(record, ['stage', 'current_stage', 'progress_stage']),
    priority: pickString(record, ['priority', 'request_priority']),
    department: pickString(record, ['department', 'department_name']),
    estimatedCompletionDate: pickDateString(record, [
      'estimated_completion_date',
      'estimated_completion',
      'estimated_completion_at',
    ]),
    createdAt: pickDateString(record, ['created_at', 'createdAt', 'submitted_at']),
    evaluationStartedAt: pickDateString(record, ['evaluation_started_at', 'evaluationStartedAt']),
    quantity: pickNumber(record, ['quantity', 'requested_quantity', 'p_quantity']),
    totalPrice: pickNumber(record, ['total_price', 'totalPrice', 'estimated_total']),
    currency: pickString(record, ['currency', 'currency_code']),
    justification: pickString(record, ['justification', 'business_justification']),
  }
}

const buildFormSnapshot = (
  record: Record<string, unknown>,
  locale: string | undefined,
): LicenseRequestFormSnapshot => {
  const licenseName =
    pickString(record, ['sku_display_name', 'skuDisplayName', 'license_name', 'licenseName']) ??
    pickString(record, ['entitlement_name', 'entitlementName']) ??
    ''
  const offerName = pickString(record, ['current_offer_name', 'currentOfferName', 'offer_name', 'offerName']) ?? ''
  const companyMappingId = pickString(record, ['company_id', 'company_mapping_id', 'companyId'])
  const companyName = pickString(record, ['company_name', 'companyName', 'customer_name', 'customerName']) ?? ''
  const entitlementName = pickString(record, ['entitlement_name', 'entitlementName'])
  const quantity = pickNumber(record, ['quantity', 'requested_quantity', 'p_quantity']) ?? 0
  const totalPrice = pickNumber(record, ['total_price', 'totalPrice', 'estimated_total'])
  const currencyCode = pickString(record, ['currency', 'currency_code', 'currencyCode'])
  const formattedPricePerSeat =
    quantity > 0 && totalPrice !== null
      ? formatCurrencyValue(totalPrice / quantity, currencyCode, locale)
      : null

  return {
    licenseName,
    offerName,
    companyName,
    companyMappingId,
    entitlementName,
    quantity,
    totalPrice,
    currencyCode,
    formattedPricePerSeat,
    priceCondition: null,
    department: pickString(record, ['department', 'department_name']),
    justification: pickString(record, ['justification', 'business_justification']),
  }
}
const determineStage = (record: LicenseRequestRecord | null): StageKey => {
  const raw = (record?.stage ?? record?.status ?? '').toLowerCase()

  if (raw.includes('done') || raw.includes('complete')) {
    return 'done'
  }
  if (raw.includes('buy')) {
    return 'buying'
  }
  if (raw.includes('eval') || raw.includes('review') || raw.includes('progress')) {
    return 'evaluation'
  }
  return 'sent'
}

const computeTimelineDate = (date: Date | null, fallbackOffsetDays: number, from: Date | null): Date | null => {
  if (date) {
    return date
  }

  if (!from) {
    return null
  }

  const copy = new Date(from)
  copy.setDate(copy.getDate() + fallbackOffsetDays)
  return copy
}

const formatDateLabel = (date: Date | null, locale?: string, options?: Intl.DateTimeFormatOptions): string | null => {
  if (!date) {
    return null
  }
  try {
    return new Intl.DateTimeFormat(locale, options).format(date)
  } catch {
    return date.toLocaleString()
  }
}

function LicenseRequestStatusPage({ user, roleState, onSignOut }: LicenseRequestStatusPageProps) {
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage ?? i18n.language ?? undefined
  const navigate = useNavigate()
  const location = useLocation()
  const followUpState = (location.state as LicenseRequestFollowUpState | undefined) ?? null
  const requestIdParam = useMemo(() => {
    const value = new URLSearchParams(location.search).get('requestId')
    return value ? value.trim() : ''
  }, [location.search])
  const [form, setForm] = useState<LicenseRequestFormSnapshot | null>(() => followUpState?.form ?? null)
  const [request, setRequest] = useState<LicenseRequestRecord | null>(() => followUpState?.request ?? null)
  const [requestLoading, setRequestLoading] = useState(false)
  const [hasSupportAnalytics, setHasSupportAnalytics] = useState(false)

  useEffect(() => {
    document.body.classList.add('customer-body', 'license-request-body')
    return () => {
      document.body.classList.remove('customer-body', 'license-request-body')
    }
  }, [])

  const displayName = useMemo(() => getUserDisplayName(user), [user])
  const roleLabel = useMemo(() => deriveRoleLabel(user), [user])

  const headerNavItems = useMemo(
    () =>
      buildHeaderNavItems({
        t,
        role: roleState,
        activeSection: 'licenseRequest',
        showSupportAnalytics: roleState === 'customerAdmin' && hasSupportAnalytics,
      }),
    [hasSupportAnalytics, roleState, t],
  )

  useEffect(() => {
    let isActive = true

    if (roleState !== 'customerAdmin') {
      setHasSupportAnalytics(false)
      return () => {
        isActive = false
      }
    }

    void (async () => {
      const hasAccess = await checkSupportAnalyticsAccess(user)
      if (isActive) {
        setHasSupportAnalytics(hasAccess)
      }
    })()

    return () => {
      isActive = false
    }
  }, [roleState, user])

  useEffect(() => {
    if (form && request) {
      return
    }

    if (!requestIdParam || !supabase) {
      return
    }
    const supabaseClient = supabase

    let isActive = true

    const loadRequest = async () => {
      setRequestLoading(true)
      try {
        let data: Record<string, unknown> | null = null

        try {
          const appClient = supabaseClient.schema('app')
          const { data: primaryData, error } = await appClient.rpc('fn_requests_get', {
            p_request_id: requestIdParam,
          })

          if (error) {
            throw error
          }

          data =
            primaryData && typeof primaryData === 'object' && !Array.isArray(primaryData)
              ? (primaryData as Record<string, unknown>)
              : null
        } catch (primaryError) {
          const { data: fallbackData, error: fallbackError } = await supabaseClient
            .schema('app')
            .from('license_requests')
            .select('*')
            .eq('id', requestIdParam)
            .maybeSingle()

          if (fallbackError) {
            throw primaryError
          }

          data = fallbackData as Record<string, unknown> | null
        }

        if (!data || !isActive) {
          return
        }

        setRequest(normalizeStoredRequest(data))
        setForm(buildFormSnapshot(data, locale))
      } catch (loadError) {
        console.error('Failed to load license request', loadError)
      } finally {
        if (isActive) {
          setRequestLoading(false)
        }
      }
    }

    void loadRequest()

    return () => {
      isActive = false
    }
  }, [form, locale, request, requestIdParam])

  if (!form || !request) {
    return (
      <div className="customer-root license-request-status-root">
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
        <main className="license-request-status-content">
          <section className="license-request-card license-request-status-empty">
            {requestLoading ? (
              <h1>{t('loading.generic')}</h1>
            ) : (
              <>
                <h1>{t('customer.licenseRequestStatus.errors.missingContext')}</h1>
                <button
                  type="button"
                  className="license-request-button license-request-button--primary"
                  onClick={() => navigate('/license-request')}
                >
                  {t('customer.licenseRequest.actions.submit')}
                </button>
              </>
            )}
          </section>
        </main>
      </div>
    )
  }

  const stage = determineStage(request)
  const stageIndex = STAGE_ORDER.indexOf(stage)
  const resolvedStageIndex = stageIndex >= 0 ? stageIndex : 0

  const createdAt = parseDate(request?.createdAt ?? null) ?? new Date()
  const evaluationDate = parseDate(request?.evaluationStartedAt ?? null)
  const buyingDate =
    resolvedStageIndex >= 2 ? computeTimelineDate(null, 1, evaluationDate ?? createdAt) : null
  const completedDate =
    resolvedStageIndex >= 3
      ? parseDate(request?.estimatedCompletionDate ?? null) ??
        computeTimelineDate(null, 2, evaluationDate ?? createdAt)
      : parseDate(request?.estimatedCompletionDate ?? null)

  const requestCode = request?.code ?? request?.id ?? null
  const priorityLabel =
    request?.priority && request.priority.trim().length > 0
      ? request.priority
      : t('customer.licenseRequestStatus.details.defaultPriority')
  const quantityLabel =
    form.quantity === 1
      ? t('customer.licenseRequestStatus.details.singleQuantityValue', { count: form.quantity })
      : t('customer.licenseRequestStatus.details.quantityValue', { count: form.quantity })
  const estimatedCostLabel = formatCurrencyValue(form.totalPrice, form.currencyCode, locale)

  const dateLabel = (date: Date | null) => formatDateLabel(date, locale, { dateStyle: 'medium' })
  const timeLabel = (date: Date | null) => formatDateLabel(date, locale, { timeStyle: 'short' })

  const timelineItems = [
    {
      key: 'submitted',
      title: t('customer.licenseRequestStatus.timeline.events.submitted.title'),
      description: t('customer.licenseRequestStatus.timeline.events.submitted.description', {
        code: requestCode ?? t('customer.licenseRequestStatus.timeline.pendingCode'),
      }),
      status: 'complete' as StepStatus,
      date: createdAt,
    },
    {
      key: 'evaluation',
      title: t('customer.licenseRequestStatus.timeline.events.evaluation.title'),
      description: t('customer.licenseRequestStatus.timeline.events.evaluation.description'),
      status: resolvedStageIndex > 1 ? 'complete' : resolvedStageIndex === 1 ? 'active' : 'pending',
      date: computeTimelineDate(evaluationDate, 0, createdAt),
    },
    {
      key: 'buying',
      title: t('customer.licenseRequestStatus.timeline.events.buying.title'),
      description: t('customer.licenseRequestStatus.timeline.events.buying.description'),
      status: resolvedStageIndex > 2 ? 'complete' : resolvedStageIndex === 2 ? 'active' : 'pending',
      date: buyingDate,
    },
    {
      key: 'completed',
      title: t('customer.licenseRequestStatus.timeline.events.completed.title'),
      description: t('customer.licenseRequestStatus.timeline.events.completed.description'),
      status: resolvedStageIndex >= 3 ? 'complete' : 'pending',
      date: completedDate,
    },
  ].map((item) => ({
    ...item,
    dateLabel: dateLabel(item.date),
    timeLabel: timeLabel(item.date),
  }))

  return (
    <div className="customer-root license-request-status-root">
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
      <main className="license-request-status-content">
        <div className="license-request-status-main">
          <section className="license-request-card license-request-status-details-card">
            <h2>{t('customer.licenseRequestStatus.details.title')}</h2>
            <ul>
              <li>
                <span>{t('customer.licenseRequestStatus.details.requestId')}</span>
                <strong>{requestCode ?? t('customer.licenseRequestStatus.details.unavailable')}</strong>
              </li>
              <li>
                <span>{t('customer.licenseRequestStatus.details.licenseType')}</span>
                <strong>
                  {form.licenseName || t('customer.licenseRequestStatus.details.unavailable')}
                </strong>
              </li>
              <li>
                <span>{t('customer.licenseRequestStatus.details.company')}</span>
                <strong>{form.companyName || t('customer.licenseRequestStatus.details.unavailable')}</strong>
              </li>
              <li>
                <span>{t('customer.licenseRequestStatus.details.offer')}</span>
                <strong>{form.offerName || t('customer.licenseRequestStatus.details.unavailable')}</strong>
              </li>
              <li>
                <span>{t('customer.licenseRequestStatus.details.quantity')}</span>
                <strong>{quantityLabel}</strong>
              </li>
              <li>
                <span>{t('customer.licenseRequestStatus.details.priority')}</span>
                <strong>{priorityLabel}</strong>
              </li>
              <li>
                <span>{t('customer.licenseRequestStatus.details.department')}</span>
                <strong>{form.department ?? t('customer.licenseRequestStatus.details.unavailable')}</strong>
              </li>
              <li>
                <span>{t('customer.licenseRequestStatus.details.estimatedCost')}</span>
                <strong>{estimatedCostLabel}</strong>
              </li>
              <li>
                <span>{t('customer.licenseRequestStatus.details.pricePerSeat')}</span>
                <strong>{form.formattedPricePerSeat ?? t('customer.licenseRequestStatus.details.unavailable')}</strong>
              </li>
            </ul>
          </section>
        </div>
        <aside className="license-request-status-sidebar">
          <section className="license-request-card license-request-timeline-card">
            <div className="license-request-timeline-card__header">
              <h2>{t('customer.licenseRequestStatus.timeline.title')}</h2>
            </div>
            <div className="license-request-timeline">
              {timelineItems.map((item) => (
                <article
                  key={item.key}
                  className={`license-request-timeline__item license-request-timeline__item--${item.status}`}
                >
                  <div className="license-request-timeline__marker" aria-hidden="true"></div>
                  <div className="license-request-timeline__body">
                    <header className="license-request-timeline__header">
                      <div>
                        <h3>{item.title}</h3>
                        <p>{item.description}</p>
                      </div>
                      <span
                        className={`license-request-timeline__status license-request-timeline__status--${item.status}`}
                      >
                        {t(`customer.licenseRequestStatus.timeline.statusLabel.${item.status}`)}
                      </span>
                    </header>
                    <footer className="license-request-timeline__footer">
                      {item.dateLabel ? (
                        <span>
                          {item.dateLabel}
                          {item.timeLabel ? ` • ${item.timeLabel}` : ''}
                        </span>
                      ) : (
                        <span>{t('customer.licenseRequestStatus.timeline.pendingDate')}</span>
                      )}
                    </footer>
                  </div>
                </article>
              ))}
            </div>
          </section>
          <section className="license-request-card license-request-contact-card">
            <h3>{t('customer.licenseRequest.contact.title')}</h3>
            <ul>
              <li>
                <i className="bi bi-envelope-fill" aria-hidden="true"></i>
                <a href="mailto:support@tigabytes.com">support@tigabytes.com</a>
              </li>
            </ul>
          </section>
        </aside>
      </main>
    </div>
  )
}

export default LicenseRequestStatusPage
