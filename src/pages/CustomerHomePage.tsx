import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import type { User } from '@supabase/supabase-js'
import PortalHeader from '../components/PortalHeader'
import { buildHeaderNavItems, type HeaderRole } from '../lib/headerNavigation'
import { supabase } from '../lib/supabaseClient'
import '../styles/customer-home.css'

type CustomerHomePageProps = {
  user: User
  roleState: Extract<HeaderRole, 'customerAdmin' | 'customerUser'>
  onSignOut: () => Promise<void>
}

type CustomerMapping = {
  id: string
  companyMappingId: string
  customerName: string
  gwsUid?: string
  gwsEmail?: string
}

type CustomerEntitlement = {
  id: string
  companyMappingId: string
  companyName: string
  entitlementName: string
  productDisplayName: string
  skuDisplayName: string
  offerDisplayName: string
  provisioningState: string
  createTime: Date | null
  commitmentStart: Date | null
  commitmentEnd: Date | null
  acquiredUnits: number
  assignedUnits: number
  maxUnits: number
  utilizationPct: number | null
  renewalPaymentPlan?: string | null
  renewalCyclePeriod?: string | null
  renewalCycleDuration?: number | null
  renewalPaymentPlanRaw?: string | null
  currencyCode?: string | null
  planPaymentPlan?: string | null
  planPaymentType?: string | null
  priceByResources: boolean | null
  priceCondition?: string | null
  effectivePriceValueMonthEst: number | null
}

type OverviewMetrics = {
  totalAssigned: number
  totalAcquired: number
  availableSeats: number
  averageUtilization: number | null
  activeEntitlements: number
  licensesAddedThisMonth: number
}

type EntitlementAlert = {
  id: string
  title: string
  description: string
  severity: 'low' | 'medium' | 'high'
  timestamp: Date | null
  totalLicenses: number | null
}

type LicenseOverviewItem = {
  id: string
  companyMappingId: string
  entitlementName: string
  name: string
  companyName: string
  offer: string
  paymentPlan: string | null
  priceCondition: string | null
  total: number
  assigned: number
  available: number
  utilization: number
  status: string
  currencyCode: string | null
  pricePerSeatValue: number | null
}
type LicenseSummarySnapshot = {
  totalLicenses: number
  assignedLicenses: number
  availableLicenses: number
  utilizationRate: number | null
}

type CustomerLicenseRequest = {
  id: string
  companyMappingId: string
  companyName: string | null
  entitlementName: string | null
  skuDisplayName: string | null
  offerName: string | null
  quantity: number | null
  totalPrice: number | null
  currency: string | null
  status: string
  createdAt: Date | null
}

const toRecordArray = (value: unknown): Record<string, unknown>[] => {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is Record<string, unknown> => entry !== null && typeof entry === 'object')
  }

  if (value && typeof value === 'object') {
    return [value as Record<string, unknown>]
  }

  return []
}

const pickString = (record: Record<string, unknown>, keys: string[]): string | undefined => {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed.length > 0) {
        return trimmed
      }
    }
  }
  return undefined
}

const pickNumber = (record: Record<string, unknown>, keys: string[]): number | null => {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value
    }
    if (typeof value === 'string') {
      const parsed = Number(value)
      if (!Number.isNaN(parsed)) {
        return parsed
      }
    }
  }
  return null
}

const parseDate = (value: unknown): Date | null => {
  if (!value) {
    return null
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) {
      return parsed
    }
  }

  return null
}

const formatNumber = (value: number, options?: Intl.NumberFormatOptions, locale?: string) =>
  new Intl.NumberFormat(locale, options).format(value)

const formatPercent = (value: number | null, locale?: string) =>
  value === null ? '—' : `${formatNumber(value, { maximumFractionDigits: value >= 100 ? 0 : 1 }, locale)}%`

const formatCurrency = (
  value: number,
  currencyCode: string | null | undefined,
  locale?: string,
): string => {
  if (!Number.isFinite(value)) {
    return String(value)
  }

  if (currencyCode) {
    try {
      return new Intl.NumberFormat(locale, { style: 'currency', currency: currencyCode }).format(value)
    } catch {
      const formatted = formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 }, locale)
      return `${currencyCode} ${formatted}`
    }
  }

  return formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 }, locale)
}

const describeTimeUntil = (target: Date | null, t: TFunction): string => {
  if (!target) {
    return t('customer.dates.dateUnavailable')
  }

  const now = new Date()
  const diffMs = target.getTime() - now.getTime()
  const diffDays = Math.round(diffMs / 86400000)

  if (diffDays < 0) {
    return t('customer.dates.expired', { days: Math.abs(diffDays) })
  }

  if (diffDays === 0) {
    return t('customer.dates.dueToday')
  }

  if (diffDays === 1) {
    return t('customer.dates.dueTomorrow')
  }

  return t('customer.dates.dueIn', { days: diffDays })
}

const formatDisplayDate = (value: Date | null, locale?: string) => {
  if (!value) {
    return '—'
  }
  return value.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const formatPlanLabel = (value: string | null | undefined): string => {
  if (!value) {
    return '—'
  }

  const trimmed = value.trim()
  if (trimmed.length === 0) {
    return '—'
  }

  return trimmed
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const parseMoneyValue = (
  candidate: unknown,
): { amount: number | null; currencyCode: string | null } => {
  if (!isRecord(candidate)) {
    return { amount: null, currencyCode: null }
  }

  const currencyCode = pickString(candidate, ['currency_code', 'currencyCode']) ?? null

  const amountMicros = pickNumber(candidate, ['amount_micros', 'amountMicros'])
  if (amountMicros !== null) {
    return { amount: amountMicros / 1_000_000, currencyCode }
  }

  const units = pickNumber(candidate, ['units'])
  const nanos = pickNumber(candidate, ['nanos'])
  if (units !== null || nanos !== null) {
    const resolvedUnits = units ?? 0
    const resolvedNanos = nanos ?? 0
    return { amount: resolvedUnits + resolvedNanos / 1_000_000_000, currencyCode }
  }

  const amount = pickNumber(candidate, ['amount', 'value'])
  if (amount !== null) {
    return { amount, currencyCode }
  }

  return { amount: null, currencyCode }
}

const parsePricingExpression = (
  candidate: unknown,
): { amount: number | null; currencyCode: string | null } => {
  if (!isRecord(candidate)) {
    return { amount: null, currencyCode: null }
  }

  const directUnitPrice = parseMoneyValue(candidate['unit_price'] ?? candidate['unitPrice'])
  if (directUnitPrice.amount !== null || directUnitPrice.currencyCode) {
    return directUnitPrice
  }

  const baseUnitPrice = parseMoneyValue(candidate['base_unit_price'] ?? candidate['baseUnitPrice'])
  if (baseUnitPrice.amount !== null || baseUnitPrice.currencyCode) {
    return baseUnitPrice
  }

  const tieredRates = candidate['tiered_rates'] ?? candidate['tieredRates']
  if (Array.isArray(tieredRates)) {
    for (const tier of tieredRates) {
      if (!isRecord(tier)) {
        continue
      }
      const tierPrice = parseMoneyValue(
        tier['unit_price'] ??
          tier['unitPrice'] ??
          tier['price'] ??
          (isRecord(tier['price']) ? tier['price']['unit_price'] ?? tier['price']['unitPrice'] : null),
      )
      if (tierPrice.amount !== null || tierPrice.currencyCode) {
        return tierPrice
      }
    }
  }

  const pricingUnits = [
    candidate['display_quantity_price'],
    candidate['displayQuantityPrice'],
    candidate['display_price'],
    candidate['displayPrice'],
  ]

  for (const pricingUnit of pricingUnits) {
    const parsed = parseMoneyValue(pricingUnit)
    if (parsed.amount !== null || parsed.currencyCode) {
      return parsed
    }
  }

  const fallbackAmount = pickNumber(candidate, ['unit_amount', 'unitAmount'])
  if (fallbackAmount !== null) {
    return {
      amount: fallbackAmount,
      currencyCode: pickString(candidate, ['currency_code', 'currencyCode']) ?? null,
    }
  }

  return { amount: null, currencyCode: null }
}

const parsePriceDetails = (
  candidate: unknown,
): { amount: number | null; currencyCode: string | null } => {
  if (!isRecord(candidate)) {
    return parseMoneyValue(candidate)
  }

  const directMoney = parseMoneyValue(candidate)
  if (directMoney.amount !== null || directMoney.currencyCode) {
    return directMoney
  }

  const pricingExpressionCandidate = candidate['pricing_expression'] ?? candidate['pricingExpression']
  const pricingExpression = parsePricingExpression(pricingExpressionCandidate)
  if (pricingExpression.amount !== null || pricingExpression.currencyCode) {
    return pricingExpression
  }

  const moneySources: unknown[] = [
    candidate['unit_price'],
    candidate['unitPrice'],
    candidate['effective_price'],
    candidate['effectivePrice'],
    candidate['base_price'],
    candidate['basePrice'],
    candidate['list_price'],
    candidate['listPrice'],
  ]

  for (const source of moneySources) {
    const parsed = parseMoneyValue(source)
    if (parsed.amount !== null || parsed.currencyCode) {
      return parsed
    }
  }

  const tierCandidates = candidate['effective_price_tiers']
  if (Array.isArray(tierCandidates)) {
    for (const tier of tierCandidates) {
      const parsed = parsePriceDetails(tier)
      if (parsed.amount !== null || parsed.currencyCode) {
        return parsed
      }
    }
  }

  const genericTiers = candidate['price_tiers'] ?? candidate['tiers']
  if (Array.isArray(genericTiers)) {
    for (const tier of genericTiers) {
      if (!isRecord(tier)) {
        continue
      }
      const parsed = parsePriceDetails(tier['price'] ?? tier['unit_price'])
      if (parsed.amount !== null || parsed.currencyCode) {
        return parsed
      }
    }
  }

  return { amount: null, currencyCode: directMoney.currencyCode }
}

const formatPriceByResourceEntry = (entry: unknown): string | null => {
  if (typeof entry === 'string') {
    const trimmed = entry.trim()
    return trimmed.length > 0 ? trimmed : null
  }

  if (typeof entry === 'number' && Number.isFinite(entry)) {
    return String(entry)
  }

  if (!isRecord(entry)) {
    return null
  }

  const entryRecord = entry

  const priceDetails = parsePriceDetails(entryRecord['price'] ?? entryRecord)
  let priceText: string | null = null
  if (priceDetails.amount !== null && Number.isFinite(priceDetails.amount)) {
    priceText = formatCurrency(priceDetails.amount, priceDetails.currencyCode)
  } else if (priceDetails.currencyCode) {
    priceText = priceDetails.currencyCode
  }

  const resourceTypeRaw =
    pickString(entryRecord, ['resource_type', 'resourceType', 'unit_type']) ?? null
  const resourceValue = pickNumber(entryRecord, [
    'resource_value',
    'resourceValue',
    'unit_count',
  ])
  const description = pickString(entryRecord, ['description', 'display_name'])
  const priceObject = isRecord(entryRecord['price']) ? entryRecord['price'] : null
  const pricingExpressionRaw =
    priceObject?.['pricing_expression'] ?? priceObject?.['pricingExpression']
  const pricingExpression =
    pricingExpressionRaw && isRecord(pricingExpressionRaw) ? pricingExpressionRaw : null

  const usageDescription =
    pricingExpression?.['base_unit_description'] ??
    pricingExpression?.['baseUnitDescription'] ??
    pricingExpression?.['usage_unit_description'] ??
    pricingExpression?.['usageUnitDescription']
  const usageUnitRaw =
    pickString(entryRecord, ['usage_unit', 'usageUnit']) ??
    pickString(priceObject ?? {}, ['pricing_unit', 'pricingUnit']) ??
    (pricingExpression
      ? pickString(pricingExpression, [
          'usage_unit',
          'usageUnit',
          'base_unit',
          'baseUnit',
          'display_quantity_unit',
          'displayQuantityUnit',
        ])
      : null)

  let resourceDescriptor: string | null = null
  if (resourceTypeRaw) {
    const normalized = resourceTypeRaw.replace(/[_-]+/g, ' ').toLowerCase()
    if (
      resourceValue !== null &&
      Number.isFinite(resourceValue) &&
      resourceValue > 0 &&
      resourceValue !== 1
    ) {
      resourceDescriptor = `${resourceValue} ${normalized}`
    } else {
      resourceDescriptor = normalized
    }
  } else if (resourceValue !== null && Number.isFinite(resourceValue)) {
    resourceDescriptor = resourceValue === 1 ? 'unit' : `${resourceValue} units`
  }

  if (!resourceDescriptor && typeof usageDescription === 'string' && usageDescription.trim().length > 0) {
    resourceDescriptor = usageDescription.trim().replace(/^per\s+/i, '').toLowerCase()
  }

  if (
    !resourceDescriptor &&
    typeof usageUnitRaw === 'string' &&
    usageUnitRaw.trim().length > 0 &&
    usageUnitRaw.trim().toLowerCase() !== 'unspecified'
  ) {
    resourceDescriptor = usageUnitRaw.trim().replace(/[_-]+/g, ' ').toLowerCase()
  }

  if (priceText && resourceDescriptor) {
    return `${priceText} per ${resourceDescriptor}`
  }

  if (priceText && description) {
    return `${priceText} — ${description}`
  }

  if (priceText) {
    return priceText
  }

  if (resourceDescriptor) {
    return `Per ${resourceDescriptor}`
  }

  return description ?? null
}

const extractPriceByResourcesFromOffer = (candidate: unknown): unknown => {
  if (candidate === null || candidate === undefined) {
    return null
  }

  if (Array.isArray(candidate)) {
    for (const entry of candidate) {
      const resolved = extractPriceByResourcesFromOffer(entry)
      if (resolved !== null && resolved !== undefined) {
        return resolved
      }
    }
    return null
  }

  if (!isRecord(candidate)) {
    return null
  }

  const direct =
    candidate['prices_by_resources'] ??
    candidate['pricesByResources'] ??
    candidate['price_by_resources'] ??
    candidate['priceByResources']
  if (direct !== undefined && direct !== null) {
    return direct
  }

  const nestedKeys = ['offer', 'details', 'data']
  for (const key of nestedKeys) {
    if (!(key in candidate)) {
      continue
    }
    const resolved = extractPriceByResourcesFromOffer(candidate[key])
    if (resolved !== null && resolved !== undefined) {
      return resolved
    }
  }

  return null
}

const resolvePriceByResources = (record: Record<string, unknown>): unknown => {
  const direct =
    record['prices_by_resources'] ??
    record['pricesByResources'] ??
    record['price_by_resources'] ??
    record['priceByResources']
  if (direct !== undefined && direct !== null) {
    return direct
  }

  const offerResolved = extractPriceByResourcesFromOffer(record['offer'])
  if (offerResolved !== null && offerResolved !== undefined) {
    return offerResolved
  }

  const planResolved = extractPriceByResourcesFromOffer(record['plan'])
  if (planResolved !== null && planResolved !== undefined) {
    return planResolved
  }

  const channelCandidate = record['channel']
  if (channelCandidate !== null && channelCandidate !== undefined) {
    const resolved = extractPriceByResourcesFromOffer(
      isRecord(channelCandidate) && 'offers' in channelCandidate
        ? channelCandidate['offers']
        : channelCandidate,
    )
    if (resolved !== null && resolved !== undefined) {
      return resolved
    }
  }

  return null
}

const normalizePriceCondition = (
  value: unknown,
): { flag: boolean | null; label: string | null } => {
  if (Array.isArray(value)) {
    const labels = value
      .map((entry) => formatPriceByResourceEntry(entry))
      .filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)

    if (labels.length > 0) {
      return { flag: null, label: labels.join(' | ') }
    }

    return { flag: null, label: null }
  }

  if (typeof value === 'boolean') {
    return { flag: value, label: null }
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return { flag: value !== 0, label: null }
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed.length === 0) {
      return { flag: null, label: null }
    }

    const normalized = trimmed.toLowerCase()
    const truthy = ['1', 'true', 'yes', 'y', 'sim', 's']
    const falsy = ['0', 'false', 'no', 'n', 'nao', 'não']

    if (truthy.includes(normalized)) {
      return { flag: true, label: null }
    }

    if (falsy.includes(normalized)) {
      return { flag: false, label: null }
    }

    const looksLikeJson =
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    if (looksLikeJson) {
      try {
        const parsed = JSON.parse(trimmed)
        const parsedResult = normalizePriceCondition(parsed)
        if (parsedResult.flag !== null || parsedResult.label !== null) {
          return parsedResult
        }
      } catch {
        // ignore JSON parse failures and fall back to using the raw string
      }
    }

    return { flag: null, label: trimmed }
  }

  const formatted = formatPriceByResourceEntry(value)
  if (formatted) {
    return { flag: null, label: formatted }
  }

  return { flag: null, label: null }
}

const normalizeEntitlements = (
  payload: unknown,
  companyLookup: Map<string, CustomerMapping>,
): CustomerEntitlement[] => {
  const source = toRecordArray(payload)

  return source.map((record, index) => {
    const entitlementName =
      pickString(record, ['entitlement_name', 'name', 'id']) ?? `entitlement-${index + 1}`
    const companyMappingIdCandidate =
      pickString(record, ['company_mapping_id', 'company_id']) ??
      String(pickNumber(record, ['company_mapping_id', 'company_id']) ?? 'unknown')
    const mapping = companyLookup.get(companyMappingIdCandidate)
    const productDisplayName =
      pickString(record, ['product_display_name', 'product_name']) ?? 'Unnamed Product'
    const skuDisplayName =
      pickString(record, ['sku_display_name', 'sku_name']) ?? productDisplayName
    const offerDisplayName =
      pickString(record, ['offer_display_name', 'current_offer_name']) ?? 'Plan'
    const provisioningState = pickString(record, ['provisioning_state', 'state']) ?? 'UNKNOWN'
    const acquiredUnits = pickNumber(record, ['acquired_units', 'committed_units']) ?? 0
    const assignedUnits = pickNumber(record, ['assigned_units', 'active_units']) ?? 0
    const maxUnits = pickNumber(record, ['max_units', 'maximum_units']) ?? acquiredUnits
    const utilizationPct =
      pickNumber(record, ['utilization_pct']) ??
      (acquiredUnits > 0 ? (assignedUnits / acquiredUnits) * 100 : null)

    const resolvedCompanyName =
      pickString(record, ['company_name_reseller', 'company_name']) ??
      mapping?.customerName ??
      'Customer'

    const rawPriceByResources = resolvePriceByResources(record)
    const { flag: priceByResources, label: priceConditionFromRaw } =
      normalizePriceCondition(rawPriceByResources)

    const currencyCode =
      pickString(record, ['price_currency_code', 'effective_price_currency_code', 'currency_code']) ?? null
    const effectivePriceValueMonthEst =
      pickNumber(record, ['effective_price_value_month_est']) ?? null

    const explicitPriceCondition =
      priceConditionFromRaw ??
      pickString(record, [
        'price_condition',
        'pricing_condition',
        'price_condition_label',
        'price_condition_text',
      ]) ??
      null

    return {
      id: `${companyMappingIdCandidate}-${entitlementName}`,
      companyMappingId: companyMappingIdCandidate,
      companyName: resolvedCompanyName,
      entitlementName,
      productDisplayName,
      skuDisplayName,
      offerDisplayName,
      provisioningState,
      createTime: parseDate(record['create_time']),
      commitmentStart: parseDate(record['commitment_start_time']),
      commitmentEnd: parseDate(record['commitment_end_time']),
      acquiredUnits,
      assignedUnits,
      maxUnits,
      utilizationPct,
      renewalPaymentPlan: pickString(record, ['renewal_payment_plan']),
      renewalCyclePeriod: pickString(record, ['renewal_cycle_period']),
      renewalCycleDuration: pickNumber(record, ['renewal_cycle_duration']),
      renewalPaymentPlanRaw: pickString(record, ['plan_payment_plan']),
      currencyCode,
      planPaymentPlan: pickString(record, ['plan_payment_plan']),
      planPaymentType: pickString(record, ['plan_payment_type']),
      priceByResources,
      priceCondition: explicitPriceCondition,
      effectivePriceValueMonthEst,
    }
  })
}

const normalizeRequestStatus = (value: string | null | undefined): string => {
  if (!value) {
    return 'pending'
  }

  const normalized = value.trim().toLowerCase().replace(/\s+/g, '_')

  if (normalized === 'approved') {
    return 'approved'
  }

  if (normalized === 'rejected') {
    return 'rejected'
  }

  if (normalized === 'pending') {
    return 'pending'
  }

  if (normalized.includes('progress') || normalized.includes('review') || normalized.includes('evaluat')) {
    return 'in_progress'
  }

  if (normalized.includes('submit') || normalized.includes('sent')) {
    return 'submitted'
  }

  if (normalized.includes('complete') || normalized.includes('done')) {
    return 'completed'
  }

  if (normalized.includes('cancel')) {
    return 'cancelled'
  }

  return normalized
}

const normalizeRequests = (
  payload: unknown,
  companyLookup: Map<string, CustomerMapping>,
): CustomerLicenseRequest[] => {
  const source = toRecordArray(payload)

  return source.map((record, index) => {
    const id = pickString(record, ['id', 'request_id', 'request_uuid']) ?? `request-${index + 1}`
    const companyMappingId =
      pickString(record, ['company_id', 'company_mapping_id', 'companyId']) ??
      String(pickNumber(record, ['company_id', 'company_mapping_id']) ?? 'unknown')
    const companyName =
      pickString(record, ['company_name_reseller', 'company_name_hub', 'company_name']) ??
      companyLookup.get(companyMappingId)?.customerName ??
      null
    const entitlementName = pickString(record, ['entitlement_name', 'entitlementName']) ?? null
    const skuDisplayName =
      pickString(record, ['sku_display_name', 'skuDisplayName', 'license_name', 'licenseName']) ??
      entitlementName
    const offerName = pickString(record, ['current_offer_name', 'currentOfferName', 'offer_name', 'offerName']) ?? null
    const quantity = pickNumber(record, ['quantity', 'requested_quantity', 'p_quantity'])
    const totalPrice = pickNumber(record, ['total_price', 'totalPrice', 'estimated_total'])
    const currency = pickString(record, ['currency', 'currency_code', 'currencyCode'])
    const statusRaw =
      pickString(record, ['status', 'Status', 'request_status', 'stage', 'current_stage', 'progress_stage']) ??
      'submitted'
    const createdAt = parseDate(record['created_at'] ?? record['createdAt'] ?? record['submitted_at'])

    return {
      id,
      companyMappingId,
      companyName,
      entitlementName,
      skuDisplayName,
      offerName,
      quantity,
      totalPrice,
      currency: currency ?? null,
      status: normalizeRequestStatus(statusRaw),
      createdAt,
    }
  })
}

const computeOverview = (entitlements: CustomerEntitlement[]): OverviewMetrics => {
  if (entitlements.length === 0) {
    return {
      totalAssigned: 0,
      totalAcquired: 0,
      availableSeats: 0,
      averageUtilization: null,
      activeEntitlements: 0,
      licensesAddedThisMonth: 0,
    }
  }

  const now = new Date()
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))

  const active = entitlements.filter((entry) => entry.provisioningState.toUpperCase() === 'ACTIVE')

  const totalAssigned = active.reduce((sum, entry) => sum + entry.assignedUnits, 0)
  const totalAcquired = active.reduce((sum, entry) => sum + entry.acquiredUnits, 0)
  const availableSeats = active.reduce((sum, entry) => {
    const available = entry.acquiredUnits - entry.assignedUnits
    return sum + (available > 0 ? available : 0)
  }, 0)

  const utilizationValues = entitlements
    .map((entry) => {
      if (entry.utilizationPct !== null) {
        return entry.utilizationPct
      }
      if (entry.acquiredUnits > 0) {
        return (entry.assignedUnits / entry.acquiredUnits) * 100
      }
      return null
    })
    .filter((value): value is number => value !== null && Number.isFinite(value))

  const averageUtilization =
    utilizationValues.length > 0
      ? utilizationValues.reduce((sum, value) => sum + value, 0) / utilizationValues.length
      : null

  const licensesAddedThisMonth = entitlements.reduce((sum, entry) => {
    if (!entry.createTime) {
      return sum
    }
    if (entry.createTime >= startOfMonth) {
      return sum + entry.assignedUnits
    }
    return sum
  }, 0)

  return {
    totalAssigned,
    totalAcquired,
    availableSeats,
    averageUtilization,
    activeEntitlements: active.length,
    licensesAddedThisMonth,
  }
}

const deriveAlerts = (
  entitlements: CustomerEntitlement[],
  t: TFunction,
  locale: string | undefined,
): EntitlementAlert[] => {
  const alerts: EntitlementAlert[] = []
  const now = new Date()

  for (const entry of entitlements) {
    if (!entry.commitmentEnd) {
      continue
    }

    const diffDays = Math.round((entry.commitmentEnd.getTime() - now.getTime()) / 86400000)
    if (diffDays < 0) {
      continue
    }

    const relative = describeTimeUntil(entry.commitmentEnd, t)
    alerts.push({
      id: `${entry.id}-renewal`,
      title: t('customer.alerts.renewal.title', { product: entry.skuDisplayName }),
      description: t('customer.alerts.renewal.description', {
        relative,
        date: formatDisplayDate(entry.commitmentEnd, locale),
      }),
      severity: diffDays <= 15 ? 'high' : 'medium',
      timestamp: entry.commitmentEnd,
      totalLicenses: Number.isFinite(entry.acquiredUnits) ? entry.acquiredUnits : null,
    })
  }

  alerts.sort((first, second) => {
    const firstTime = first.timestamp?.getTime() ?? 0
    const secondTime = second.timestamp?.getTime() ?? 0
    return firstTime - secondTime
  })

  return alerts.slice(0, 6)
}

const getUserDisplayName = (user: User) => {
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

const extractFirstName = (fullName: string) => {
  const segments = fullName.trim().split(/\s+/)
  return segments.length > 0 ? segments[0] : fullName
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

const ROLE_KEY_LABEL_MAPPING: Record<string, string> = {
  customer_admin: 'Customer Admin',
  customer_user: 'Customer User',
  portal_admin: 'Portal Admin',
  support_agent: 'Support Agent',
  partnerops_admin: 'PartnerOps Admin',
  partner_ops_admin: 'PartnerOps Admin',
  pending: 'Pending',
}

const ROLE_ID_LABEL_MAPPING: Record<number, string> = {
  1: 'Portal Admin',
  2: 'Customer Admin',
  3: 'PartnerOps Admin',
  4: 'Customer User',
  5: 'Pending',
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

const coerceIdList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (typeof entry === 'number') {
          return entry.toString()
        }
        if (typeof entry === 'string') {
          return entry.trim()
        }
        return null
      })
      .filter((entry): entry is string => Boolean(entry && entry.length > 0))
  }

  if (typeof value === 'number') {
    return [value.toString()]
  }

  if (typeof value === 'string') {
    return value
      .split(/[,;|]/)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
  }

  return []
}

const extractCompanyMappingIdsFromUser = (user: User): string[] => {
  const sources: Record<string, unknown>[] = []

  if (user.app_metadata && typeof user.app_metadata === 'object') {
    sources.push(user.app_metadata)
  }

  if (user.user_metadata && typeof user.user_metadata === 'object') {
    sources.push(user.user_metadata)
  }

  const keys = [
    'company_mapping_id',
    'company_mapping_ids',
    'customer_mapping_id',
    'customer_mapping_ids',
    'company_id',
    'company_ids',
    'customer_id',
    'customer_ids',
  ]

  const result = new Set<string>()

  for (const source of sources) {
    for (const key of keys) {
      const value = source[key]
      if (value === null || value === undefined) {
        continue
      }
      for (const candidate of coerceIdList(value)) {
        if (candidate.length > 0) {
          result.add(candidate)
        }
      }
    }
  }

  return Array.from(result)
}

function CustomerHomePage({ user, roleState, onSignOut }: CustomerHomePageProps) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const locale = i18n.resolvedLanguage ?? i18n.language ?? undefined
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [customerMappings, setCustomerMappings] = useState<CustomerMapping[]>([])
  const [entitlements, setEntitlements] = useState<CustomerEntitlement[]>([])
  const [requests, setRequests] = useState<CustomerLicenseRequest[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all')
  const [refreshToken, setRefreshToken] = useState(0)
  const [roleLabel, setRoleLabel] = useState(() => deriveRoleLabel(user))
  const isCustomerAdmin = useMemo(
    () => normalizeRoleLabel(roleLabel) === 'Customer Admin',
    [roleLabel],
  )

  const displayName = useMemo(() => getUserDisplayName(user), [user])
  const welcomeName = useMemo(() => extractFirstName(displayName), [displayName])
  const avatarUrl = useMemo(() => {
    const rawUrl = (user.user_metadata?.avatar_url as string | undefined)?.trim()
    return rawUrl && rawUrl.length > 0 ? rawUrl : undefined
  }, [user])

  useEffect(() => {
    document.body.classList.add('customer-body')
    return () => {
      document.body.classList.remove('customer-body')
    }
  }, [])

  useEffect(() => {
    setRoleLabel(deriveRoleLabel(user))
  }, [user])

  const headerNavItems = useMemo(
    () =>
      buildHeaderNavItems({
        t,
        role: roleState,
        activeSection: roleState === 'customerAdmin' ? 'home' : 'licenseRequest',
      }),
    [roleState, t],
  )

  const companyNameForHeader = useMemo(() => {
    if (customerMappings.length === 0) {
      return ''
    }

    if (selectedCompanyId === 'all') {
      if (customerMappings.length === 1) {
        return customerMappings[0].customerName
      }
      return t('customer.hero.companyAll')
    }

    const match = customerMappings.find((entry) => entry.companyMappingId === selectedCompanyId)
    if (match) {
      return match.customerName
    }

    return customerMappings[0]?.customerName ?? ''
  }, [customerMappings, selectedCompanyId, t])

  const formatStatusLabel = useCallback((status: string) => {
    if (typeof status !== 'string' || status.length === 0) {
      return status
    }
    const key = status.toLowerCase()
    return t(`customer.status.${key}`, { defaultValue: status })
  }, [t])

  const formatRequestStatusLabel = useCallback((status: string) => {
    if (typeof status !== 'string' || status.length === 0) {
      return status
    }
    return t(`customer.requests.status.${status}`, { defaultValue: status })
  }, [t])

  const loadData = useCallback(async () => {
    if (!supabase) {
      setError(t('customer.errors.missingSupabase'))
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    let requestAccumulator: CustomerLicenseRequest[] = []

    try {
      const companyIds = new Set<string>()

      if (user.id) {
        try {
          const { data: userRecord, error: userRecordError } = await supabase
            .from('users')
            .select('company_id, role_id')
            .eq('auth_user_id', user.id)
            .maybeSingle()

          if (userRecordError && userRecordError.code !== 'PGRST116') {
            throw userRecordError
          }

          const recordRole = normalizeRoleLabel(userRecord?.role_id)
          if (recordRole) {
            setRoleLabel(recordRole)
          }

          const rawCompanyId = (userRecord?.company_id as string | number | null | undefined) ?? null
          if (rawCompanyId !== null && rawCompanyId !== undefined) {
            companyIds.add(String(rawCompanyId))
          }
        } catch (userLookupError) {
          console.error('Failed to resolve linked company from public.users', userLookupError)
        }
      }

      for (const fallbackId of extractCompanyMappingIdsFromUser(user)) {
        if (fallbackId.length > 0) {
          companyIds.add(fallbackId)
        }
      }

      const companyIdList = Array.from(companyIds).filter((value) => value.length > 0)

      if (companyIdList.length === 0) {
        throw new Error(t('customer.errors.noCompanyMappings'))
      }

      const appClient = supabase.schema('app')

      const lookup = new Map<string, CustomerMapping>()
      const collectedMappings: CustomerMapping[] = []
      const entitlementsAccumulator: CustomerEntitlement[] = []

      for (const id of companyIdList) {
        try {
          const rpcParam = coerceBigintParam(id)
          const { data: licensingData, error: licensingError } = await appClient.rpc('fn_company_licensing', {
            p_company_mapping_id: rpcParam,
          })

          if (licensingError) {
            throw licensingError
          }

          const normalized = normalizeEntitlements(licensingData, lookup)

          for (const record of normalized) {
            const existing = lookup.get(record.companyMappingId)

            if (!existing) {
              const customerMapping: CustomerMapping = {
                id: record.companyMappingId,
                companyMappingId: record.companyMappingId,
                customerName: record.companyName,
              }
              lookup.set(record.companyMappingId, customerMapping)
              collectedMappings.push(customerMapping)
            } else if (existing.customerName !== record.companyName && record.companyName !== 'Customer') {
              lookup.set(record.companyMappingId, { ...existing, customerName: record.companyName })
            }
          }

          entitlementsAccumulator.push(...normalized)
        } catch (licensingError) {
          console.error('Failed to load licensing data for company', id, licensingError)
        }
      }

      for (const id of companyIdList) {
        if (lookup.has(id)) {
          continue
        }
        const placeholder: CustomerMapping = {
          id,
          companyMappingId: id,
          customerName: `Customer ${collectedMappings.length + 1}`,
        }
        lookup.set(id, placeholder)
        collectedMappings.push(placeholder)
      }

      try {
        if (roleState === 'customerAdmin') {
          const appClient = supabase.schema('app')
          const scopedIds = companyIdList.map((id) => id.trim()).filter((id) => /^\d+$/.test(id))
          const normalizedByKey = new Map<string, CustomerLicenseRequest>()

          if (scopedIds.length === 0) {
            const { data, error: requestError } = await appClient.rpc('fn_requests_list_by_company', {
              p_limit: 20,
              p_company_mapping_id: null,
            })

            if (requestError) {
              throw requestError
            }

            for (const item of normalizeRequests(toRecordArray(data), lookup)) {
              const key = `${item.id}:${item.companyMappingId}`
              normalizedByKey.set(key, item)
            }
          } else {
            for (const companyId of scopedIds) {
              const { data, error: requestError } = await appClient.rpc('fn_requests_list_by_company', {
                p_limit: 20,
                p_company_mapping_id: coerceBigintParam(companyId),
              })

              if (requestError) {
                throw requestError
              }

              for (const item of normalizeRequests(toRecordArray(data), lookup)) {
                const key = `${item.id}:${item.companyMappingId}`
                normalizedByKey.set(key, item)
              }
            }
          }

          requestAccumulator = Array.from(normalizedByKey.values())
        } else if (user.id) {
          const appClient = supabase.schema('app')
          const { data, error: requestError } = await appClient.rpc('fn_requests_list', {
            p_limit: 8,
            p_requester_id: user.id,
            p_include_all: false,
          })

          if (requestError) {
            throw requestError
          }

          requestAccumulator = normalizeRequests(toRecordArray(data), lookup)
        }
      } catch (requestLoadError) {
        console.error('Failed to load license requests', requestLoadError)
        try {
          if (roleState === 'customerAdmin') {
            const appClient = supabase.schema('app')
            const normalizedByKey = new Map<string, CustomerLicenseRequest>()
            const { data, error: fallbackError } = await appClient.rpc('fn_requests_list', {
              p_limit: 20,
              p_requester_id: user.id,
              p_include_all: false,
            })

            if (fallbackError) {
              throw fallbackError
            }

            for (const item of normalizeRequests(toRecordArray(data), lookup)) {
              const key = `${item.id}:${item.companyMappingId}`
              normalizedByKey.set(key, item)
            }

            requestAccumulator = Array.from(normalizedByKey.values())
          } else if (user.id) {
            const { data, error: fallbackError } = await supabase
              .schema('app')
              .from('license_requests')
              .select('*')
              .eq('requester_id', user.id)
              .order('created_at', { ascending: false })
              .limit(8)

            if (fallbackError) {
              throw fallbackError
            }

            requestAccumulator = normalizeRequests(data, lookup)
          }
        } catch (fallbackLoadError) {
          console.error('Failed to load license requests from fallback', fallbackLoadError)
          requestAccumulator = []
        }
      }

      if (entitlementsAccumulator.length === 0) {
        throw new Error(t('customer.errors.noLicensingData'))
      }

      setCustomerMappings(collectedMappings)
      setEntitlements(entitlementsAccumulator)
      setRequests(requestAccumulator)
    } catch (loadError) {
      console.error('Failed to load customer licensing data', loadError)
      const message =
        loadError instanceof Error && typeof loadError.message === 'string' && loadError.message.length > 0
          ? loadError.message
          : t('customer.errors.generic')
      setError(message)
      setEntitlements([])
      setCustomerMappings([])
      setRequests(requestAccumulator)
    } finally {
      setLoading(false)
    }
  }, [roleState, t, user])

  useEffect(() => {
    void loadData()
  }, [loadData, refreshToken])

  useEffect(() => {
    if (customerMappings.length === 0) {
      setSelectedCompanyId('all')
      return
    }

    setSelectedCompanyId((previous) => {
      const hasPrevious = previous !== 'all' && customerMappings.some((entry) => entry.companyMappingId === previous)

      if (hasPrevious) {
        return previous
      }

      if (customerMappings.length > 1) {
        return 'all'
      }
      return customerMappings[0]?.companyMappingId ?? 'all'
    })
  }, [customerMappings])

  const visibleEntitlements = useMemo(() => {
    if (selectedCompanyId === 'all') {
      return entitlements
    }
    return entitlements.filter((entry) => entry.companyMappingId === selectedCompanyId)
  }, [entitlements, selectedCompanyId])

  const overviewMetrics = useMemo(() => computeOverview(visibleEntitlements), [visibleEntitlements])
  const alerts = useMemo(
    () => deriveAlerts(visibleEntitlements, t, locale),
    [visibleEntitlements, t, locale],
  )

  const visibleRequests = useMemo(() => {
    const scoped =
      selectedCompanyId === 'all'
        ? requests
        : requests.filter((entry) => entry.companyMappingId === selectedCompanyId)

    return [...scoped]
      .sort((first, second) => {
        const firstTime = first.createdAt?.getTime() ?? 0
        const secondTime = second.createdAt?.getTime() ?? 0
        return secondTime - firstTime
      })
      .slice(0, 5)
  }, [requests, selectedCompanyId])

  const licenseOverview = useMemo<LicenseOverviewItem[]>(() => {
    const sorted = [...visibleEntitlements].sort((first, second) => {
      if (second.assignedUnits !== first.assignedUnits) {
        return second.assignedUnits - first.assignedUnits
      }
      return second.acquiredUnits - first.acquiredUnits
    })

    return sorted.slice(0, 5).map((entry) => {
      const available = Math.max(entry.acquiredUnits - entry.assignedUnits, 0)
      const status = entry.provisioningState.toUpperCase()
      const utilization =
        entry.acquiredUnits > 0 ? (entry.assignedUnits / entry.acquiredUnits) * 100 : entry.utilizationPct ?? 0
      const formattedPlan = formatPlanLabel(entry.planPaymentPlan ?? entry.renewalPaymentPlan)
      const normalizedPlan = formattedPlan === '—' ? null : formattedPlan
      const effectivePriceValue =
        entry.effectivePriceValueMonthEst !== null && Number.isFinite(entry.effectivePriceValueMonthEst)
          ? entry.effectivePriceValueMonthEst
          : null
      const formattedPricePerSeat =
        effectivePriceValue !== null ? formatCurrency(effectivePriceValue, entry.currencyCode, locale) : null
      const normalizedCurrencyCode =
        typeof entry.currencyCode === 'string' && entry.currencyCode.trim().length > 0
          ? entry.currencyCode.trim().toUpperCase()
          : null
      const pricePerSeatLabel =
        formattedPricePerSeat !== null
          ? t('customer.licenses.pricePerSeat', {
              value: normalizedCurrencyCode
                ? `${formattedPricePerSeat} (${normalizedCurrencyCode})`
                : formattedPricePerSeat,
            })
          : null
      const priceCondition =
        pricePerSeatLabel ??
        entry.priceCondition ??
        (entry.priceByResources === null
          ? null
          : entry.priceByResources
            ? t('customer.licenses.priceCondition.byResources')
            : t('customer.licenses.priceCondition.byLicenses'))

      return {
        id: entry.id,
        companyMappingId: entry.companyMappingId,
        entitlementName: entry.entitlementName,
        name: entry.skuDisplayName,
        companyName: entry.companyName,
        offer: entry.offerDisplayName,
        paymentPlan: normalizedPlan,
        priceCondition,
        total: entry.acquiredUnits,
        assigned: entry.assignedUnits,
        available,
        utilization,
        status,
        currencyCode: normalizedCurrencyCode,
        pricePerSeatValue: effectivePriceValue,
      }
    })
  }, [locale, t, visibleEntitlements])

  const licenseOverviewForDisplay = useMemo(() => {
    if (!isCustomerAdmin) {
      return licenseOverview
    }
    return licenseOverview.filter(
      (entry) => entry.status.toLowerCase() !== 'suspended',
    )
  }, [isCustomerAdmin, licenseOverview])

  const handleNavigateToLicenseRequest = useCallback(
    (item: LicenseOverviewItem) => {
      const params = new URLSearchParams()
      params.set('licenseId', item.id)
      params.set('licenseName', item.name)
      params.set('companyMappingId', item.companyMappingId)
      params.set('entitlementName', item.entitlementName)
      if (item.companyName) {
        params.set('companyName', item.companyName)
      }
      if (item.offer) {
        params.set('offer', item.offer)
      }
      if (item.priceCondition) {
        params.set('priceCondition', item.priceCondition)
      }
      if (item.currencyCode) {
        params.set('currencyCode', item.currencyCode)
      }
      if (typeof item.pricePerSeatValue === 'number' && Number.isFinite(item.pricePerSeatValue)) {
        params.set('pricePerSeatValue', String(item.pricePerSeatValue))
      }
      const summarySnapshot: LicenseSummarySnapshot = {
        totalLicenses: overviewMetrics.totalAcquired,
        assignedLicenses: overviewMetrics.totalAssigned,
        availableLicenses: overviewMetrics.availableSeats,
        utilizationRate: overviewMetrics.averageUtilization,
      }
      params.set('totalLicenses', String(summarySnapshot.totalLicenses))
      params.set('assignedLicenses', String(summarySnapshot.assignedLicenses))
      params.set('availableLicenses', String(summarySnapshot.availableLicenses))
      if (summarySnapshot.utilizationRate !== null && Number.isFinite(summarySnapshot.utilizationRate)) {
        params.set('utilizationRate', String(summarySnapshot.utilizationRate))
      }
      const query = params.toString()
      navigate(`/license-request${query ? `?${query}` : ''}`, {
        state: {
          licenseId: item.id,
          companyMappingId: item.companyMappingId,
          entitlementName: item.entitlementName,
          licenseName: item.name,
          companyName: item.companyName,
          offer: item.offer,
          priceCondition: item.priceCondition,
          currencyCode: item.currencyCode,
          pricePerSeatValue: item.pricePerSeatValue,
          summary: summarySnapshot,
        },
      })
    },
    [navigate, overviewMetrics],
  )

  const currentYear = new Date().getFullYear()

  const handleRefresh = () => {
    setRefreshToken((previous) => previous + 1)
  }

  return (
    <div className="customer-root">
      <PortalHeader
        navItems={headerNavItems}
        navAriaLabel={t('customer.nav.label')}
        notificationsCount={alerts.length > 0 ? alerts.length : null}
        notificationsLabel={t('customer.nav.notifications')}
        displayName={displayName}
        roleLabel={roleLabel}
        avatarUrl={avatarUrl}
        onSignOut={onSignOut}
        signOutLabel={t('signOut')}
        signingOutLabel={t('signingOut')}
      />
      <section className="customer-hero">
        <div className="customer-hero__content">
          <div className="customer-hero__intro">
            <p className="customer-greeting">{t('customer.hero.greeting', { name: welcomeName })}</p>
            {companyNameForHeader ? (
              <span className="customer-greeting__company">{companyNameForHeader}</span>
            ) : null}
            <p className="customer-subtitle">{t('customer.hero.subtitle')}</p>
            <div className="customer-meta">
              <span>{t('customer.hero.accountStatus', { status: t('customer.hero.status.active') })}</span>
              {customerMappings.length > 1 ? (
                <label className="customer-company-selector" htmlFor="company-select">
                  {t('customer.hero.companyLabel')}
                  <select
                    id="company-select"
                    value={selectedCompanyId}
                    onChange={(event) => setSelectedCompanyId(event.target.value)}
                  >
                    <option value="all">{t('customer.hero.companyAll')}</option>
                    {customerMappings.map((mapping) => (
                      <option key={mapping.companyMappingId} value={mapping.companyMappingId}>
                        {mapping.customerName}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div className="customer-error">
          <div>
            <strong>{t('customer.error.title')}</strong>
            <p>{error}</p>
          </div>
          <button type="button" onClick={handleRefresh}>
            {t('customer.actions.retry')}
          </button>
        </div>
      )}

      <section className="customer-stats">
        <article className="customer-stat-card">
          <div className="customer-stat-card__icon customer-stat-card__icon--committed" aria-hidden="true">
            <i className="bi bi-pass"></i>
          </div>
          <div className="customer-stat-card__content">
            <span className="customer-stat-card__label">{t('customer.stats.committed.label')}</span>
            <span className="customer-stat-card__value">
              {formatNumber(overviewMetrics.totalAcquired, undefined, locale)}
            </span>
            <span className="customer-stat-card__helper">
              {t('customer.stats.committed.helper', {
                value: formatNumber(overviewMetrics.activeEntitlements, undefined, locale),
              })}
            </span>
          </div>
        </article>
        <article className="customer-stat-card">
          <div className="customer-stat-card__icon customer-stat-card__icon--active-licenses" aria-hidden="true">
            <i className="bi bi-person-check-fill"></i>
          </div>
          <div className="customer-stat-card__content">
            <span className="customer-stat-card__label">{t('customer.stats.active.label')}</span>
            <span className="customer-stat-card__value">
              {formatNumber(overviewMetrics.totalAssigned, undefined, locale)}
            </span>
            <span className="customer-stat-card__helper">
              {overviewMetrics.licensesAddedThisMonth > 0
                ? t('customer.stats.active.helperGain', {
                    value: formatNumber(overviewMetrics.licensesAddedThisMonth, undefined, locale),
                  })
                : t('customer.stats.active.helperFlat')}
            </span>
          </div>
        </article>
        <article className="customer-stat-card">
          <div className="customer-stat-card__icon customer-stat-card__icon--available" aria-hidden="true">
            <i className="bi bi-people-fill"></i>
          </div>
          <div className="customer-stat-card__content">
            <span className="customer-stat-card__label">{t('customer.stats.available.label')}</span>
            <span className="customer-stat-card__value">
              {formatNumber(overviewMetrics.availableSeats, undefined, locale)}
            </span>
            <span className="customer-stat-card__helper">
              {t('customer.stats.available.helper')}
            </span>
          </div>
        </article>
        <article className="customer-stat-card">
          <div className="customer-stat-card__icon customer-stat-card__icon--utilization" aria-hidden="true">
            <i className="bi bi-graph-up"></i>
          </div>
          <div className="customer-stat-card__content">
            <span className="customer-stat-card__label">{t('customer.stats.utilization.label')}</span>
            <span className="customer-stat-card__value">
              {formatPercent(
                overviewMetrics.averageUtilization !== null
                  ? Math.min(overviewMetrics.averageUtilization, 200)
                  : null,
                locale,
              )}
            </span>
            <span className="customer-stat-card__helper">
              {t('customer.stats.utilization.helper', {
                value: formatNumber(overviewMetrics.availableSeats, undefined, locale),
              })}
            </span>
          </div>
        </article>
      </section>

      <div className="customer-panels">
        <section className="customer-panel">
          <header className="customer-panel__header">
            <div>
              <h2>{t('customer.panels.licenses.title')}</h2>
              <p>{t('customer.panels.licenses.description')}</p>
            </div>
          </header>
          {loading ? (
            <div className="customer-skeleton-list" aria-hidden="true">
              <div className="customer-skeleton-row" />
              <div className="customer-skeleton-row" />
              <div className="customer-skeleton-row" />
            </div>
          ) : licenseOverviewForDisplay.length === 0 ? (
            <p className="customer-empty">{t('customer.panels.licenses.empty')}</p>
          ) : (
            <ul className="customer-license-list">
              {licenseOverviewForDisplay.map((entry) => {
                const isSuspended = typeof entry.status === 'string' && entry.status.toLowerCase() === 'suspended'
                return (
                  <li key={entry.id} className="customer-license-item">
                    <div className="customer-license-item__main">
                      <span className="customer-license-item__icon" aria-hidden="true">
                        <i className="bi bi-google"></i>
                      </span>
                      <div className="customer-license-item__details">
                        <div className="customer-license-item__header">
                          <span className="customer-license-item__name">{entry.name}</span>
                          {isSuspended ? (
                            <button
                              type="button"
                              className="customer-license-item__buy customer-license-item__buy--disabled"
                              disabled
                            >
                              {t('customer.licenses.buy')}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="customer-license-item__buy"
                              onClick={() => handleNavigateToLicenseRequest(entry)}
                            >
                              {t('customer.licenses.buy')}
                            </button>
                          )}
                        </div>
                        <span className="customer-license-item__offer">{entry.offer}</span>
                        {entry.priceCondition ? (
                          <span className="customer-license-item__payment">{entry.priceCondition}</span>
                        ) : null}
                        {selectedCompanyId === 'all' && (
                          <span className="customer-license-item__company">{entry.companyName}</span>
                        )}
                      </div>
                    </div>
                    <div className="customer-license-item__metrics">
                      <span>
                        <strong>{formatNumber(entry.total, undefined, locale)}</strong>
                        <small>{t('customer.licenses.table.total')}</small>
                      </span>
                      <span>
                        <strong>{formatNumber(entry.assigned, undefined, locale)}</strong>
                        <small>{t('customer.licenses.table.assigned')}</small>
                      </span>
                      <span>
                        <strong>{formatNumber(entry.available, undefined, locale)}</strong>
                        <small>{t('customer.licenses.table.available')}</small>
                      </span>
                    </div>
                    <div className="customer-license-item__footer">
                      <div className="customer-license-item__progress">
                        <div
                          className="customer-license-item__progress-bar"
                          style={{ width: `${Math.min(Math.max(entry.utilization, 0), 100)}%` }}
                        ></div>
                      </div>
                      <span className="customer-license-item__utilization">
                        {formatPercent(Math.min(Math.max(entry.utilization, 0), 100), locale)}
                      </span>
                      <span className={`customer-badge customer-badge--${entry.status.toLowerCase()}`}>
                        {formatStatusLabel(entry.status)}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="customer-panel">
          <header className="customer-panel__header">
            <div>
              <h2>{t('customer.panels.alerts.title')}</h2>
              <p>{t('customer.panels.alerts.description')}</p>
            </div>
          </header>
          {loading ? (
            <div className="customer-skeleton-list" aria-hidden="true">
              <div className="customer-skeleton-row" />
              <div className="customer-skeleton-row" />
            </div>
          ) : alerts.length === 0 ? (
            <p className="customer-empty">{t('customer.panels.alerts.empty')}</p>
          ) : (
            <ul className="customer-alert-list">
              {alerts.map((alert) => (
                <li key={alert.id} className={`customer-alert customer-alert--${alert.severity}`}>
                  <div className="customer-alert__main">
                    <span className="customer-alert__icon" aria-hidden="true">
                      <i className="bi bi-calendar3"></i>
                    </span>
                    <div>
                      <span className="customer-alert__title">{alert.title}</span>
                      <p className="customer-alert__description">{alert.description}</p>
                    </div>
                  </div>
                  {alert.totalLicenses !== null ? (
                    <span className="customer-alert__time">
                      {t('customer.alerts.renewal.total', {
                        value: formatNumber(alert.totalLicenses, undefined, locale),
                      })}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="customer-panel customer-panel--wide">
          <header className="customer-panel__header">
            <div>
              <h2>{t('customer.panels.requests.title')}</h2>
              <p>{t('customer.panels.requests.description')}</p>
            </div>
          </header>
          {loading ? (
            <div className="customer-skeleton-list" aria-hidden="true">
              <div className="customer-skeleton-row" />
              <div className="customer-skeleton-row" />
            </div>
          ) : visibleRequests.length === 0 ? (
            <p className="customer-empty">{t('customer.panels.requests.empty')}</p>
          ) : (
            <ul className="customer-request-list">
              {visibleRequests.map((request) => {
                const totalLabel =
                  request.totalPrice !== null
                    ? formatCurrency(request.totalPrice, request.currency, locale)
                    : '-'
                const requestedOn =
                  request.createdAt !== null ? formatDisplayDate(request.createdAt, locale) : '-'
                return (
                  <li key={request.id} className="customer-request-item">
                    <div className="customer-request-item__main">
                      <div>
                        <span className="customer-request-item__title">
                          {request.skuDisplayName ?? request.entitlementName ?? t('customer.requests.unknown')}
                        </span>
                        {request.offerName ? (
                          <span className="customer-request-item__meta">{request.offerName}</span>
                        ) : null}
                        {selectedCompanyId === 'all' && request.companyName ? (
                          <span className="customer-request-item__company">{request.companyName}</span>
                        ) : null}
                      </div>
                      <span className={`customer-request-item__status customer-request-item__status--${request.status}`}>
                        {formatRequestStatusLabel(request.status)}
                      </span>
                    </div>
                    <div className="customer-request-item__details">
                      <span className="customer-request-item__detail">
                        {t('customer.requests.labels.requestId')}: {request.id}
                      </span>
                      <span className="customer-request-item__detail">
                        {t('customer.requests.labels.seats', { count: request.quantity ?? 0 })}
                      </span>
                      <span className="customer-request-item__detail">
                        {t('customer.requests.labels.total')}: {totalLabel}
                      </span>
                      <span className="customer-request-item__detail">
                        {t('customer.requests.labels.requestedOn')}: {requestedOn}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>

      <footer className="customer-footer">
        <span>{t('customer.footer.rights', { year: currentYear })}</span>
        <nav aria-label={t('customer.footer.aria')}>
          <a href="https://www.tigabytes.com" target="_blank" rel="noreferrer">
            {t('customer.footer.company')}
          </a>
          <a href="mailto:support@tigabytes.com">{t('customer.footer.contact')}</a>
          <a href="https://workspace.google.com/terms/service-terms/" target="_blank" rel="noreferrer">
            {t('customer.footer.terms')}
          </a>
        </nav>
      </footer>
    </div>
  )
}

export default CustomerHomePage
