import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
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

type RoleVariant = 'admin' | 'user' | 'support' | 'danger'

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
  const [signingOut, setSigningOut] = useState(false)
  const [overview, setOverview] = useState<PortalAdminOverview | null>(null)
  const [roleOptions, setRoleOptions] = useState<RoleOption[]>([])
  const [userRoles, setUserRoles] = useState<Record<string, string>>({})
  const [rawUsers, setRawUsers] = useState<Record<string, unknown>[]>([])
  const [totalUsers, setTotalUsers] = useState(0)
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersError, setUsersError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'all' | string>('all')
  const [page, setPage] = useState(1)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement | null>(null)

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

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedSearch(searchTerm)
    }, 300)

    return () => {
      window.clearTimeout(handle)
    }
  }, [searchTerm])

  useEffect(() => {
    if (!userMenuOpen) {
      return
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!userMenuRef.current) {
        return
      }

      if (!userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setUserMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [userMenuOpen])

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
  }, [debouncedSearch, page, t])

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
        iconClass: 'bi-lightning-charge-fill',
        iconColor: '#11B981',
        iconBg: '#DCFCE7',
        helperTone: 'positive',
      },
      {
        id: 'totalCustomers',
        label: t('admin.cards.customers.label'),
        value: formatValue(metrics.total_customers),
        helper: t('admin.cards.customers.helper'),
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
      const lastLoginValue =
        pickFirstDefined(record, ['last_login_at', 'last_login', 'last_access_at', 'last_access']) ?? null
      const lastLogin = formatRelativeLastLogin(lastLoginValue, t)
      const status = coerceStatus(record)
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
        customer,
        lastLogin,
        status,
        avatarUrl,
      }
    })

    const options = Array.from(roleMap.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label))

    return {
      users: mapped,
      fallbackRoleOptions: options,
    }
  }, [rawUsers, t])

  const effectiveRoleOptions = useMemo(() => {
    if (roleOptions.length > 0) {
      return roleOptions
    }

    return fallbackRoleOptions
  }, [roleOptions, fallbackRoleOptions])

  const filteredUsers = useMemo(() => {
    if (selectedRoleFilter === 'all') {
      return users
    }

    return users.filter((entry) => entry.roleValue === selectedRoleFilter)
  }, [selectedRoleFilter, users])

  useEffect(() => {
    setUserRoles((previous) => {
      const next: Record<string, string> = {}
      let mutated = false

      for (const entry of filteredUsers) {
        const existing = previous[entry.id]
        const value = existing ?? entry.roleValue
        next[entry.id] = value
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

  const totalAvailable = selectedRoleFilter === 'all' ? totalUsers : filteredUsers.length
  const totalPages = selectedRoleFilter === 'all'
    ? Math.max(1, Math.ceil(Math.max(1, totalAvailable) / DEFAULT_PAGE_SIZE))
    : 1

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
    let end = Math.min(totalPages, start + maxButtons - 1)

    if (end - start + 1 < maxButtons) {
      start = Math.max(1, end - maxButtons + 1)
    }

    for (let value = start; value <= end; value += 1) {
      pages.push(value)
    }

    return pages
  }, [currentPage, totalPages])

  const headerNavItems = useMemo(() => ([
    { id: 'admin', label: t('admin.nav.admin'), icon: 'bi-speedometer2', isActive: true },
    { id: 'licenses', label: t('admin.nav.licenses'), icon: 'bi-card-checklist', isActive: false },
    { id: 'support', label: t('admin.nav.support'), icon: 'bi-life-preserver', isActive: false },
    { id: 'billing', label: t('admin.nav.billing'), icon: 'bi-credit-card', isActive: false },
  ]), [t])

  const handleSearchChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value)
    setPage(1)
  }, [])

  const handleRoleFilterChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    setSelectedRoleFilter(event.target.value)
    setPage(1)
  }, [])

  const handleRoleSelectChange = useCallback(
    (userId: string) => (event: ChangeEvent<HTMLSelectElement>) => {
      const nextRole = event.target.value

      setUserRoles((current) => {
        if (current[userId] === nextRole) {
          return current
        }

        return {
          ...current,
          [userId]: nextRole,
        }
      })

      console.info('Role update requested', { userId, nextRole })
    },
    [],
  )

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
    setUserMenuOpen(false)
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
          <img src={logo} alt="Tigabytes Datapad" />
          <nav className="admin-header__nav" aria-label={t('admin.nav.label')}>
            {headerNavItems.map((item) => (
              <a key={item.id} href="#" className={item.isActive ? 'is-active' : undefined}>
                <i className={`bi ${item.icon}`} aria-hidden="true"></i>
                <span>{item.label}</span>
              </a>
            ))}
          </nav>
        </div>
        <div className="admin-header__controls">
          <button type="button" className="header-icon" aria-label={t('admin.nav.notifications')}>
            <i className="bi bi-bell" aria-hidden="true"></i>
            <span className="header-icon__badge">3</span>
          </button>
          <div className="admin-header__user" ref={userMenuRef}>
            <button
              type="button"
              className="admin-user-chip"
              onClick={() => setUserMenuOpen((previous) => !previous)}
              aria-haspopup="true"
              aria-expanded={userMenuOpen}
            >
              <span className="admin-user-chip__avatar">
                {avatarUrl ? <img src={avatarUrl} alt="" /> : <span>{initials}</span>}
              </span>
              <span className="admin-user-chip__info">
                <span className="admin-user-chip__name">{displayName}</span>
                <span className="admin-user-chip__role">{t('admin.userRole')}</span>
              </span>
              <i
                className={`bi ${userMenuOpen ? 'bi-caret-up-fill' : 'bi-caret-down-fill'} admin-user-chip__caret`}
                aria-hidden="true"
              ></i>
            </button>
            {userMenuOpen ? (
              <div className="admin-user-menu" role="menu">
                <LanguageSelector />
                <button
                  type="button"
                  className="admin-user-chip__logout"
                  onClick={handleSignOut}
                  disabled={signingOut}
                >
                  {signingOut ? t('admin.actions.signingOut') : t('admin.actions.signOut')}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>
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
              <select
                className="toolbar-select"
                aria-label={t('admin.table.roleFilterLabel')}
                value={selectedRoleFilter}
                onChange={handleRoleFilterChange}
              >
                <option value="all">{t('admin.table.roleFilterAll')}</option>
                {effectiveRoleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
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
              filteredUsers.map((item) => (
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
                  <div role="cell">
                    <span className={`role-badge role-badge--${item.roleVariant}`}>
                      {roleLabelByValue.get(userRoles[item.id] ?? item.roleValue) ?? item.role}
                    </span>
                  </div>
                  <div role="cell" className="customer-cell">
                    {item.customer}
                    <button type="button" aria-label={t('admin.table.openCustomer')}>
                      ↗
                    </button>
                  </div>
                  <div role="cell">{item.lastLogin}</div>
                  <div role="cell">
                    <span className={`status-chip status-chip--${statusTone[item.status]}`}>
                      {t(`admin.table.status.${item.status.toLowerCase()}`)}
                    </span>
                  </div>
                  <div role="cell" className="is-actions">
                    <div className="user-action-group">
                      <select
                        className="user-role-select"
                        value={userRoles[item.id] ?? item.roleValue}
                        onChange={handleRoleSelectChange(item.id)}
                        aria-label={`${t('admin.actions.manageRoles')} - ${item.name}`}
                        disabled={effectiveRoleOptions.length === 0}
                      >
                        {effectiveRoleOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <button type="button" className="btn btn--danger btn--icon" aria-label={t('admin.table.removeUser')}>
                        <i className="bi bi-trash3-fill" aria-hidden="true"></i>
                      </button>
                    </div>
                  </div>
                </div>
              ))
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
    </div>
  )
}

export default AdminPortalPage
