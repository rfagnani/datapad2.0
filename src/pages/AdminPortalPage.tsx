import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { User } from '@supabase/supabase-js'
import PortalHeader from '../components/PortalHeader'
import { supabase } from '../lib/supabaseClient'
import { buildHeaderNavItems } from '../lib/headerNavigation'
import '../App.css'
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

type RoleVariant = 'admin' | 'user' | 'support' | 'danger'

type ToastVariant = 'success' | 'error' | 'loading'

type ToastState = {
  message: string
  variant: ToastVariant
}

const FALLBACK_OVERVIEW: PortalAdminOverview = {
  total_users: 247,
  total_customers: 89,
  active_sessions: 156,
  pending_users: 7,
}

type RoleOption = {
  value: string
  label: string
}

type CustomerMapping = {
  id: string
  customerId: string
  customerName: string
  gwsUid: string
  gwsEmail?: string
  portalUserId?: string | null
  sortValue: string
}

type UserRow = {
  id: string
  name: string
  email: string
  role: string
  roleValue: string
  roleVariant: RoleVariant
  customer: string
  lastLogin: string
  status: 'Active' | 'Inactive'
  avatarUrl?: string
  gwsUid?: string
  userUid?: string
  companyId?: string | null
}

const statusTone: Record<UserRow['status'], 'success' | 'warning'> = {
  Active: 'success',
  Inactive: 'warning',
}

const DEFAULT_PAGE_SIZE = 10

const toRecordArray = (value: unknown): Record<string, unknown>[] => {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is Record<string, unknown> => entry !== null && typeof entry === 'object')
  }

  if (value !== null && typeof value === 'object') {
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

const pickValue = (record: Record<string, unknown>, keys: string[]): string | undefined => {
  for (const key of keys) {
    const value = record[key]
    if (value === null || value === undefined) {
      continue
    }

    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed.length > 0) {
        return trimmed
      }
      continue
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value)
    }
  }

  return undefined
}

const pickFirstDefined = (record: Record<string, unknown>, keys: string[]): unknown => {
  for (const key of keys) {
    const value = record[key]
    if (value !== undefined && value !== null) {
      return value
    }
  }

  return undefined
}

const formatCompanyName = (value: string): string => {
  const trimmed = value.trim()

  if (trimmed.length === 0) {
    return ''
  }

  const capitalizeWord = (word: string): string => {
    return word
      .split(/([-_/])/)
      .map((segment) => {
        if (segment.length === 0) {
          return segment
        }

        if (segment === '-' || segment === '_' || segment === '/') {
          return segment
        }

        return segment[0].toUpperCase() + segment.slice(1).toLowerCase()
      })
      .join('')
  }

  return trimmed
    .split(/\s+/)
    .map(capitalizeWord)
    .join(' ')
}

const describeCustomerMapping = (entry: CustomerMapping): string => {
  return entry.customerName
}

const normalizeLabel = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()

const getUserKey = (user: Pick<UserRow, 'id' | 'userUid'>): string => {
  const candidate = (user.userUid ?? '').trim()
  return candidate.length > 0 ? candidate : user.id
}

const sanitizeRoleValue = (label: string, index: number): string => {
  const normalized = label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

  if (normalized.length > 0) {
    return normalized
  }

  return `role_${index + 1}`
}

const deriveRoleVariant = (roleValue: string, roleLabel: string): RoleVariant => {
  const normalizedValue = roleValue.toLowerCase()
  const normalizedLabel = roleLabel.toLowerCase()

  const preset: Record<string, RoleVariant> = {
    portal_admin: 'danger',
    system_admin: 'danger',
    customer_admin: 'admin',
    customer_user: 'user',
    support_agent: 'support',
    support: 'support',
    admin: 'admin',
    super_admin: 'danger',
  }

  if (preset[normalizedValue]) {
    return preset[normalizedValue]
  }

  if (normalizedLabel.includes('support')) {
    return 'support'
  }

  if (normalizedLabel.includes('portal') || normalizedLabel.includes('system')) {
    return 'danger'
  }

  if (normalizedLabel.includes('admin') || normalizedLabel.includes('owner') || normalizedLabel.includes('manager')) {
    return 'admin'
  }

  return 'user'
}

const formatRelativeLastLogin = (
  value: unknown,
  translate: (key: string, options?: Record<string, unknown>) => string,
): string => {
  if (!value) {
    return translate('admin.table.lastLogin.minutes', { count: 0 })
  }

  let parsed: Date | null = null

  if (typeof value === 'string') {
    const asDate = new Date(value)
    if (!Number.isNaN(asDate.getTime())) {
      parsed = asDate
    }
  } else if (typeof value === 'number') {
    const asDate = new Date(value)
    if (!Number.isNaN(asDate.getTime())) {
      parsed = asDate
    }
  } else if (value instanceof Date) {
    parsed = value
  }

  if (!parsed) {
    return typeof value === 'string' && value.trim().length > 0
      ? value
      : translate('admin.table.lastLogin.minutes', { count: 0 })
  }

  const diffMs = Date.now() - parsed.getTime()

  if (diffMs <= 0) {
    return translate('admin.table.lastLogin.minutes', { count: 0 })
  }

  const diffMinutes = Math.round(diffMs / 60000)

  if (diffMinutes < 60) {
    return translate('admin.table.lastLogin.minutes', { count: Math.max(1, diffMinutes) })
  }

  const diffHours = Math.round(diffMinutes / 60)

  if (diffHours < 24) {
    return translate('admin.table.lastLogin.hours', { count: Math.max(1, diffHours) })
  }

  const diffDays = Math.round(diffHours / 24)
  return translate('admin.table.lastLogin.days', { count: Math.max(1, diffDays) })
}

const parseUsersResponse = (payload: unknown) => {
  const root = toRecordArray(payload)

  if (root.length === 1) {
    const first = root[0]
    const branches = first.items ?? first.data ?? first.results ?? first.records

    if (Array.isArray(branches)) {
      const rows = toRecordArray(branches)
      const totalCandidate = first.total ?? first.total_count ?? first.count ?? first.totalRows
      const total = typeof totalCandidate === 'number'
        ? totalCandidate
        : typeof totalCandidate === 'string'
        ? Number(totalCandidate)
        : rows.length

      return { rows, total: Number.isFinite(total) ? total : rows.length }
    }
  }

  const explicitTotal = root.reduce<number | null>((accumulator, record) => {
    if (accumulator !== null) {
      return accumulator
    }

    const totalCandidate = record.total ?? record.total_count ?? record.count

    if (typeof totalCandidate === 'number') {
      return totalCandidate
    }

    if (typeof totalCandidate === 'string') {
      const parsed = Number(totalCandidate)
      if (!Number.isNaN(parsed)) {
        return parsed
      }
    }

    return accumulator
  }, null)

  return {
    rows: root,
    total: explicitTotal ?? root.length,
  }
}

const coerceStatus = (record: Record<string, unknown>): UserRow['status'] => {
  const statusCandidate = pickFirstDefined(record, ['status', 'user_status', 'state'])

  if (typeof statusCandidate === 'string') {
    const normalized = statusCandidate.toLowerCase()
    if (['inactive', 'inativo', 'inactiva', 'disabled', 'blocked', 'banned', 'archived'].includes(normalized)) {
      return 'Inactive'
    }
    return 'Active'
  }

  if (typeof statusCandidate === 'number') {
    return statusCandidate === 0 ? 'Inactive' : 'Active'
  }

  if (typeof statusCandidate === 'boolean') {
    return statusCandidate ? 'Active' : 'Inactive'
  }

  const activeFlag = pickFirstDefined(record, ['is_active', 'active'])

  if (typeof activeFlag === 'boolean') {
    return activeFlag ? 'Active' : 'Inactive'
  }

  return 'Active'
}

function AdminPortalPage({ user, onSignOut }: AdminPortalPageProps) {
  const { t, i18n } = useTranslation()
  const [overview, setOverview] = useState<PortalAdminOverview | null>(null)
  const [roleOptions, setRoleOptions] = useState<RoleOption[]>([])
  const [userRoles, setUserRoles] = useState<Record<string, string>>({})
  const [userCustomers, setUserCustomers] = useState<Record<string, string>>({})
  const [rawUsers, setRawUsers] = useState<Record<string, unknown>[]>([])
  const [totalUsers, setTotalUsers] = useState(0)
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersError, setUsersError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [customerMappings, setCustomerMappings] = useState<CustomerMapping[]>([])
  const [customerMappingsLoading, setCustomerMappingsLoading] = useState(false)
  const [customerMappingsByCompanyId, setCustomerMappingsByCompanyId] = useState<Record<string, CustomerMapping>>({})
  const [userCustomerMappingIds, setUserCustomerMappingIds] = useState<Record<string, string>>({})
  const [customerLinking, setCustomerLinking] = useState<Record<string, boolean>>({})
  const [openCustomerDropdown, setOpenCustomerDropdown] = useState<string | null>(null)
  const [customerDropdownFilter, setCustomerDropdownFilter] = useState('')
  const [roleDropdownOpen, setRoleDropdownOpen] = useState<string | null>(null)
  const [roleDropdownFilter, setRoleDropdownFilter] = useState('')
  const [roleUpdating, setRoleUpdating] = useState<Record<string, boolean>>({})
  const [toast, setToast] = useState<ToastState | null>(null)
  const [refreshUsersToken, setRefreshUsersToken] = useState(0)
  const [userPendingDeletion, setUserPendingDeletion] = useState<UserRow | null>(null)
  const [removingUser, setRemovingUser] = useState(false)
  const [removeDialogError, setRemoveDialogError] = useState<string | null>(null)
  const customerDropdownRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const roleDropdownRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const showToast = useCallback((message: string, variant: ToastVariant = 'error') => {
    setToast({ message, variant })
  }, [])

  const dismissToast = useCallback(() => {
    setToast(null)
  }, [])

  useEffect(() => {
    if (!toast || toast.variant === 'loading') {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setToast(null)
    }, 4000)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [toast])

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

  useEffect(() => {
    if (!supabase) {
      console.warn('Supabase client is not configured.')
      return
    }

    const appSchemaClient = supabase.schema('app')
    let isSubscribed = true

    const fetchRoles = async () => {
      try {
        const { data, error } = await appSchemaClient.rpc('fn_list_roles')

        if (!isSubscribed) {
          return
        }

        if (error) {
          console.error('Failed to load role filter options', error)
          setRoleOptions([])
          return
        }

        const rawList = Array.isArray(data) ? data : data ? [data] : []
        const normalized = rawList
          .map((entry, index) => {
            const record = (entry ?? {}) as Record<string, unknown>
            const label = pickString(record, ['label', 'name', 'role_name', 'display_name', 'description'])
            const rawValue = pickValue(record, ['value', 'id', 'role_id', 'code', 'key', 'slug'])
            const fallback = label ?? rawValue ?? `role-${index + 1}`

            return fallback
              ? {
                  value: rawValue ?? sanitizeRoleValue(fallback, index),
                  label: label ?? fallback,
                }
              : null
          })
          .filter((option): option is RoleOption => option !== null)
          .filter((option, index, self) => self.findIndex((item) => item.value === option.value) === index)

        setRoleOptions(normalized)
      } catch (fetchError) {
        if (isSubscribed) {
          console.error('Failed to load role filter options', fetchError)
          setRoleOptions([])
        }
      }
    }

    fetchRoles()

    return () => {
      isSubscribed = false
    }
  }, [user])

  const loadCustomerMappings = useCallback(async () => {
    if (!supabase) {
      console.warn('Supabase client is not configured.')
      return []
    }

    setCustomerMappingsLoading(true)

    try {
      const appSchemaClient = supabase.schema('app')
      const { data, error } = await appSchemaClient.rpc('fn_list_companies', {
        p_page: 1,
        p_page_size: 50,
        p_search: null,
        p_desc: false,
        p_paginate: false,
      })

      if (error) {
        throw error
      }

      const { rows } = parseUsersResponse(data)

      const byCompanyId: Record<string, CustomerMapping> = {}

      const normalized = rows.reduce<CustomerMapping[]>((accumulator, entry, index) => {
        const record = entry ?? {}
        const id =
          pickValue(record, ['mapping_id', 'company_id', 'id', 'customer_mapping_id']) ?? `company-${index + 1}`
        const customerId = pickValue(record, ['company_id', 'id', 'customer_id', 'client_id']) ?? id
        const primaryCompanyName = pickString(record, ['company_name_hub'])
        const resellerCompanyName = pickString(record, ['company_name_reseller'])
        const displaySource = resellerCompanyName && resellerCompanyName.length > 0 ? resellerCompanyName : primaryCompanyName ?? ''
        const customerName = displaySource.length > 0 ? formatCompanyName(displaySource) : ''
        const sortValue = (resellerCompanyName ?? '').trim().toLowerCase()
        const gwsUid =
          pickString(record, ['gws_uid', 'gwsUid', 'gws_id', 'workspace_uid', 'google_workspace_uid']) ?? ''

        if (gwsUid.length === 0) {
          return accumulator
        }

        if (customerName.length === 0) {
          return accumulator
        }

        const gwsEmail = pickString(record, ['gws_email', 'email', 'gws_user_email', 'workspace_email'])
        const portalUserId =
          pickString(record, ['portal_user_id', 'user_id', 'portal_user', 'supabase_user_id']) ?? null

        const mappingEntry: CustomerMapping = {
          id,
          customerId,
          customerName,
          sortValue,
          gwsUid,
          gwsEmail: gwsEmail ?? undefined,
          portalUserId,
        }

        accumulator.push(mappingEntry)

        if (customerId) {
          byCompanyId[customerId] = mappingEntry
        }

        return accumulator
      }, [])

      normalized.sort((first, second) => first.sortValue.localeCompare(second.sortValue, undefined, { sensitivity: 'base' }))

      const assignedNames: Record<string, string> = {}
      const assignedIds: Record<string, string> = {}

      for (const entry of normalized) {
        if (entry.portalUserId) {
          assignedNames[entry.portalUserId] = entry.customerName
          assignedIds[entry.portalUserId] = entry.id
        }
      }

      setCustomerMappings(normalized)
      setCustomerMappingsByCompanyId(byCompanyId)
      setUserCustomers(assignedNames)
      setUserCustomerMappingIds(assignedIds)
      return normalized
    } catch (loadError) {
      console.error('Failed to load customer mappings', loadError)
      setCustomerMappings([])
      setCustomerMappingsByCompanyId({})
      setUserCustomers({})
      setUserCustomerMappingIds({})
      showToast(t('admin.table.customerLinkLoadError'), 'error')
      return []
    } finally {
      setCustomerMappingsLoading(false)
    }
  }, [showToast, supabase, t])

  const customerMappingById = useMemo(() => {
    const lookup = new Map<string, CustomerMapping>()

    for (const entry of customerMappings) {
      lookup.set(entry.id, entry)
    }

    return lookup
  }, [customerMappings])

  const getCustomerOptionsForUser = useCallback(
    (userRow: UserRow) => {
      const normalizedUid = (userRow.gwsUid ?? '').trim()
      const userKey = getUserKey(userRow)
      const matches: CustomerMapping[] = []
      const others: CustomerMapping[] = []
      const seen = new Set<string>()

      for (const entry of customerMappings) {
        if (seen.has(entry.id)) {
          continue
        }

        seen.add(entry.id)

        const isLinkedElsewhere =
          entry.portalUserId && entry.portalUserId.length > 0 && entry.portalUserId !== userKey

        if (isLinkedElsewhere) {
          continue
        }

        if (normalizedUid.length > 0 && entry.gwsUid === normalizedUid) {
          matches.push(entry)
          continue
        }

        others.push(entry)
      }

      return [...matches, ...others]
    },
    [customerMappings],
  )

  const linkUserToCustomer = useCallback(
    async (userRow: UserRow, mapping: CustomerMapping | null) => {
      const userKey = getUserKey(userRow)
      const previousId = userCustomerMappingIds[userKey] ?? ''
      const nextId = mapping?.id ?? ''

      if (nextId === previousId) {
        return
      }

      if (!supabase) {
        showToast(t('admin.table.customerLinkMissingSupabase'), 'error')
        return
      }

      showToast(t('admin.table.customerLinkSubmitting'), 'loading')

      setCustomerLinking((previous) => ({
        ...previous,
        [userKey]: true,
      }))

      try {
        const appSchemaClient = supabase.schema('app')
        const userIdCandidate = (userRow.userUid ?? userRow.id)?.toString().trim()

        if (!userIdCandidate || userIdCandidate.length === 0) {
          throw new Error('Selected user is missing a UID.')
        }

        if (mapping) {
          if (!mapping.gwsUid || mapping.gwsUid.trim().length === 0) {
            throw new Error('Selected customer is missing a Google Workspace UID.')
          }

          const { error: linkError } = await appSchemaClient.rpc('fn_link_user_to_company', {
            p_user_id: userIdCandidate,
            p_gws_uid: mapping.gwsUid,
          })

          if (linkError) {
            throw linkError
          }
        } else if (previousId && previousId.length > 0) {
          const { error: clearError } = await appSchemaClient
            .from('customer_mappings')
            .update({ portal_user_id: null })
            .eq('id', previousId)

          if (clearError) {
            throw clearError
          }
        }

        const updatedMappings = customerMappings.map((entry) => {
          if (mapping) {
            if (entry.id === mapping.id) {
              return { ...entry, portalUserId: userKey }
            }

            if (entry.portalUserId === userKey && entry.id !== mapping.id) {
              return { ...entry, portalUserId: null }
            }

            return entry
          }

          if (entry.portalUserId === userKey) {
            return { ...entry, portalUserId: null }
          }

          return entry
        })

        setCustomerMappings(updatedMappings)

        const updatedByCompanyId: Record<string, CustomerMapping> = {}
        for (const entry of updatedMappings) {
          if (entry.customerId) {
            updatedByCompanyId[entry.customerId] = entry
          }
        }
        setCustomerMappingsByCompanyId(updatedByCompanyId)

        setUserCustomerMappingIds((previous) => {
          const next = { ...previous }
          if (mapping) {
            next[userKey] = mapping.id
          } else {
            delete next[userKey]
          }
          return next
        })

        setUserCustomers((previous) => {
          const next = { ...previous }
          if (mapping) {
            next[userKey] = mapping.customerName
          } else {
            delete next[userKey]
          }
          return next
        })

        if (mapping) {
          showToast(t('admin.table.customerLinkSuccess', { customer: mapping.customerName }), 'success')
        } else {
          showToast(t('admin.table.customerLinkCleared'), 'success')
        }

      } catch (linkError) {
        console.error('Failed to link user to customer', linkError)
        showToast(t('admin.table.customerLinkSubmitError'), 'error')
      } finally {
        setCustomerLinking((previous) => {
          const next = { ...previous }
          delete next[userKey]
          return next
        })
      }
    },
    [customerMappings, showToast, supabase, t, userCustomerMappingIds],
  )

  const registerCustomerDropdownRef = useCallback(
    (userKey: string) => (node: HTMLDivElement | null) => {
      if (node) {
        customerDropdownRefs.current[userKey] = node
      } else {
        delete customerDropdownRefs.current[userKey]
      }
    },
    [],
  )

  const closeCustomerDropdown = useCallback(() => {
    setOpenCustomerDropdown(null)
    setCustomerDropdownFilter('')
  }, [])

  const handleCustomerDropdownToggle = useCallback(
    (userKey: string, disabled?: boolean) => {
      if (disabled) {
        return
      }

      setOpenCustomerDropdown((previous) => {
        const next = previous === userKey ? null : userKey
        if (next !== previous) {
          setCustomerDropdownFilter('')
        }
        return next
      })
    },
    [],
  )

  const handleCustomerOptionSelect = useCallback(
    (userRow: UserRow, mapping: CustomerMapping | null) => {
      closeCustomerDropdown()
      void linkUserToCustomer(userRow, mapping)
    },
    [closeCustomerDropdown, linkUserToCustomer],
  )

  const updateUserRole = useCallback(
    async (userRow: UserRow, roleOption: RoleOption) => {
      const userKey = getUserKey(userRow)
      const previousRole = userRoles[userKey] ?? userRow.roleValue
      const nextRole = roleOption.value

      if (nextRole === previousRole) {
        return
      }

      if (!supabase) {
        showToast(t('admin.table.roleUpdateMissingSupabase'), 'error')
        return
      }

      const userIdCandidate = (userRow.userUid ?? userRow.id)?.toString().trim()

      if (!userIdCandidate || userIdCandidate.length === 0) {
        showToast(t('admin.table.roleUpdateMissingUid'), 'error')
        return
      }

      showToast(t('admin.table.roleUpdateSubmitting'), 'loading')

      setRoleUpdating((previous) => ({
        ...previous,
        [userKey]: true,
      }))

      try {
        const appSchemaClient = supabase.schema('app')
        const { error } = await appSchemaClient.rpc('fn_approve_user', {
          p_user_id: userIdCandidate,
          p_role_name: roleOption.label,
        })

        if (error) {
          throw error
        }

        setUserRoles((previous) => ({
          ...previous,
          [userKey]: nextRole,
        }))

        showToast(t('admin.table.roleUpdateSuccess', { role: roleOption.label }), 'success')
      } catch (updateError) {
        console.error('Failed to update user role', updateError)
        showToast(t('admin.table.roleUpdateSubmitError'), 'error')
      } finally {
        setRoleUpdating((previous) => {
          const next = { ...previous }
          delete next[userKey]
          return next
        })
      }
    },
    [showToast, supabase, t, userRoles],
  )

  const registerRoleDropdownRef = useCallback(
    (userKey: string) => (node: HTMLDivElement | null) => {
      if (node) {
        roleDropdownRefs.current[userKey] = node
      } else {
        delete roleDropdownRefs.current[userKey]
      }
    },
    [],
  )

  const closeRoleDropdown = useCallback(() => {
    setRoleDropdownOpen(null)
    setRoleDropdownFilter('')
  }, [])

  const handleRoleDropdownToggle = useCallback(
    (userKey: string, disabled?: boolean) => {
      if (disabled) {
        return
      }

      setRoleDropdownOpen((previous) => {
        const next = previous === userKey ? null : userKey
        if (next !== previous) {
          setRoleDropdownFilter('')
        }
        return next
      })
    },
    [],
  )

  const handleRoleOptionSelect = useCallback(
    (userRow: UserRow, option: RoleOption) => {
      closeRoleDropdown()
      void updateUserRole(userRow, option)
    },
    [closeRoleDropdown, updateUserRole],
  )

  useEffect(() => {
    if (!openCustomerDropdown) {
      return
    }

    const handlePointerDown = (event: MouseEvent) => {
      const container = customerDropdownRefs.current[openCustomerDropdown]
      if (container && container.contains(event.target as Node)) {
        return
      }

      closeCustomerDropdown()
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeCustomerDropdown()
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [closeCustomerDropdown, openCustomerDropdown])

  useEffect(() => {
    if (!roleDropdownOpen) {
      return
    }

    const handlePointerDown = (event: MouseEvent) => {
      const container = roleDropdownRefs.current[roleDropdownOpen]
      if (container && container.contains(event.target as Node)) {
        return
      }

      closeRoleDropdown()
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeRoleDropdown()
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [closeRoleDropdown, roleDropdownOpen])

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedSearch(searchTerm)
    }, 300)

    return () => {
      window.clearTimeout(handle)
    }
  }, [searchTerm])

  useEffect(() => {
    void loadCustomerMappings()
  }, [loadCustomerMappings, refreshUsersToken])

  useEffect(() => {
    if (!supabase) {
      console.warn('Supabase client is not configured.')
      return
    }

    const appSchemaClient = supabase.schema('app')
    let isSubscribed = true

    const fetchUsers = async () => {
      setUsersLoading(true)
      setUsersError(null)

      const params: Record<string, unknown> = {
        p_page: page,
        p_page_size: DEFAULT_PAGE_SIZE,
      }

      const trimmedSearch = debouncedSearch.trim()
      params.p_search = trimmedSearch.length > 0 ? trimmedSearch : null

      try {
        const { data, error } = await appSchemaClient.rpc('fn_list_users', params)

        if (!isSubscribed) {
          return
        }

        if (error) {
          console.error('Failed to load users', error)
          setRawUsers([])
          setTotalUsers(0)
          setUsersError(t('admin.table.error'))
          setUsersLoading(false)
          return
        }

        const { rows, total } = parseUsersResponse(data)
        setRawUsers(rows)
        setTotalUsers(typeof total === 'number' && Number.isFinite(total) ? total : rows.length)
        setUsersLoading(false)
      } catch (fetchError) {
        if (isSubscribed) {
          console.error('Failed to load users', fetchError)
          setRawUsers([])
          setTotalUsers(0)
          setUsersError(t('admin.table.error'))
          setUsersLoading(false)
        }
      }
    }

    fetchUsers()

    return () => {
      isSubscribed = false
    }
  }, [debouncedSearch, page, t, refreshUsersToken])

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
        id: 'activeSessions',
        label: t('admin.cards.sessions.label'),
        value: formatValue(metrics.active_sessions),
        helper: t('admin.cards.sessions.helper'),
        iconClass: 'bi-power',
        iconColor: '#11B981',
        iconBg: '#DCFCE7',
        helperTone: 'positive',
      },
      {
        id: 'totalCustomers',
        label: t('admin.cards.customers.label'),
        value: formatValue(metrics.total_customers),
        helper: t('admin.cards.customers.helper'),
        iconClass: 'bi-building-fill-check',
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

  const { users, fallbackRoleOptions } = useMemo(() => {
    const roleMap = new Map<string, string>()

    const mapped = rawUsers.map((entry, index) => {
      const record = entry ?? {}
      const id = pickValue(record, ['id', 'user_id', 'uid']) ?? `user-${index + 1}`
      const email = pickString(record, ['email', 'user_email', 'primary_email']) ?? ''
      const name =
        pickString(record, ['full_name', 'name', 'display_name', 'user_name']) ??
        (email.length > 0 ? email : `User ${index + 1}`)
      const baseRoleLabel = pickString(record, ['role', 'role_name', 'role_label', 'role_description']) ?? `Role ${index + 1}`
      const rawRoleValue = pickValue(record, ['role_value', 'role_key', 'role_code', 'role_id'])
      const roleValue = (rawRoleValue ?? sanitizeRoleValue(baseRoleLabel, index)).toLowerCase()
      const roleLabel = baseRoleLabel
      const roleVariant = deriveRoleVariant(roleValue, roleLabel)
      const customer =
        pickString(record, ['customer', 'customer_name', 'client', 'company', 'tenant', 'tenant_name']) ??
        '—'
      const gwsUid =
        pickString(record, ['gws_uid', 'gws_user_id', 'gwsId', 'gws_id', 'workspace_uid', 'google_workspace_uid']) ??
        undefined
      const userUid =
        pickString(record, ['user_uid', 'auth_uid', 'auth_user_id', 'auth_user_uid', 'supabase_uid']) ??
        undefined
      const userKey = getUserKey({ id, userUid })
      const lastLoginValue =
        pickFirstDefined(record, ['last_login_at', 'last_login', 'last_access_at', 'last_access']) ?? null
      const lastLogin = formatRelativeLastLogin(lastLoginValue, t)
      const status = coerceStatus(record)
      const companyId =
        pickValue(record, ['company_id', 'companyId', 'customer_company_id', 'customer_id']) ?? null
      const avatarUrl = pickString(record, [
        'avatar_url',
        'profile_image',
        'profile_photo',
        'image_url',
        'photo_url',
        'avatar',
        'avatar_path',
      ])

      if (!roleMap.has(roleValue)) {
        roleMap.set(roleValue, roleLabel)
      }

      return {
        id,
        name,
        email,
        role: roleLabel,
        roleValue,
        roleVariant,
        customer: userCustomers[userKey] ?? customer,
        lastLogin,
        status,
        avatarUrl,
        gwsUid,
        userUid,
        companyId,
      }
    })

    const options = Array.from(roleMap.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label))

    return {
      users: mapped,
      fallbackRoleOptions: options,
    }
  }, [rawUsers, t, userCustomers])

  const effectiveRoleOptions = useMemo(() => {
    if (roleOptions.length > 0) {
      return roleOptions
    }

    return fallbackRoleOptions
  }, [roleOptions, fallbackRoleOptions])

  const filteredUsers = useMemo(() => users, [users])

  useEffect(() => {
    setUserRoles((previous) => {
      const next: Record<string, string> = {}
      let mutated = false

      for (const entry of filteredUsers) {
        const userKey = getUserKey(entry)
        const existing = previous[userKey]
        const value = existing ?? entry.roleValue
        next[userKey] = value
        if (value !== existing) {
          mutated = true
        }
      }

      if (Object.keys(previous).length !== Object.keys(next).length) {
        mutated = true
      }

      return mutated ? next : previous
    })
  }, [filteredUsers])

  const roleLabelByValue = useMemo(() => {
    const lookup = new Map<string, string>()

    for (const option of effectiveRoleOptions) {
      lookup.set(option.value, option.label)
    }

    for (const entry of users) {
      if (!lookup.has(entry.roleValue)) {
        lookup.set(entry.roleValue, entry.role)
      }
    }

    return lookup
  }, [effectiveRoleOptions, users])

  const totalAvailable = totalUsers
  const totalPages = Math.max(1, Math.ceil(Math.max(1, totalAvailable) / DEFAULT_PAGE_SIZE))

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages))
  }, [totalPages])

  const currentPage = Math.min(page, totalPages)
  const rangeStart = filteredUsers.length === 0 ? 0 : (currentPage - 1) * DEFAULT_PAGE_SIZE + 1
  const rangeEnd = filteredUsers.length === 0 ? 0 : rangeStart + filteredUsers.length - 1
  const rangeLabel = filteredUsers.length === 0
    ? '0-0'
    : `${numberFormatter.format(rangeStart)}-${numberFormatter.format(rangeEnd)}`
  const totalLabel = numberFormatter.format(Math.max(0, totalAvailable))

  const paginationDisabled = usersLoading || totalPages <= 1

  const pageNumbers = useMemo(() => {
    const pages: number[] = []
    const maxButtons = 5
    let start = Math.max(1, currentPage - Math.floor(maxButtons / 2))
    const end = Math.min(totalPages, start + maxButtons - 1)

    if (end - start + 1 < maxButtons) {
      start = Math.max(1, end - maxButtons + 1)
    }

    for (let value = start; value <= end; value += 1) {
      pages.push(value)
    }

    return pages
  }, [currentPage, totalPages])

  const headerNavItems = useMemo(
    () => buildHeaderNavItems({ t, role: 'admin', activeSection: 'admin' }),
    [t],
  )

  const handleSearchChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value)
    setPage(1)
  }, [])

  const handleOpenRemoveUser = useCallback((userRow: UserRow) => {
    setRemoveDialogError(null)
    setUserPendingDeletion(userRow)
  }, [])

  const handleCloseRemoveUser = useCallback(() => {
    if (removingUser) {
      return
    }

    setUserPendingDeletion(null)
    setRemoveDialogError(null)
  }, [removingUser])

  const handleConfirmRemoveUser = useCallback(async () => {
    if (!userPendingDeletion) {
      return
    }

    if (!supabase) {
      setRemoveDialogError(t('admin.table.removeDialog.missingSupabase'))
      return
    }

    const targetId = (userPendingDeletion.id ?? userPendingDeletion.userUid ?? '').trim()

    if (targetId.length === 0) {
      setRemoveDialogError(t('admin.table.removeDialog.missingUid'))
      return
    }

    setRemovingUser(true)
    setRemoveDialogError(null)

    try {
      const appSchemaClient = supabase.schema('app')
      const { error } = await appSchemaClient.rpc('fn_remove_user', { p_user_id: targetId })

      if (error) {
        throw error
      }

      setUserPendingDeletion(null)
      setRemoveDialogError(null)
      setRefreshUsersToken((value) => value + 1)
    } catch (removeError) {
      console.error('Failed to remove user', removeError)
      setRemoveDialogError(t('admin.table.removeDialog.error'))
    } finally {
      setRemovingUser(false)
    }
  }, [t, userPendingDeletion])

  useEffect(() => {
    if (!userPendingDeletion) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleCloseRemoveUser()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleCloseRemoveUser, userPendingDeletion])

  const handlePrevPage = useCallback(() => {
    setPage((current) => Math.max(1, current - 1))
  }, [])

  const handleNextPage = useCallback(() => {
    setPage((current) => Math.min(totalPages, current + 1))
  }, [totalPages])

  const handleGoToPage = useCallback(
    (target: number) => () => {
      setPage((current) => {
        const next = Math.max(1, Math.min(totalPages, target))
        return next === current ? current : next
      })
    },
    [totalPages],
  )

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

  return (
    <div className="admin-root">
      <PortalHeader
        navItems={headerNavItems}
        navAriaLabel={t('admin.nav.label')}
        notificationsCount={3}
        notificationsLabel={t('admin.nav.notifications')}
        displayName={displayName}
        roleLabel={t('admin.userRole')}
        avatarUrl={avatarUrl}
        onSignOut={onSignOut}
        signOutLabel={t('admin.actions.signOut')}
        signingOutLabel={t('admin.actions.signingOut')}
      />
      <main className="admin-content">
        <section className="admin-summary" aria-label={t('admin.cards.ariaLabel')}>
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
              <input
                type="search"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder={t('admin.table.searchPlaceholder')}
                aria-label={t('admin.table.searchPlaceholder')}
              />
            </div>
          </div>
          <div className="admin-table" role="table">
            <div className="admin-table__head" role="row">
              <span role="columnheader" className="user-header">{t('admin.table.headers.user')}</span>
              <span role="columnheader" className="role-header">{t('admin.table.headers.role')}</span>
              <span role="columnheader" className="customer-header">{t('admin.table.headers.customer')}</span>
              <span role="columnheader" className="last-login-header">{t('admin.table.headers.lastLogin')}</span>
              <span role="columnheader" className="status-header">{t('admin.table.headers.status')}</span>
              <span role="columnheader" className="update-role-header">{t('admin.table.headers.updateRole')}</span>
              <span role="columnheader" className="is-actions">{t('admin.table.headers.actions')}</span>
            </div>
            {usersLoading ? (
              <div className="admin-table__row is-loading" role="row">
                <span role="cell" className="admin-table__message">
                  {t('admin.table.loading')}
                </span>
              </div>
            ) : usersError ? (
              <div className="admin-table__row is-empty" role="row">
                <span role="cell" className="admin-table__message">
                  {usersError}
                </span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="admin-table__row is-empty" role="row">
                <span role="cell" className="admin-table__message">
                  {t('admin.table.empty')}
                </span>
              </div>
            ) : (
              <>
                {filteredUsers.map((item) => {
                  const customerInputId = `user-customer-input-${item.id}`
                  const customerOptionsId = `user-customer-options-${item.id}`
                  const isRemovingCurrent = removingUser && userPendingDeletion?.id === item.id
                  const userKey = getUserKey(item)
                  const customerOptions = getCustomerOptionsForUser(item)
                  const selectedCustomerId = userCustomerMappingIds[userKey] ?? ''
                  const selectedMapping = selectedCustomerId
                    ? customerMappingById.get(selectedCustomerId)
                    : undefined
                  const fallbackMapping = !selectedMapping && item.companyId
                    ? customerMappingsByCompanyId[item.companyId] ?? undefined
                    : undefined
                  const effectiveMapping = selectedMapping ?? fallbackMapping
                  const fallbackName =
                    effectiveMapping ? describeCustomerMapping(effectiveMapping) : userCustomers[userKey] ?? item.customer
                  const isLinkingCurrentCustomer = Boolean(customerLinking[userKey])
                  const isCustomerInputDisabled =
                    customerMappingsLoading ||
                    isLinkingCurrentCustomer ||
                    (customerOptions.length === 0 && selectedCustomerId.length === 0)
                  const customerPlaceholder =
                    customerOptions.length === 0 ? '—' : t('admin.table.customerLinkSelectPlaceholder')
                  const isDropdownOpen = openCustomerDropdown === userKey
                  const registerDropdown = registerCustomerDropdownRef(userKey)
                  const displayValue = fallbackName === '—' ? '' : fallbackName
                  const normalizedFilter = normalizeLabel(customerDropdownFilter)
                  const visibleOptions =
                    !isDropdownOpen || normalizedFilter.length === 0
                      ? customerOptions
                      : customerOptions.filter((option) => {
                          const name = normalizeLabel(option.customerName)
                          const idCandidate = normalizeLabel(option.customerId)
                          const emailCandidate = option.gwsEmail ? normalizeLabel(option.gwsEmail) : ''
                          const uidCandidate = normalizeLabel(option.gwsUid)
                          return (
                            name.includes(normalizedFilter) ||
                            idCandidate.includes(normalizedFilter) ||
                            emailCandidate.includes(normalizedFilter) ||
                            uidCandidate.includes(normalizedFilter)
                          )
                        })
                  const roleInputId = `user-role-input-${item.id}`
                  const roleOptionsId = `user-role-options-${item.id}`
                  const currentRoleValue = userRoles[userKey] ?? item.roleValue
                  const currentRoleLabel = roleLabelByValue.get(currentRoleValue) ?? item.role
                  const isRoleDropdownOpen = roleDropdownOpen === userKey
                  const registerRoleDropdown = registerRoleDropdownRef(userKey)
                  const normalizedRoleFilter = normalizeLabel(roleDropdownFilter)
                  const visibleRoleOptions =
                    !isRoleDropdownOpen || normalizedRoleFilter.length === 0
                      ? effectiveRoleOptions
                      : effectiveRoleOptions.filter((option) => {
                          const normalizedLabel = normalizeLabel(option.label)
                          const normalizedValue = normalizeLabel(option.value)
                          return (
                            normalizedLabel.includes(normalizedRoleFilter) ||
                            normalizedValue.includes(normalizedRoleFilter)
                          )
                        })
                  const isRoleUpdatingCurrent = Boolean(roleUpdating[userKey])
                  const isRoleInputDisabled =
                    isRoleUpdatingCurrent || isRemovingCurrent || effectiveRoleOptions.length === 0
                  const rolePlaceholder = t('admin.table.roleSelectPlaceholder')

                  return (
                    <div key={item.id} className="admin-table__row" role="row">
                      <div role="cell" className="user-cell">
                        <div className="avatar" aria-hidden="true">
                          {item.avatarUrl ? (
                            <img src={item.avatarUrl} alt="" />
                          ) : (
                            item.name
                              .split(' ')
                              .filter(Boolean)
                              .slice(0, 2)
                              .map((word) => word[0]?.toUpperCase() ?? '')
                              .join('')
                          )}
                        </div>
                        <div>
                          <span className="user-name">{item.name}</span>
                          <span className="user-email">{item.email}</span>
                        </div>
                      </div>
                      <div role="cell" className="role-cell">
                        <span className={`role-badge role-badge--${item.roleVariant}`}>
                          {roleLabelByValue.get(currentRoleValue) ?? item.role}
                        </span>
                      </div>
                      <div role="cell" className="customer-cell">
                        <div
                          className={`customer-combobox ${selectedCustomerId ? 'has-selection' : ''} ${
                            isDropdownOpen ? 'is-open' : ''
                          }`}
                          ref={registerDropdown}
                        >
                          <input
                            id={customerInputId}
                            className="customer-input"
                            value={displayValue}
                            readOnly
                            aria-label={t('admin.table.customerLinkSelect')}
                            placeholder={customerPlaceholder}
                            disabled={isCustomerInputDisabled}
                            onClick={() => handleCustomerDropdownToggle(userKey, isCustomerInputDisabled)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault()
                                handleCustomerDropdownToggle(userKey, isCustomerInputDisabled)
                              }
                              if (event.key === 'Escape') {
                                closeCustomerDropdown()
                              }
                            }}
                            aria-haspopup="listbox"
                            aria-expanded={isDropdownOpen}
                            aria-controls={customerOptionsId}
                            role="combobox"
                            autoComplete="off"
                          />
                          <button
                            type="button"
                            className="customer-dropdown-toggle"
                            onClick={() => handleCustomerDropdownToggle(userKey, isCustomerInputDisabled)}
                            aria-label={
                              isDropdownOpen
                                ? t('admin.table.closeCustomerList')
                                : t('admin.table.openCustomerList')
                            }
                            disabled={isCustomerInputDisabled}
                          >
                            <i
                              className={`bi ${isDropdownOpen ? 'bi-chevron-up' : 'bi-chevron-down'}`}
                              aria-hidden="true"
                            ></i>
                          </button>
                          {isDropdownOpen ? (
                            <div className="customer-options" role="listbox" id={customerOptionsId}>
                              <div className="customer-options__search">
                                <i className="bi bi-search" aria-hidden="true"></i>
                                <input
                                  type="search"
                                  value={customerDropdownFilter}
                                  onChange={(event) => setCustomerDropdownFilter(event.target.value)}
                                  placeholder={t('admin.table.customerLinkSelectPlaceholder')}
                                  aria-label={t('admin.table.customerLinkSelect')}
                                  autoFocus
                                />
                              </div>
                              <button
                                type="button"
                                className={`customer-option ${selectedCustomerId.length === 0 ? 'is-active' : ''}`}
                                role="option"
                                aria-selected={selectedCustomerId.length === 0}
                                onClick={() => handleCustomerOptionSelect(item, null)}
                                disabled={isLinkingCurrentCustomer}
                              >
                                {t('admin.table.customerLinkNoneOption')}
                              </button>
                              {visibleOptions.length === 0 ? (
                                <span className="customer-option is-empty">
                                  {customerOptions.length === 0
                                    ? t('admin.table.customerLinkEmptyForUser', { email: item.email })
                                    : t('admin.table.customerLinkNoResults')}
                                </span>
                              ) : (
                                visibleOptions.map((option) => {
                                  const isActive = option.id === selectedCustomerId
                                  return (
                                    <button
                                      key={option.id}
                                      type="button"
                                      className={`customer-option ${isActive ? 'is-active' : ''}`}
                                      role="option"
                                      aria-selected={isActive}
                                      onClick={() => handleCustomerOptionSelect(item, option)}
                                      disabled={isLinkingCurrentCustomer}
                                    >
                                      <span className="customer-option__name">{option.customerName}</span>
                                      {option.gwsEmail ? (
                                        <span className="customer-option__meta">{option.gwsEmail}</span>
                                      ) : null}
                                    </button>
                                  )
                                })
                              )}
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <div role="cell" className="last-login-cell">{item.lastLogin}</div>
                      <div role="cell" className="status-cell">
                        <span className={`status-chip status-chip--${statusTone[item.status]}`}>
                          {t(`admin.table.status.${item.status.toLowerCase()}`)}
                        </span>
                      </div>
                      <div role="cell" className="user-role-cell">
                        <div
                          className={`role-combobox ${currentRoleValue ? 'has-selection' : ''} ${
                            isRoleDropdownOpen ? 'is-open' : ''
                          }`}
                          ref={registerRoleDropdown}
                        >
                          <input
                            id={roleInputId}
                            className="role-input"
                            value={currentRoleLabel}
                            readOnly
                            aria-label={t('admin.table.roleSelectAria', { name: item.name })}
                            placeholder={rolePlaceholder}
                            disabled={isRoleInputDisabled}
                            onClick={() => handleRoleDropdownToggle(userKey, isRoleInputDisabled)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault()
                                handleRoleDropdownToggle(userKey, isRoleInputDisabled)
                              }
                              if (event.key === 'Escape') {
                                closeRoleDropdown()
                              }
                            }}
                            aria-haspopup="listbox"
                            aria-expanded={isRoleDropdownOpen}
                            aria-controls={roleOptionsId}
                            role="combobox"
                            autoComplete="off"
                          />
                          <button
                            type="button"
                            className="role-dropdown-toggle"
                            onClick={() => handleRoleDropdownToggle(userKey, isRoleInputDisabled)}
                            aria-label={
                              isRoleDropdownOpen
                                ? t('admin.table.closeRoleList')
                                : t('admin.table.openRoleList')
                            }
                            disabled={isRoleInputDisabled}
                          >
                            <i
                              className={`bi ${isRoleDropdownOpen ? 'bi-chevron-up' : 'bi-chevron-down'}`}
                              aria-hidden="true"
                            ></i>
                          </button>
                          {isRoleDropdownOpen ? (
                            <div className="role-options" role="listbox" id={roleOptionsId}>
                              <div className="role-options__search">
                                <i className="bi bi-search" aria-hidden="true"></i>
                                <input
                                  type="search"
                                  value={roleDropdownFilter}
                                  onChange={(event) => setRoleDropdownFilter(event.target.value)}
                                  placeholder={rolePlaceholder}
                                  aria-label={t('admin.table.roleSelectLabel')}
                                  autoFocus
                                />
                              </div>
                              {visibleRoleOptions.length === 0 ? (
                                <span className="role-option is-empty">{t('admin.table.roleSelectNoResults')}</span>
                              ) : (
                                visibleRoleOptions.map((option) => {
                                  const isActive = option.value === currentRoleValue
                                  return (
                                    <button
                                      key={option.value}
                                      type="button"
                                      className={`role-option ${isActive ? 'is-active' : ''}`}
                                      role="option"
                                      aria-selected={isActive}
                                      onClick={() => handleRoleOptionSelect(item, option)}
                                      disabled={isRoleUpdatingCurrent}
                                    >
                                      {option.label}
                                    </button>
                                  )
                                })
                              )}
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <div role="cell" className="is-actions">
                        <button
                          type="button"
                          className="btn btn--danger btn--icon"
                          aria-label={t('admin.table.removeUser')}
                          onClick={() => handleOpenRemoveUser(item)}
                          disabled={isRemovingCurrent}
                        >
                          <i className="bi bi-trash3-fill" aria-hidden="true"></i>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </>
            )}
          </div>
          <footer className="admin-panel__footer">
            <span>{t('admin.table.pagination.summary', { range: rangeLabel, total: totalLabel })}</span>
            <div className="pagination">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={handlePrevPage}
                disabled={paginationDisabled || currentPage === 1}
              >
                {t('admin.table.pagination.prev')}
              </button>
              {pageNumbers.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={value === currentPage ? 'btn btn--primary is-active' : 'btn btn--ghost'}
                  onClick={handleGoToPage(value)}
                  disabled={paginationDisabled && value !== currentPage}
                >
                  {value}
                </button>
              ))}
              <button
                type="button"
                className="btn btn--ghost"
                onClick={handleNextPage}
                disabled={paginationDisabled || currentPage === totalPages}
              >
                {t('admin.table.pagination.next')}
              </button>
            </div>
          </footer>
        </section>
      </main>
      {toast ? (
        <div className={`toast toast--${toast.variant}`} role="status" aria-live="polite">
          <span className="toast__message">{toast.message}</span>
          {toast.variant !== 'loading' ? (
            <button
              type="button"
              className="toast__close"
              onClick={dismissToast}
              aria-label={t('admin.actions.dismissNotification')}
            >
              &times;
            </button>
          ) : null}
        </div>
      ) : null}
      {userPendingDeletion ? (
        <div className="confirm-remove-layer" role="presentation">
          <div
            className="confirm-remove-layer__backdrop"
            onClick={handleCloseRemoveUser}
            aria-hidden="true"
          ></div>
          <div
            className="confirm-remove-layer__dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-remove-dialog-title"
            aria-describedby="confirm-remove-dialog-message"
          >
            <header className="confirm-remove-layer__header">
              <h3 id="confirm-remove-dialog-title">
                {t('admin.table.removeDialog.title', { name: userPendingDeletion.name })}
              </h3>
              <button
                type="button"
                className="confirm-remove-layer__close"
                onClick={handleCloseRemoveUser}
                aria-label={t('admin.table.removeDialog.close')}
                disabled={removingUser}
              >
                <i className="bi bi-x-lg" aria-hidden="true"></i>
              </button>
            </header>
            <p id="confirm-remove-dialog-message" className="confirm-remove-layer__message">
              {t('admin.table.removeDialog.description', { email: userPendingDeletion.email })}
            </p>
            {removeDialogError ? (
              <p className="confirm-remove-layer__error" role="alert">
                {removeDialogError}
              </p>
            ) : null}
            <footer className="confirm-remove-layer__footer">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={handleCloseRemoveUser}
                disabled={removingUser}
              >
                {t('admin.table.removeDialog.cancel')}
              </button>
              <button
                type="button"
                className="btn btn--danger"
                onClick={() => {
                  void handleConfirmRemoveUser()
                }}
                disabled={removingUser}
              >
                {removingUser
                  ? t('admin.table.removeDialog.submitting')
                  : t('admin.table.removeDialog.confirm')}
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default AdminPortalPage
