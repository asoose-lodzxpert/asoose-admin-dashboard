'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { logoutAction, changePassword } from '@/app/actions/auth'
import { Modal } from '@/app/components/ui/modal'
import { Button } from '@/app/components/ui/button'
import { cn } from '@/app/lib/utils'
import type { User } from '@/app/lib/types'

/* ─── Icon helper ────────────────────────────────────────── */

function Icon({ d, d2 }: { d: string; d2?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.6}
      stroke="currentColor"
      className="h-4.5 w-4.5 shrink-0"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
      {d2 && <path strokeLinecap="round" strokeLinejoin="round" d={d2} />}
    </svg>
  )
}

/* ─── Nav data ───────────────────────────────────────────── */

const MAIN_NAV = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    exact: true,
    icon: <Icon d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />,
  },
] as const

const USERS_NAV = [
  {
    label: 'Customers',
    href: '/dashboard/customers',
    icon: <Icon d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />,
  },
] as const

const ORDERS_NAV = [
  {
    label: 'Orders',
    href: '/dashboard/orders',
    icon: <Icon d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />,
  },
  {
    label: 'Rides',
    href: '/dashboard/rides',
    icon: <Icon d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" d2="M15 8.25H9m6 0a3 3 0 0 1 3 3v.75M15 8.25v-.75A3 3 0 0 0 12 4.5h0a3 3 0 0 0-3 3v.75M9 8.25a3 3 0 0 0-3 3v.75" />,
  },
  {
    label: 'Deliveries',
    href: '/dashboard/parcels',
    icon: <Icon d="M21 11.25v8.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 1 0 9.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1 1 14.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />,
  },
  {
    label: 'Products',
    href: '/dashboard/catalog',
    icon: <Icon d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" d2="M6 6h.008v.008H6V6Z" />,
  },
] as const

const FINANCE_NAV = [
  {
    label: 'Paystack',
    href: '/dashboard/finance/paystack',
    icon: <Icon d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />,
  },
  {
    label: 'Payouts',
    href: '/dashboard/finance/payouts',
    icon: <Icon d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" d2="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />,
  },
  {
    label: 'Reports',
    href: '/dashboard/finance/reports',
    icon: <Icon d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />,
  },
] as const

const PARTNERS_NAV = [
  {
    label: 'Vendors',
    href: '/dashboard/partners/vendors',
    icon: <Icon d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016 2.993 2.993 0 0 0 2.25-1.016 3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z" />,
  },
  {
    label: 'Riders',
    href: '/dashboard/partners/riders',
    icon: <Icon d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />,
  },
  {
    label: 'Drivers',
    href: '/dashboard/partners/drivers',
    icon: <Icon d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" d2="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" />,
  },
] as const

const STAYS_NAV = [
  {
    label: 'Properties',
    href: '/dashboard/properties',
    icon: <Icon d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75" />,
  },
  {
    label: 'Property Types',
    href: '/dashboard/property-types',
    icon: <Icon d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" d2="M6 6h.008v.008H6V6Z" />,
  },
  {
    label: 'Bookings',
    href: '/dashboard/bookings',
    icon: <Icon d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />,
  },
] as const

const ADMIN_NAV = [
  {
    label: 'Cities',
    href: '/dashboard/cities',
    icon: <Icon d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 0 0 .281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 1 0 3 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 0 0 2.273 1.765 11.842 11.842 0 0 0 .976.544l.062.029.018.008.006.003ZM10 11.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z" />,
  },
  {
    label: 'Locations',
    href: '/dashboard/locations',
    icon: <Icon d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" d2="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />,
  },
  {
    label: 'Admin Users',
    href: '/dashboard/admin-users',
    icon: <Icon d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />,
  },
  {
    label: 'Push Notifications',
    href: '/dashboard/notifications',
    icon: <Icon d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />,
  },
  {
    label: 'Email Broadcast',
    href: '/dashboard/emails',
    icon: <Icon d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />,
  },
  {
    label: 'Applications',
    href: '/dashboard/applications',
    icon: <Icon d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />,
  },
  {
    label: 'Reviews',
    href: '/dashboard/reviews',
    icon: <Icon d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />,
  },
  {
    label: 'Configurations',
    href: '/dashboard/configurations',
    icon: <Icon d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.559.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.894.149c-.424.07-.764.383-.929.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 0 1-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.398.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 0 1-.12-1.45l.527-.737c.25-.35.272-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 0 1 .12-1.45l.773-.773a1.125 1.125 0 0 1 1.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894Z" d2="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />,
  },
] as const

/* ─── Sidebar ────────────────────────────────────────────── */

export function Sidebar({ user }: { user: User | null }) {
  const pathname = usePathname()

  const [menuOpen, setMenuOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false)
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwPending, startPwTransition] = useTransition()
  const [logoutPending, startLogoutTransition] = useTransition()
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  function openChangePassword() {
    setMenuOpen(false)
    setCurrentPw('')
    setNewPw('')
    setPwError('')
    setDialogOpen(true)
  }

  function openLogoutConfirm() {
    setMenuOpen(false)
    setLogoutDialogOpen(true)
  }

  function handleLogout() {
    startLogoutTransition(async () => {
      await logoutAction()
    })
  }

  function handleChangePassword() {
    if (!currentPw || !newPw) { setPwError('Both fields are required.'); return }
    startPwTransition(async () => {
      const res = await changePassword(currentPw, newPw)
      if (res.error) setPwError(res.error)
      else setDialogOpen(false)
    })
  }

  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : 'A'
  const displayName = user ? `${user.firstName} ${user.lastName}` : 'Admin User'
  const displayRole = user?.role ?? 'SUPER_ADMIN'

  function isActive(href: string, exact = false) {
    return exact ? pathname === href : pathname === href || pathname.startsWith(href + '/')
  }

  function navClass(active: boolean) {
    return cn(
      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
      active
        ? 'bg-indigo-50 text-indigo-700'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    )
  }

  function iconClass(active: boolean) {
    return active ? 'text-indigo-600' : 'text-slate-400'
  }

  return (
    <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-slate-100 px-5">
        <Image src="/asoose.png" alt="Asoose" width={100} height={32} className="h-7 w-auto" />
        <span className="text-sm font-semibold text-slate-900">Asoose Admin</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {/* Main */}
        {MAIN_NAV.map((item) => {
          const active = isActive(item.href, 'exact' in item ? item.exact : false)
          return (
            <Link key={item.href} href={item.href} className={navClass(active)}>
              <span className={iconClass(active)}>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}

        {/* Users section */}
        <div className="mt-4 mb-1 px-3 pt-3 border-t border-slate-100">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Users</p>
        </div>
        {USERS_NAV.map((item) => {
          const active = isActive(item.href)
          return (
            <Link key={item.href} href={item.href} className={navClass(active)}>
              <span className={iconClass(active)}>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}

        {/* Commerce section */}
        <div className="mt-4 mb-1 px-3 pt-3 border-t border-slate-100">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Commerce</p>
        </div>
        {ORDERS_NAV.map((item) => {
          const active = isActive(item.href)
          return (
            <Link key={item.href} href={item.href} className={navClass(active)}>
              <span className={iconClass(active)}>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}

        {/* Finance section */}
        <div className="mt-4 mb-1 px-3 pt-3 border-t border-slate-100">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Finance</p>
        </div>
        {FINANCE_NAV.map((item) => {
          const active = isActive(item.href)
          return (
            <Link key={item.href} href={item.href} className={navClass(active)}>
              <span className={iconClass(active)}>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}

        {/* Partners section */}
        <div className="mt-4 mb-1 px-3 pt-3 border-t border-slate-100">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Partners</p>
        </div>
        {PARTNERS_NAV.map((item) => {
          const active = isActive(item.href)
          return (
            <Link key={item.href} href={item.href} className={navClass(active)}>
              <span className={iconClass(active)}>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}

        {/* Stays section */}
        <div className="mt-4 mb-1 px-3 pt-3 border-t border-slate-100">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Accomodation</p>
        </div>
        {STAYS_NAV.map((item) => {
          const active = isActive(item.href)
          return (
            <Link key={item.href} href={item.href} className={navClass(active)}>
              <span className={iconClass(active)}>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}

        {/* Admin section */}
        <div className="mt-4 mb-1 px-3 pt-3 border-t border-slate-100">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Admin</p>
        </div>
        {ADMIN_NAV.map((item) => {
          const active = isActive(item.href)
          return (
            <Link key={item.href} href={item.href} className={navClass(active)}>
              <span className={iconClass(active)}>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User + logout */}
      <div className="border-t border-slate-100 px-3 py-4">
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-slate-50"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-slate-900">{displayName}</p>
              <p className="truncate text-xs text-slate-500">{displayRole}</p>
            </div>
          </button>

          {menuOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-1 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
              <button
                onClick={openChangePassword}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" className="h-4 w-4 shrink-0 text-slate-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 0 1 21.75 8.25Z" />
                </svg>
                Change password
              </button>
              <div className="my-1 border-t border-slate-100" />
              <button
                onClick={openLogoutConfirm}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" className="h-4 w-4 shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3H15" />
                </svg>
                Log out
              </button>
            </div>
          )}
        </div>
      </div>

      <Modal
        open={logoutDialogOpen}
        onClose={() => setLogoutDialogOpen(false)}
        title="Log out"
        description="Are you sure you want to log out of your account?"
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setLogoutDialogOpen(false)} disabled={logoutPending}>
              Cancel
            </Button>
            <Button size="sm" loading={logoutPending} onClick={handleLogout}>
              Log out
            </Button>
          </>
        }
      />

      <Modal
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Change Password"
        description="Enter your current password and choose a new one."
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setDialogOpen(false)} disabled={pwPending}>
              Cancel
            </Button>
            <Button size="sm" loading={pwPending} onClick={handleChangePassword}>
              Update password
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Current password</label>
            <input
              type="password"
              value={currentPw}
              onChange={(e) => { setCurrentPw(e.target.value); setPwError('') }}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">New password</label>
            <input
              type="password"
              value={newPw}
              onChange={(e) => { setNewPw(e.target.value); setPwError('') }}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>
          {pwError && <p className="text-sm text-red-600">{pwError}</p>}
        </div>
      </Modal>
    </aside>
  )
}
