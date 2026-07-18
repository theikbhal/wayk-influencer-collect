'use client'

import { useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabase'
import { Users, Eye, CheckCircle, XCircle, Target } from 'lucide-react'
import Link from 'next/link'

interface Stats {
  total: number
  pending_review: number
  followed: number
  skipped: number
  targets: number
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({ total: 0, pending_review: 0, followed: 0, skipped: 0, targets: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  async function loadStats() {
    try {
      const sb = getSupabase()
      const [total, pending, followed, skipped, targets] = await Promise.all([
        sb.from('ig_accounts').select('*', { count: 'exact', head: true }),
        sb.from('ig_accounts').select('*', { count: 'exact', head: true }).eq('follow_status', 'pending_review'),
        sb.from('ig_accounts').select('*', { count: 'exact', head: true }).eq('follow_status', 'followed'),
        sb.from('ig_accounts').select('*', { count: 'exact', head: true }).eq('follow_status', 'skipped'),
        sb.from('target_accounts').select('*', { count: 'exact', head: true }),
      ])
      setStats({
        total: total.count ?? 0,
        pending_review: pending.count ?? 0,
        followed: followed.count ?? 0,
        skipped: skipped.count ?? 0,
        targets: targets.count ?? 0,
      })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const cards = [
    { label: 'Total Accounts', value: stats.total, icon: Users, color: 'text-blue-400', href: '/accounts' },
    { label: 'Pending Review', value: stats.pending_review, icon: Eye, color: 'text-orange-400', href: '/review' },
    { label: 'Followed', value: stats.followed, icon: CheckCircle, color: 'text-green-400', href: '/accounts?status=followed' },
    { label: 'Skipped', value: stats.skipped, icon: XCircle, color: 'text-red-400', href: '/accounts?status=skipped' },
    { label: 'Target Accounts', value: stats.targets, icon: Target, color: 'text-purple-400', href: '/targets' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-[#888] mt-1">Instagram influencer collection overview</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
        {cards.map(({ label, value, icon: Icon, color, href }) => (
          <Link key={label} href={href} className="bg-[#111] border border-[#222] rounded-xl p-4 hover:border-[#333] transition-all">
            <div className="flex items-center justify-between mb-3">
              <Icon size={20} className={color} />
            </div>
            <div className="text-2xl font-bold">{loading ? '...' : value}</div>
            <div className="text-xs text-[#888] mt-1">{label}</div>
          </Link>
        ))}
      </div>

      <div className="bg-[#111] border border-[#222] rounded-xl p-6">
        <h2 className="font-semibold mb-2">Quick Start</h2>
        <ol className="text-sm text-[#888] space-y-2 list-decimal list-inside">
          <li>Add a <Link href="/targets" className="text-[#c13584] hover:underline">target account</Link> (e.g. wayk.app)</li>
          <li>Use the Chrome extension to scrape their followers</li>
          <li>Review each follower in the <Link href="/review" className="text-[#c13584] hover:underline">Review</Link> queue</li>
          <li>Approve or skip each profile</li>
          <li>Track your followed accounts</li>
        </ol>
      </div>
    </div>
  )
}
