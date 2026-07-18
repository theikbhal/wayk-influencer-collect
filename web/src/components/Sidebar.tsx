'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, Target, ClipboardCheck, Camera } from 'lucide-react'

const links = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/accounts', label: 'Accounts', icon: Users },
  { href: '/targets', label: 'Targets', icon: Target },
  { href: '/review', label: 'Review', icon: ClipboardCheck },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-56 bg-[#0d0d0d] border-r border-[#222] flex flex-col z-50">
      <div className="p-5 border-b border-[#222]">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-ig flex items-center justify-center">
            <Camera size={16} className="text-white" />
          </div>
          <div>
            <div className="font-bold text-sm">wayk</div>
            <div className="text-[10px] text-[#888] font-medium">collector</div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                active
                  ? 'bg-[#c13584]/10 text-[#c13584] font-medium'
                  : 'text-[#888] hover:text-white hover:bg-[#1a1a1a]'
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-[#222]">
        <div className="text-[11px] text-[#555]">
          v1.0.0
        </div>
      </div>
    </aside>
  )
}
