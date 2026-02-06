import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { MouseEventHandler } from 'react'
import LanguageSelector from './LanguageSelector'
import logoDefault from '../img/tiga_hor.png'
import '../styles/portal-header.css'

export type PortalHeaderNavItem = {
  id: string
  label: string
  icon?: string
  href?: string
  isActive?: boolean
  onClick?: MouseEventHandler<HTMLAnchorElement | HTMLButtonElement>
}

export type PortalHeaderProps = {
  navItems?: PortalHeaderNavItem[]
  navAriaLabel?: string
  logoSrc?: string
  logoAlt?: string
  notificationsCount?: number | null
  notificationsLabel?: string
  onNotificationsClick?: () => void
  displayName: string
  roleLabel?: string
  avatarUrl?: string | null
  onSignOut: () => Promise<void> | void
  signOutLabel: string
  signingOutLabel: string
  showLanguageSelector?: boolean
  menuExtras?: React.ReactNode
  rightExtras?: React.ReactNode
  className?: string
}

const computeInitials = (value: string): string => {
  const fallback = 'TU'
  const trimmed = value.trim()
  if (trimmed.length === 0) {
    return fallback
  }

  const initials = trimmed
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment[0]?.toUpperCase() ?? '')
    .join('')

  return initials.length > 0 ? initials : fallback
}

function PortalHeader({
  navItems = [],
  navAriaLabel = 'Primary navigation',
  logoSrc = logoDefault,
  logoAlt = 'Tigabytes Datapad',
  notificationsCount,
  notificationsLabel = 'View notifications',
  onNotificationsClick,
  displayName,
  roleLabel,
  avatarUrl,
  onSignOut,
  signOutLabel,
  signingOutLabel,
  showLanguageSelector = true,
  menuExtras,
  rightExtras,
  className = '',
}: PortalHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!menuOpen) {
      return
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current) {
        return
      }

      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuOpen])

  const initials = useMemo(() => computeInitials(displayName), [displayName])
  const showNotifications = typeof notificationsCount === 'number' && notificationsCount > 0

  const handleToggleMenu = () => {
    setMenuOpen((previous) => !previous)
  }

  const handleSignOut = async () => {
    if (signingOut) {
      return
    }

    setSigningOut(true)
    try {
      await onSignOut()
    } finally {
      setSigningOut(false)
      setMenuOpen(false)
    }
  }

  const resolvedRole = roleLabel ?? ''
  const isInternalHref = (href: string) => href.startsWith('/')

  return (
    <header className={`portal-header ${className}`.trim()}>
      <div className="portal-header__brand">
        <img src={logoSrc} alt={logoAlt} />
        {navItems.length > 0 ? (
          <nav className="portal-header__nav" aria-label={navAriaLabel}>
            {navItems.map((item) => {
              const { id, label, icon, href, isActive, onClick } = item
              const content = (
                <>
                  {icon ? <i className={`bi ${icon}`} aria-hidden="true"></i> : null}
                  <span>{label}</span>
                </>
              )

              if (href) {
                if (isInternalHref(href)) {
                  return (
                    <Link
                      key={id}
                      to={href}
                      className={isActive ? 'is-active' : undefined}
                      onClick={onClick}
                    >
                      {content}
                    </Link>
                  )
                }
                return (
                  <a
                    key={id}
                    href={href}
                    className={isActive ? 'is-active' : undefined}
                    onClick={onClick}
                  >
                    {content}
                  </a>
                )
              }

              return (
                <button
                  key={id}
                  type="button"
                  className={isActive ? 'is-active' : undefined}
                  onClick={onClick}
                >
                  {content}
                </button>
              )
            })}
          </nav>
        ) : null}
      </div>
      <div className="portal-header__controls">
        {showNotifications || onNotificationsClick ? (
          <button
            type="button"
            className="header-icon"
            aria-label={notificationsLabel}
            onClick={onNotificationsClick}
          >
            <i className="bi bi-bell" aria-hidden="true"></i>
            {showNotifications ? <span className="header-icon__badge">{notificationsCount}</span> : null}
          </button>
        ) : null}
        {rightExtras}
        <div className="portal-header__user" ref={menuRef}>
          <button
            type="button"
            className="portal-user-chip"
            onClick={handleToggleMenu}
            aria-haspopup="true"
            aria-expanded={menuOpen}
          >
            <span className="portal-user-chip__avatar">
              {avatarUrl ? <img src={avatarUrl} alt="" /> : <span>{initials}</span>}
            </span>
            <span className="portal-user-chip__info">
              <span className="portal-user-chip__name">{displayName}</span>
              {resolvedRole ? <span className="portal-user-chip__role">{resolvedRole}</span> : null}
            </span>
            <i
              className={`bi ${menuOpen ? 'bi-caret-up-fill' : 'bi-caret-down-fill'} portal-user-chip__caret`}
              aria-hidden="true"
            ></i>
          </button>
          {menuOpen ? (
            <div className="portal-user-menu" role="menu">
              {showLanguageSelector ? <LanguageSelector /> : null}
              {menuExtras}
              <button
                type="button"
                className="portal-user-chip__logout"
                onClick={handleSignOut}
                disabled={signingOut}
              >
                {signingOut ? signingOutLabel : signOutLabel}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}

export default PortalHeader
