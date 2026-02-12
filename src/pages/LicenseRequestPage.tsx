import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { User } from '@supabase/supabase-js'
import PortalHeader from '../components/PortalHeader'
import { buildHeaderNavItems, type HeaderRole } from '../lib/headerNavigation'
import { supabase } from '../lib/supabaseClient'
import type { LicenseRequestFollowUpState, LicenseRequestRecord } from '../types/license-request'
import '../styles/license-request.css'

type LicenseRequestPageProps = {
  user: User
  roleState: Extract<HeaderRole, 'customerAdmin' | 'customerUser'>
  onSignOut: () => Promise<void>
}

type LicenseRequestState = {
  licenseId?: string
  companyMappingId?: string
  licenseName?: string
  entitlementName?: string
  companyName?: string
  offer?: string
  priceCondition?: string | null
  currencyCode?: string | null
  pricePerSeatValue?: number | null
  summary?: CustomerSummarySnapshot
}

type CustomerSummarySnapshot = {
  totalLicenses?: number | null
  assignedLicenses?: number | null
  availableLicenses?: number | null
  utilizationRate?: number | null
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

const coerceBigintParam = (value: string): number | string => {
  const trimmed = value.trim()
  if (trimmed.length === 0) {
    return 0
  }

  const numeric = Number(trimmed)
  if (Number.isSafeInteger(numeric)) {
    return numeric
  }

  return trimmed
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

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

const pickDateIsoString = (record: Record<string, unknown>, keys: string[]): string | null => {
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

const extractFirstRecord = (value: unknown): Record<string, unknown> | null => {
  if (Array.isArray(value)) {
    for (const entry of value) {
      if (isRecord(entry)) {
        return entry
      }
    }
    return null
  }

  if (isRecord(value)) {
    return value
  }

  return null
}

const normalizeRequestRecord = (value: unknown): LicenseRequestRecord | null => {
  const record = extractFirstRecord(value)
  if (!record) {
    return null
  }

  const id = pickString(record, ['request_id', 'id', 'request_uuid'])
  const code = pickString(record, ['request_code', 'code', 'public_id', 'tracking_code'])
  const status = pickString(record, ['status', 'Status', 'request_status'])
  const stage = pickString(record, ['stage', 'current_stage', 'progress_stage'])
  const priority = pickString(record, ['priority', 'request_priority'])
  const department = pickString(record, ['department', 'department_name'])
  const estimatedCompletionDate = pickDateIsoString(record, [
    'estimated_completion',
    'estimated_completion_date',
    'estimated_completion_at',
  ])
  const createdAt = pickDateIsoString(record, ['created_at', 'createdAt', 'submitted_at'])
  const evaluationStartedAt = pickDateIsoString(record, ['evaluation_started_at', 'evaluationStartedAt'])
  const quantity = pickNumber(record, ['quantity', 'requested_quantity', 'p_quantity'])
  const totalPrice = pickNumber(record, ['total_price', 'totalPrice', 'estimated_total'])
  const currency = pickString(record, ['currency', 'currency_code'])
  const justification = pickString(record, ['business_justification', 'justification'])

  return {
    id: id ?? null,
    code: code ?? null,
    status: status ?? null,
    stage: stage ?? null,
    priority: priority ?? null,
    department: department ?? null,
    estimatedCompletionDate: estimatedCompletionDate ?? null,
    createdAt: createdAt ?? null,
    evaluationStartedAt: evaluationStartedAt ?? null,
    quantity: quantity ?? null,
    totalPrice: totalPrice ?? null,
    currency: currency ?? null,
    justification: justification ?? null,
  }
}

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

const formatCurrency = (value: number, currencyCode: string | null | undefined, locale?: string): string => {
  if (!Number.isFinite(value)) {
    return String(value)
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

const parseNumberParam = (value: string | null): number | null => {
  if (!value) {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * Extracts the first currency-like number from a free-form string.
 * Handles strings such as "US$ 8,00 per seat" or "$1,234.56 / assento".
 */
const extractPriceFromText = (value: string | null): number | null => {
  if (!value) {
    return null
  }

  const match = value.match(/-?\d[\d.,]*/)
  if (!match) {
    return null
  }

  const sanitized = match[0].replace(/[^\d.,-]/g, '')
  if (!sanitized) {
    return null
  }

  const negative = sanitized.trim().startsWith('-')
  const unsigned = sanitized.replace(/-/g, '')
  if (!unsigned) {
    return null
  }

  const lastComma = unsigned.lastIndexOf(',')
  const lastDot = unsigned.lastIndexOf('.')
  let decimalChar: ',' | '.' | null = null
  let decimalIndex = -1

  if (lastComma !== -1 && lastDot !== -1) {
    decimalChar = lastComma > lastDot ? ',' : '.'
    decimalIndex = decimalChar === ',' ? lastComma : lastDot
  } else if (lastComma !== -1) {
    decimalChar = ','
    decimalIndex = lastComma
  } else if (lastDot !== -1) {
    decimalChar = '.'
    decimalIndex = lastDot
  }

  let normalized = unsigned
  if (decimalChar !== null && decimalIndex !== -1) {
    const integerPart = unsigned.slice(0, decimalIndex).replace(/[.,]/g, '')
    const fractionPart = unsigned.slice(decimalIndex + 1).replace(/[.,]/g, '')
    normalized = `${integerPart}.${fractionPart}`
  } else {
    normalized = unsigned.replace(/[.,]/g, '')
  }

  if (!normalized || normalized === '.') {
    return null
  }

  const parsed = Number(normalized)
  if (!Number.isFinite(parsed)) {
    return null
  }

  return negative ? -parsed : parsed
}

const formatInteger = (value: number | null | undefined, locale?: string): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '—'
  }
  return new Intl.NumberFormat(locale).format(Math.trunc(value))
}

const formatPercentValue = (value: number | null | undefined, locale?: string): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '—'
  }
  const clamped = Math.min(Math.max(value, 0), 200)
  return `${new Intl.NumberFormat(locale, {
    maximumFractionDigits: clamped >= 100 ? 0 : 1,
  }).format(clamped)}%`
}

function LicenseRequestPage({ user, roleState, onSignOut }: LicenseRequestPageProps) {
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage ?? i18n.language ?? undefined
  const navigate = useNavigate()
  const location = useLocation()
  const locationState = (location.state as LicenseRequestState | undefined) ?? {}
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search])

  const licenseName = (locationState.licenseName ?? searchParams.get('licenseName') ?? '').trim()
  const entitlementName = (locationState.entitlementName ?? searchParams.get('entitlementName') ?? '').trim()
  const companyMappingId = (locationState.companyMappingId ?? searchParams.get('companyMappingId') ?? '').trim()
  const companyName = (locationState.companyName ?? searchParams.get('companyName') ?? '').trim()
  const offerName = (locationState.offer ?? searchParams.get('offer') ?? '').trim()
  const priceCondition = (locationState.priceCondition ?? searchParams.get('priceCondition') ?? '').trim()
  const currencyCodeRaw = (locationState.currencyCode ?? searchParams.get('currencyCode') ?? '').trim()
  const currencyCode = currencyCodeRaw.length > 0 ? currencyCodeRaw.toUpperCase() : null
  const pricePerSeatValue =
    locationState.pricePerSeatValue ??
    parseNumberParam(searchParams.get('pricePerSeatValue')) ??
    extractPriceFromText(priceCondition)

  const formattedPricePerSeat =
    pricePerSeatValue !== null ? formatCurrency(pricePerSeatValue, currencyCode, locale) : null

  const summarySnapshot = useMemo(() => {
    const stateSummary = locationState.summary ?? {}
    const resolve = (value: number | null | undefined, queryKey: string) => {
      if (value !== undefined) {
        return value
      }
      return parseNumberParam(searchParams.get(queryKey))
    }

    return {
      totalLicenses: resolve(stateSummary.totalLicenses, 'totalLicenses'),
      assignedLicenses: resolve(stateSummary.assignedLicenses, 'assignedLicenses'),
      availableLicenses: resolve(stateSummary.availableLicenses, 'availableLicenses'),
      utilizationRate: resolve(stateSummary.utilizationRate, 'utilizationRate'),
    }
  }, [locationState.summary, searchParams])

  const [quantity, setQuantity] = useState('')
  const [department, setDepartment] = useState('')
  const [justification, setJustification] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success'>('idle')
  const [error, setError] = useState<string | null>(null)

  const displayName = useMemo(() => getUserDisplayName(user), [user])
  const roleLabel = useMemo(() => deriveRoleLabel(user), [user])

  useEffect(() => {
    document.body.classList.add('customer-body', 'license-request-body')
    return () => {
      document.body.classList.remove('customer-body', 'license-request-body')
    }
  }, [])

  const handleQuantityChange = (event: ChangeEvent<HTMLInputElement>) => {
    setQuantity(event.target.value)
  }

  const handleJustificationChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setJustification(event.target.value)
  }

  const handleDepartmentChange = (event: ChangeEvent<HTMLInputElement>) => {
    setDepartment(event.target.value)
  }

  const parsedQuantity = Number(quantity)
  const quantityIsValid = Number.isInteger(parsedQuantity) && parsedQuantity > 0
  const estimatedMonthlyTotal =
    quantityIsValid && pricePerSeatValue !== null ? parsedQuantity * pricePerSeatValue : null
  const formattedEstimatedMonthly =
    estimatedMonthlyTotal !== null ? formatCurrency(estimatedMonthlyTotal, currencyCode, locale) : null

  const formattedRequestedSeats = quantityIsValid ? formatInteger(parsedQuantity, locale) : '—'
  const estimatedMonthlyDisplay =
    quantityIsValid && formattedPricePerSeat && formattedEstimatedMonthly
      ? `${formattedRequestedSeats} x ${formattedPricePerSeat} = ${formattedEstimatedMonthly}`
      : formattedEstimatedMonthly || '—'
  const summaryUtilizationPercent =
    summarySnapshot.utilizationRate !== null &&
    summarySnapshot.utilizationRate !== undefined &&
    Number.isFinite(summarySnapshot.utilizationRate)
      ? Math.min(Math.max(summarySnapshot.utilizationRate, 0), 100)
      : null
  const showPriceConditionNote = priceCondition.length > 0 && priceCondition !== formattedPricePerSeat

  const canSubmit = licenseName.length > 0 && quantityIsValid && companyMappingId.length > 0 && entitlementName.length > 0 && !isSubmitting

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!licenseName) {
      setError(t('customer.licenseRequest.errors.licenseRequired'))
      return
    }

    if (!quantityIsValid) {
      setError(t('customer.licenseRequest.errors.quantityInvalid'))
      return
    }

    if (!supabase) {
      setError(t('customer.licenseRequest.errors.supabaseUnavailable'))
      return
    }

    if (companyMappingId.length === 0) {
      setError(t('customer.licenseRequest.errors.companyRequired'))
      return
    }

    if (entitlementName.length === 0) {
      setError(t('customer.licenseRequest.errors.entitlementRequired'))
      return
    }

    setError(null)
    setIsSubmitting(true)
    setSubmitStatus('idle')

    const appClient = supabase.schema('app')
    const trimmedDepartment = department.trim()
    const trimmedJustification = justification.trim()
    const normalizedCurrency = (currencyCode ?? '').trim().toLowerCase()
    const payload = {
      p_company_id: coerceBigintParam(companyMappingId),
      p_entitlement_name: entitlementName,
      p_current_offer_name: offerName || null,
      p_sku_display_name: licenseName,
      p_quantity: parsedQuantity,
      p_total_price: estimatedMonthlyTotal ?? 0,
      p_currency: normalizedCurrency.length > 0 ? normalizedCurrency : null,
    }

    try {
      const { data, error: rpcError } = await appClient.rpc('fn_create_request', payload)

      if (rpcError) {
        throw rpcError
      }

      const requestRecord = normalizeRequestRecord(data)
      const formSnapshot: LicenseRequestFollowUpState['form'] = {
        licenseName,
        offerName,
        companyName,
        companyMappingId: companyMappingId || null,
        entitlementName: entitlementName || null,
        quantity: parsedQuantity,
        totalPrice: estimatedMonthlyTotal ?? null,
        currencyCode,
        formattedPricePerSeat,
        priceCondition: priceCondition || null,
        department: trimmedDepartment.length > 0 ? trimmedDepartment : null,
        justification: trimmedJustification.length > 0 ? trimmedJustification : null,
      }

      const followUpState: LicenseRequestFollowUpState = {
        request: requestRecord,
        form: formSnapshot,
      }

      setSubmitStatus('success')
      const statusParams = requestRecord?.id ? `?requestId=${encodeURIComponent(requestRecord.id)}` : ''
      navigate(`/license-request/status${statusParams}`, {
        state: followUpState,
        replace: false,
      })
    } catch (submitError) {
      console.error('Failed to create license request', submitError)
      const message =
        submitError instanceof Error && submitError.message.length > 0
          ? submitError.message
          : t('customer.licenseRequest.errors.submissionFailed')
      setError(message)
      setSubmitStatus('idle')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    navigate('/home')
  }

  const headerNavItems = useMemo(
    () => buildHeaderNavItems({ t, role: roleState, activeSection: 'licenseRequest' }),
    [roleState, t],
  )

  const showMissingLicenseNotification = licenseName.length === 0

  return (
    <div className="customer-root license-request-root">
      <PortalHeader
        navItems={headerNavItems}
        navAriaLabel={t('customer.nav.label')}
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
        notificationsCount={null}
        notificationsLabel={t('customer.nav.notifications')}
      />
      <main className="license-request-content">
        <section className="license-request-card">
          <div className="license-request-card__header">
            <h1>{t('customer.licenseRequest.header.title')}</h1>
            <p>{t('customer.licenseRequest.header.description')}</p>
          </div>
          <form className="license-request-form" onSubmit={handleSubmit}>
            {submitStatus === 'success' ? (
              <div className="license-request-alert license-request-alert--success" role="status">
                <i className="bi bi-check-circle-fill" aria-hidden="true"></i>
                <span>{t('customer.licenseRequest.alerts.success')}</span>
              </div>
            ) : null}
            {error ? (
              <div className="license-request-alert license-request-alert--error" role="alert">
                <i className="bi bi-exclamation-triangle-fill" aria-hidden="true"></i>
                <span>{error}</span>
              </div>
            ) : null}
            {showMissingLicenseNotification ? (
              <div className="license-request-alert license-request-alert--warning" role="alert">
                <i className="bi bi-info-circle-fill" aria-hidden="true"></i>
                <span>{t('customer.licenseRequest.alerts.missingSelection')}</span>
              </div>
            ) : null}
            <div className="license-request-grid">
              <div className="license-request-field">
                <label htmlFor="license-type">{t('customer.licenseRequest.fields.licenseType.label')}</label>
                <input
                  id="license-type"
                  type="text"
                  value={licenseName}
                  placeholder={t('customer.licenseRequest.fields.licenseType.placeholder')}
                  readOnly
                  aria-readonly="true"
                />
              </div>
              <div className="license-request-field">
                <label htmlFor="license-quantity">{t('customer.licenseRequest.fields.quantity.label')}</label>
                <input
                  id="license-quantity"
                  type="number"
                  min={1}
                  step={1}
                  placeholder={t('customer.licenseRequest.fields.quantity.placeholder')}
                  value={quantity}
                  onChange={handleQuantityChange}
                  required
                  disabled={showMissingLicenseNotification}
                />
              </div>
            </div>
            <div className="license-request-grid">
              <div className="license-request-field license-request-field--wide">
                <label htmlFor="license-department">{t('customer.licenseRequest.fields.department.label')}</label>
                <input
                  id="license-department"
                  type="text"
                  placeholder={t('customer.licenseRequest.fields.department.placeholder')}
                  value={department}
                  onChange={handleDepartmentChange}
                />
              </div>
            </div>
            <div className="license-request-grid">
              <div className="license-request-field license-request-field--wide">
                <label htmlFor="license-justification">{t('customer.licenseRequest.fields.justification.label')}</label>
                <textarea
                  id="license-justification"
                  placeholder={t('customer.licenseRequest.fields.justification.placeholder')}
                  value={justification}
                  onChange={handleJustificationChange}
                  rows={5}
                />
              </div>
            </div>
            <div className="license-request-actions">
              <button
                type="button"
                className="license-request-button license-request-button--ghost"
                onClick={handleCancel}
              >
                {t('customer.licenseRequest.actions.cancel')}
              </button>
              <button
                type="submit"
                className="license-request-button license-request-button--primary"
                disabled={!canSubmit}
              >
                {isSubmitting
                  ? t('customer.licenseRequest.actions.submitting')
                  : t('customer.licenseRequest.actions.submit')}
              </button>
            </div>
          </form>
        </section>
        <aside className="license-request-sidebar">
          <section className="license-request-customer-summary">
            <div className="license-request-customer-summary__header">
              <h2>{t('customer.licenseRequest.summary.title')}</h2>
              <p>{t('customer.licenseRequest.summary.description')}</p>
            </div>
            <div className="license-request-summary-grid">
              <div className="license-request-summary-item">
                <span>{t('customer.licenseRequest.summary.items.total')}</span>
                <strong>{formatInteger(summarySnapshot.totalLicenses, locale)}</strong>
              </div>
              <div className="license-request-summary-item">
                <span>{t('customer.licenseRequest.summary.items.assigned')}</span>
                <strong>{formatInteger(summarySnapshot.assignedLicenses, locale)}</strong>
              </div>
              <div className="license-request-summary-item">
                <span>{t('customer.licenseRequest.summary.items.available')}</span>
                <strong>{formatInteger(summarySnapshot.availableLicenses, locale)}</strong>
              </div>
            </div>
            <div className="license-request-summary-progress">
              <span className="license-request-summary-progress__label">
                {t('customer.licenseRequest.summary.utilization.label')}
              </span>
              <div className="license-request-summary-progress__track">
                <div
                  className="license-request-summary-progress__fill"
                  style={{ width: `${summaryUtilizationPercent ?? 0}%` }}
                ></div>
              </div>
              <span className="license-request-summary-progress__value">
                {formatPercentValue(summarySnapshot.utilizationRate, locale)}
              </span>
            </div>
          </section>
          <section className="license-request-selection-card">
            <h2>{t('customer.licenseRequest.selection.title')}</h2>
            <ul>
              <li>
                <span>{t('customer.licenseRequest.selection.labels.license')}</span>
                <strong>{licenseName || t('customer.licenseRequest.selection.empty.license')}</strong>
              </li>
              {companyName ? (
                <li>
                  <span>{t('customer.licenseRequest.selection.labels.company')}</span>
                  <strong>{companyName}</strong>
                </li>
              ) : null}
              {offerName ? (
                <li>
                  <span>{t('customer.licenseRequest.selection.labels.plan')}</span>
                  <strong>{offerName}</strong>
                </li>
              ) : null}
              <li>
                <span>{t('customer.licenseRequest.selection.labels.pricePerSeat')}</span>
                <strong>{formattedPricePerSeat || '—'}</strong>
              </li>
              {showPriceConditionNote ? (
                <li>
                  <span>{t('customer.licenseRequest.selection.labels.pricingNotes')}</span>
                  <strong>{priceCondition}</strong>
                </li>
              ) : null}
              <li>
                <span>{t('customer.licenseRequest.selection.labels.requestedSeats')}</span>
                <strong>{formattedRequestedSeats}</strong>
              </li>
              <li>
                <span>{t('customer.licenseRequest.selection.labels.estimatedMonthly')}</span>
                <strong>{estimatedMonthlyDisplay}</strong>
              </li>
            </ul>
          </section>
          <section className="license-request-info-card">
            <h3>{t('customer.licenseRequest.info.title')}</h3>
            <p>{t('customer.licenseRequest.info.description')}</p>
          </section>
          <section className="license-request-contact-card">
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

export default LicenseRequestPage
