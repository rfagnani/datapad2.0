import type { User } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'

const toBool = (value: unknown): boolean => {
  if (typeof value === 'boolean') {
    return value
  }
  if (typeof value === 'number') {
    return value !== 0
  }
  if (typeof value === 'string') {
    return value.trim().toLowerCase() === 'true'
  }
  return false
}

const normalizeNumericId = (value: unknown): string | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(Math.trunc(value))
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (/^\d+$/.test(trimmed)) {
      return trimmed
    }
  }

  return null
}

const collectIdCandidates = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map(normalizeNumericId).filter((entry): entry is string => entry !== null)
  }

  const direct = normalizeNumericId(value)
  if (direct) {
    return [direct]
  }

  if (typeof value === 'string') {
    return value
      .split(/[,;|]/)
      .map((entry) => normalizeNumericId(entry))
      .filter((entry): entry is string => entry !== null)
  }

  return []
}

export const checkSupportAnalyticsAccess = async (
  user: User,
  companyMappingIds: string[] = [],
): Promise<boolean> => {
  if (!supabase) {
    return false
  }

  try {
    const candidates = new Set<string>()

    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('company_id')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (!userError) {
      const companyId = normalizeNumericId(userRecord?.company_id)
      if (companyId) {
        candidates.add(companyId)
      }
    }

    const metadataSources: Record<string, unknown>[] = []
    if (user.app_metadata && typeof user.app_metadata === 'object') {
      metadataSources.push(user.app_metadata)
    }
    if (user.user_metadata && typeof user.user_metadata === 'object') {
      metadataSources.push(user.user_metadata)
    }

    const metadataKeys = [
      'company_mapping_id',
      'company_mapping_ids',
      'customer_mapping_id',
      'customer_mapping_ids',
      'company_id',
      'company_ids',
      'customer_id',
      'customer_ids',
    ]

    for (const source of metadataSources) {
      for (const key of metadataKeys) {
        for (const candidate of collectIdCandidates(source[key])) {
          candidates.add(candidate)
        }
      }
    }

    for (const explicitId of companyMappingIds) {
      const normalized = normalizeNumericId(explicitId)
      if (normalized) {
        candidates.add(normalized)
      }
    }

    const appClient = supabase.schema('app')

    for (const companyId of candidates) {
      const { data, error } = await appClient.rpc('fn_support_analytics_has_access', {
        p_company_mapping_id: Number(companyId),
      })

      if (!error && toBool(data)) {
        return true
      }
    }

    const { data: fallbackData, error: fallbackError } = await appClient.rpc('fn_support_analytics_has_access', {
      p_company_mapping_id: null,
    })

    if (fallbackError) {
      return false
    }

    return toBool(fallbackData)
  } catch {
    return false
  }
}
