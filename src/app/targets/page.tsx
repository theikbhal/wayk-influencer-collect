'use client'

import { useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabase'
import { TargetAccount } from '@/types'
import { Plus, ExternalLink, Trash2, Globe } from 'lucide-react'

export default function TargetsPage() {
  const [targets, setTargets] = useState<TargetAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => { loadTargets() }, [])

  async function loadTargets() {
    setLoading(true)
    try {
      const { data } = await getSupabase().from('target_accounts').select('*').order('created_at', { ascending: false })
      setTargets((data ?? []) as TargetAccount[])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function addTarget(e: React.FormEvent) {
    e.preventDefault()
    if (!newUsername.trim()) return
    setAdding(true)
    try {
      const { error } = await getSupabase().from('target_accounts').insert({
        username: newUsername.trim().replace('@', ''),
        notes: newNotes.trim(),
        scrape_status: 'pending',
      })
      if (error) {
        if (error.code === '23505') { alert('Target already exists') }
        else { alert('Error: ' + error.message) }
        return
      }
      setNewUsername('')
      setNewNotes('')
      setShowAdd(false)
      loadTargets()
    } catch (e) { console.error(e) }
    finally { setAdding(false) }
  }

  async function deleteTarget(id: string) {
    if (!confirm('Delete this target?')) return
    await getSupabase().from('target_accounts').delete().eq('id', id)
    loadTargets()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Target Accounts</h1>
          <p className="text-sm text-[#888] mt-1">Accounts whose followers you want to collect</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 px-4 py-2 bg-ig text-white rounded-lg text-sm font-medium hover:opacity-90 transition-all"
        >
          <Plus size={16} />
          Add Target
        </button>
      </div>

      {showAdd && (
        <form onSubmit={addTarget} className="bg-[#111] border border-[#222] rounded-xl p-4 mb-6">
          <div className="mb-3">
            <label className="text-xs text-[#888] block mb-1">Instagram Username</label>
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="wayk.app"
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#c13584]"
              autoFocus
            />
          </div>
          <div className="mb-3">
            <label className="text-xs text-[#888] block mb-1">Notes</label>
            <textarea
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="Any notes..."
              rows={2}
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#c13584] resize-none"
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={adding} className="px-4 py-2 bg-ig text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
              {adding ? 'Adding...' : 'Add'}
            </button>
            <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 bg-[#1a1a1a] text-[#888] rounded-lg text-sm hover:text-white">
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-12 text-[#555]">Loading...</div>
      ) : targets.length === 0 ? (
        <div className="text-center py-12">
          <Globe size={40} className="mx-auto mb-3 text-[#333]" />
          <p className="text-[#555]">No target accounts yet</p>
          <p className="text-xs text-[#444] mt-1">Add your first target to start collecting followers</p>
        </div>
      ) : (
        <div className="space-y-2">
          {targets.map((t) => (
            <div key={t.id} className="bg-[#111] border border-[#222] rounded-xl p-4 hover:border-[#333] transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-ig flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {(t.username || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <a
                      href={`https://instagram.com/${t.username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium hover:text-[#c13584] truncate"
                    >
                      @{t.username}
                    </a>
                    <ExternalLink size={12} className="text-[#555] flex-shrink-0" />
                    <span className={`text-[11px] px-2 py-0.5 rounded-full ${
                      t.scrape_status === 'completed' ? 'text-green-400 bg-green-400/10' :
                      t.scrape_status === 'scraping' ? 'text-blue-400 bg-blue-400/10' :
                      'text-orange-400 bg-orange-400/10'
                    }`}>
                      {t.scrape_status}
                    </span>
                  </div>
                  {t.display_name && <div className="text-sm text-[#888] truncate">{t.display_name}</div>}
                  {t.followers_count > 0 && (
                    <div className="text-xs text-[#666] mt-1">
                      {t.followers_count.toLocaleString()} followers
                    </div>
                  )}
                  {t.notes && <div className="text-xs text-[#666] mt-1 truncate">{t.notes}</div>}
                </div>
                <button
                  onClick={() => deleteTarget(t.id)}
                  className="p-2 text-[#555] hover:text-red-400 transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
