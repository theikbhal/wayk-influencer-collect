'use client'

import { useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabase'
import { IGAccount } from '@/types'
import { ExternalLink, Search, Filter } from 'lucide-react'

const PAGE_SIZE = 20

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<IGAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')

  function formatNumber(n: number) {
    if (!n) return '0'
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
    return n.toString()
  }

  useEffect(() => {
    loadAccounts()
  }, [page, statusFilter, sourceFilter])

  async function loadAccounts() {
    setLoading(true)
    try {
      const sb = getSupabase()
      let query = sb.from('ig_accounts').select('*', { count: 'exact' })

      if (statusFilter !== 'all') query = query.eq('follow_status', statusFilter)
      if (sourceFilter !== 'all') query = query.eq('source', sourceFilter)

      query = query.order('collected_at', { ascending: false })
      const from = (page - 1) * PAGE_SIZE
      query = query.range(from, from + PAGE_SIZE - 1)

      const { data, count: total } = await query
      setAccounts((data ?? []) as IGAccount[])
      setCount(total ?? 0)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    setLoading(true)
    try {
      const sb = getSupabase()
      let query = sb.from('ig_accounts').select('*', { count: 'exact' })
      if (search) {
        query = query.or(`username.ilike.%${search}%,display_name.ilike.%${search}%,notes.ilike.%${search}%`)
      }
      if (statusFilter !== 'all') query = query.eq('follow_status', statusFilter)
      if (sourceFilter !== 'all') query = query.eq('source', sourceFilter)
      query = query.order('collected_at', { ascending: false }).range(0, PAGE_SIZE - 1)
      const { data, count: total } = await query
      setAccounts((data ?? []) as IGAccount[])
      setCount(total ?? 0)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const totalPages = Math.ceil(count / PAGE_SIZE)

  const statusColors: Record<string, string> = {
    pending_review: 'text-orange-400 bg-orange-400/10',
    approved: 'text-blue-400 bg-blue-400/10',
    followed: 'text-green-400 bg-green-400/10',
    skipped: 'text-red-400 bg-red-400/10',
    unfollowed: 'text-gray-400 bg-gray-400/10',
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Accounts</h1>
        <p className="text-sm text-[#888] mt-1">{count} collected profiles</p>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <form onSubmit={handleSearch} className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search username, name, notes..."
              className="w-full bg-[#111] border border-[#222] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#c13584]"
            />
          </div>
        </form>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-sm text-[#888] focus:outline-none focus:border-[#c13584]"
        >
          <option value="all">All Status</option>
          <option value="pending_review">Pending Review</option>
          <option value="approved">Approved</option>
          <option value="followed">Followed</option>
          <option value="skipped">Skipped</option>
        </select>

        <select
          value={sourceFilter}
          onChange={(e) => { setSourceFilter(e.target.value); setPage(1) }}
          className="bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-sm text-[#888] focus:outline-none focus:border-[#c13584]"
        >
          <option value="all">All Sources</option>
          <option value="manual">Manual</option>
          <option value="follower">Follower</option>
          <option value="suggested">Suggested</option>
          <option value="extension">Extension</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[#555]">Loading...</div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-12 text-[#555]">No accounts found</div>
      ) : (
        <>
          <div className="space-y-2">
            {accounts.map((acc) => (
              <div key={acc.id} className="bg-[#111] border border-[#222] rounded-xl p-4 hover:border-[#333] transition-all">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-ig flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {(acc.username || '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <a
                        href={`https://instagram.com/${acc.username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium hover:text-[#c13584] truncate"
                      >
                        @{acc.username}
                      </a>
                      <ExternalLink size={12} className="text-[#555] flex-shrink-0" />
                      <span className={`text-[11px] px-2 py-0.5 rounded-full ${statusColors[acc.follow_status] || 'text-gray-400 bg-gray-400/10'}`}>
                        {acc.follow_status?.replace('_', ' ')}
                      </span>
                    </div>
                    {acc.display_name && <div className="text-sm text-[#888] truncate">{acc.display_name}</div>}
                    <div className="flex gap-4 mt-1.5 text-xs text-[#666]">
                      <span><strong className="text-[#aaa]">{formatNumber(acc.followers)}</strong> followers</span>
                      <span><strong className="text-[#aaa]">{formatNumber(acc.following)}</strong> following</span>
                      <span><strong className="text-[#aaa]">{formatNumber(acc.posts_count)}</strong> posts</span>
                    </div>
                    {acc.notes && <div className="text-xs text-[#666] mt-1.5 truncate">{acc.notes}</div>}
                    {acc.tags?.length > 0 && (
                      <div className="flex gap-1.5 mt-1.5 flex-wrap">
                        {acc.tags.map((t, i) => (
                          <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-[#c13584]/10 text-[#c13584]">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm bg-[#111] border border-[#222] rounded-lg disabled:opacity-40 hover:border-[#333]"
              >
                Prev
              </button>
              <span className="text-sm text-[#888]">{page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-sm bg-[#111] border border-[#222] rounded-lg disabled:opacity-40 hover:border-[#333]"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
