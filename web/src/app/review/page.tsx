'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { IGAccount } from '@/types'
import { ExternalLink, Check, X, MessageSquare } from 'lucide-react'

const PAGE_SIZE = 10

export default function ReviewPage() {
  const [accounts, setAccounts] = useState<IGAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [noteText, setNoteText] = useState('')
  const [noteId, setNoteId] = useState<string | null>(null)

  function formatNumber(n: number) {
    if (!n) return '0'
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
    return n.toString()
  }

  useEffect(() => { loadReviewQueue() }, [page])

  async function loadReviewQueue() {
    setLoading(true)
    try {
      const from = (page - 1) * PAGE_SIZE
      const { data, count: total } = await supabase
        .from('ig_accounts')
        .select('*', { count: 'exact' })
        .in('follow_status', ['pending_review', 'approved'])
        .order('collected_at', { ascending: false })
        .range(from, from + PAGE_SIZE - 1)

      setAccounts((data ?? []) as IGAccount[])
      setCount(total ?? 0)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function setStatus(id: string, status: string) {
    const now = new Date().toISOString()
    const update: Record<string, any> = { follow_status: status }
    if (status === 'followed') update.followed_at = now
    if (status === 'approved' || status === 'skipped') update.reviewed_at = now

    await supabase.from('ig_accounts').update(update).eq('id', id)
    await supabase.from('follow_actions').insert({
      account_id: id,
      action: status === 'followed' ? 'follow' : status === 'approved' ? 'approve' : 'skip',
    })
    loadReviewQueue()
  }

  function openNote(id: string, notes: string) {
    setNoteId(id)
    setNoteText(notes || '')
  }

  async function saveNote() {
    if (!noteId) return
    await supabase.from('ig_accounts').update({ notes: noteText }).eq('id', noteId)
    setNoteId(null)
    setNoteText('')
    loadReviewQueue()
  }

  const totalPages = Math.ceil(count / PAGE_SIZE)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Review Queue</h1>
        <p className="text-sm text-[#888] mt-1">{count} profiles pending your review</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[#555]">Loading...</div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-12">
          <Check size={40} className="mx-auto mb-3 text-[#333]" />
          <p className="text-[#555]">All caught up!</p>
          <p className="text-xs text-[#444] mt-1">No profiles pending review</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {accounts.map((acc) => (
              <div key={acc.id} className="bg-[#111] border border-[#222] rounded-xl p-4 hover:border-[#333] transition-all">
                <div className="flex items-start gap-3">
                  <a
                    href={`https://instagram.com/${acc.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-ig flex items-center justify-center text-white font-bold text-sm flex-shrink-0 hover:opacity-80"
                  >
                    {(acc.username || '?')[0].toUpperCase()}
                  </a>
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
                      <span className={`text-[11px] px-2 py-0.5 rounded-full ${
                        acc.follow_status === 'approved' ? 'text-blue-400 bg-blue-400/10' : 'text-orange-400 bg-orange-400/10'
                      }`}>
                        {acc.follow_status?.replace('_', ' ')}
                      </span>
                    </div>
                    {acc.display_name && <div className="text-sm text-[#888] truncate">{acc.display_name}</div>}
                    <div className="flex gap-4 mt-1.5 text-xs text-[#666]">
                      <span><strong className="text-[#aaa]">{formatNumber(acc.followers)}</strong> followers</span>
                      <span><strong className="text-[#aaa]">{formatNumber(acc.following)}</strong> following</span>
                      <span><strong className="text-[#aaa]">{formatNumber(acc.posts_count)}</strong> posts</span>
                    </div>
                    {acc.bio && <div className="text-xs text-[#666] mt-1.5 line-clamp-2">{acc.bio}</div>}
                    {acc.notes && <div className="text-xs text-[#666] mt-1.5 italic truncate">Notes: {acc.notes}</div>}
                  </div>
                </div>

                <div className="flex gap-2 mt-3 pt-3 border-t border-[#222]">
                  <button
                    onClick={() => setStatus(acc.id, 'approved')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-500/20 transition-all"
                  >
                    <Check size={14} />
                    Approve
                  </button>
                  <button
                    onClick={() => setStatus(acc.id, 'followed')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 text-green-400 rounded-lg text-xs font-medium hover:bg-green-500/20 transition-all"
                  >
                    <Check size={14} />
                    Follow
                  </button>
                  <button
                    onClick={() => setStatus(acc.id, 'skipped')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-400 rounded-lg text-xs font-medium hover:bg-red-500/20 transition-all"
                  >
                    <X size={14} />
                    Skip
                  </button>
                  <button
                    onClick={() => openNote(acc.id, acc.notes || '')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1a1a] text-[#888] rounded-lg text-xs font-medium hover:text-white transition-all ml-auto"
                  >
                    <MessageSquare size={14} />
                    Note
                  </button>
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

      {/* Note Modal */}
      {noteId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setNoteId(null)}>
          <div className="bg-[#1a1a1a] border border-[#222] rounded-xl p-4 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-medium text-sm mb-3">Add Note</h3>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Your notes..."
              rows={4}
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#c13584] resize-none"
              autoFocus
            />
            <div className="flex gap-2 mt-3">
              <button onClick={saveNote} className="flex-1 px-3 py-2 bg-ig text-white rounded-lg text-sm font-medium hover:opacity-90">
                Save
              </button>
              <button onClick={() => setNoteId(null)} className="px-3 py-2 bg-[#0a0a0a] text-[#888] rounded-lg text-sm hover:text-white">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
