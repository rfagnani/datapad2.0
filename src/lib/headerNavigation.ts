import type { TFunction } from 'i18next'
import type { PortalHeaderNavItem } from '../components/PortalHeader'

export type HeaderRole = 'admin' | 'supportAgent' | 'customerAdmin' | 'customerUser'
export type HeaderSection = 'admin' | 'licenseRequests' | 'licenseRequest' | 'home' | 'supportAnalytics'

type BuildHeaderNavParams = {
  t: TFunction
  role: HeaderRole
  activeSection: HeaderSection
  showSupportAnalytics?: boolean
}

export const buildHeaderNavItems = ({
  t,
  role,
  activeSection,
  showSupportAnalytics = false,
}: BuildHeaderNavParams): PortalHeaderNavItem[] => {
  if (role === 'admin') {
    return [
      {
        id: 'admin',
        label: t('admin.nav.admin'),
        icon: 'bi-speedometer2',
        href: '/admin',
        isActive: activeSection === 'admin',
      },
      {
        id: 'license-requests',
        label: t('admin.licenseRequests.navLabel'),
        icon: 'bi-card-checklist',
        href: '/admin/license-requests',
        isActive: activeSection === 'licenseRequests',
      },
    ]
  }

  if (role === 'supportAgent') {
    return [
      {
        id: 'license-requests',
        label: t('admin.licenseRequests.navLabel'),
        icon: 'bi-card-checklist',
        href: '/admin/license-requests',
        isActive: activeSection === 'licenseRequests',
      },
    ]
  }

  if (role === 'customerAdmin') {
    const items: PortalHeaderNavItem[] = [
      {
        id: 'home',
        label: t('customer.nav.home'),
        icon: 'bi-house-door',
        href: '/home',
        isActive: activeSection === 'home',
      },
    ]

    if (showSupportAnalytics) {
      items.push({
        id: 'support-analytics',
        label: t('customer.supportAnalytics.navLabel'),
        icon: 'bi-graph-up-arrow',
        href: '/support-analytics',
        isActive: activeSection === 'supportAnalytics',
      })
    }

    return items
  }

  return [
    {
      id: 'license-request',
      label: t('customer.licenseRequest.actions.submit'),
      icon: 'bi-card-checklist',
      href: '/license-request',
      isActive: activeSection === 'licenseRequest',
    },
  ]
}
