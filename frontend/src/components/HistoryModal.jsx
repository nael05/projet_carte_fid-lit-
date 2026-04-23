import React, { useState, useEffect, useCallback } from 'react'
import {
  ArrowLeft, Search, Trash2,
  ChevronLeft, ChevronRight, AlertTriangle, Loader2,
  Plus, Minus, Gift, History, SlidersHorizontal, X
} from 'lucide-react'
import api from '../api'
import './HistoryModal.css'

const TYPES = {
  add_points:    { label: 'Points ajoutés',  iconClass: 'hist-icon-add',    Icon: Plus  },
  redeem_reward: { label: 'Cadeau utilisé',  iconClass: 'hist-icon-redeem', Icon: Gift  },
  remove_points: { label: 'Points retirés',  iconClass: 'hist-icon-remove', Icon: Minus },
  add_stamps:    { label: 'Tampons ajoutés', iconClass: 'hist-icon-add',    Icon: Plus  },
}

// Robuste face aux Date objects MySQL ou strings ISO
function toIsoDay(val) {
  if (!val) return ''
  const d = val instanceof Date ? val : new Date(val)
  // Utilise la date locale du serveur retournée en ISO
  return d.toISOString().slice(0, 10)
}

function formatDay(isoDay) {
  const [y, m, d] = isoDay.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })
}

function formatTime(val) {
  if (!val) return ''
  const d = val instanceof Date ? val : new Date(val)
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function groupByDay(txs) {
  const map = {}
  for (const tx of txs) {
    const day = toIsoDay(tx.created_at)
    if (!map[day]) map[day] = []
    map[day].push(tx)
  }
  return Object.entries(map).sort(([a], [b]) => b.localeCompare(a))
}

const EMPTY = { dateFrom: '', dateTo: '', clientName: '', type: '' }

export default function HistoryModal({ onClose }) {
  const [transactions, setTransactions]   = useState([])
  const [total, setTotal]                 = useState(0)
  const [page, setPage]                   = useState(1)
  const [loading, setLoading]             = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting]           = useState(false)
  const [showFilters, setShowFilters]     = useState(false)

  const [draft, setDraft]     = useState(EMPTY)
  const [applied, setApplied] = useState(EMPTY)

  const fetchHistory = useCallback(async (filters, p) => {
    setLoading(true)
    try {
      const params = {
        page: p,
        ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''))
      }
      const { data } = await api.get('/pro/history', { params })
      setTransactions(data.transactions)
      setTotal(data.total)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchHistory(applied, page) }, [applied, page, fetchHistory])

  const handleApply = () => { setPage(1); setApplied(draft); setShowFilters(false) }
  const handleClear = () => {
    setDraft(EMPTY); setPage(1); setApplied(EMPTY); setShowFilters(false)
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await api.delete('/pro/history')
      setTransactions([]); setTotal(0); setConfirmDelete(false)
    } catch { /* silent */ }
    finally { setDeleting(false) }
  }

  const totalPages  = Math.ceil(total / 100)
  const grouped     = groupByDay(transactions)
  const activeCount = Object.values(applied).filter(v => v !== '').length

  return (
    <>
      <div className="hist-page">

        {/* ── TOP BAR ── */}
        <header className="hist-topbar">
          <button className="hist-back-btn" onClick={onClose}>
            <ArrowLeft size={18} />
          </button>
          <div className="hist-topbar-title">
            <h2>Historique</h2>
          </div>
          <button
            className={`hist-filter-toggle ${activeCount > 0 ? 'hist-filter-toggle--active' : ''}`}
            onClick={() => setShowFilters(s => !s)}
          >
            <SlidersHorizontal size={15} />
            {activeCount > 0 && <span className="hist-filter-badge">{activeCount}</span>}
          </button>
          <button className="hist-delete-top-btn" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={15} />
          </button>
        </header>

        {/* ── FILTER PANEL (accordéon) ── */}
        {showFilters && (
          <div className="hist-filter-panel">
            <div className="hist-filter-grid">
              <label className="hist-field">
                <span>Du</span>
                <input type="date" value={draft.dateFrom}
                  onChange={e => setDraft(f => ({ ...f, dateFrom: e.target.value }))} />
              </label>
              <label className="hist-field">
                <span>Au</span>
                <input type="date" value={draft.dateTo}
                  onChange={e => setDraft(f => ({ ...f, dateTo: e.target.value }))} />
              </label>
              <label className="hist-field hist-field--wide">
                <span>Client</span>
                <input type="text" placeholder="Nom du client…" value={draft.clientName}
                  onChange={e => setDraft(f => ({ ...f, clientName: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && handleApply()} />
              </label>
              <label className="hist-field">
                <span>Type</span>
                <select value={draft.type}
                  onChange={e => setDraft(f => ({ ...f, type: e.target.value }))}>
                  <option value="">Tout</option>
                  <option value="add_points">Points ajoutés</option>
                  <option value="redeem_reward">Cadeau utilisé</option>
                  <option value="remove_points">Points retirés</option>
                </select>
              </label>
            </div>
            <div className="hist-filter-footer">
              <button className="hist-btn-clear" onClick={handleClear}>
                <X size={13} /> Effacer
              </button>
              <button className="hist-btn-apply" onClick={handleApply}>
                <Search size={13} /> Appliquer
              </button>
            </div>
          </div>
        )}

        {/* ── STATS BAR ── */}
        <div className="hist-stats-bar">
          <span className="hist-stats-count">
            {loading ? '…' : `${total} transaction${total !== 1 ? 's' : ''}`}
          </span>
          <span className="hist-stats-period">6 derniers mois</span>
          {activeCount > 0 && (
            <button className="hist-stats-clear" onClick={handleClear}>
              Effacer les filtres
            </button>
          )}
        </div>

        {/* ── BODY ── */}
        <div className="hist-body">
          {loading ? (
            <div className="hist-loading">
              <Loader2 size={26} className="hist-spin" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="hist-empty">
              <div className="hist-empty-icon"><History size={24} /></div>
              <p>{activeCount > 0 ? 'Aucun résultat' : 'Aucune transaction'}</p>
              <span>{activeCount > 0 ? 'Modifiez vos filtres.' : 'Les transactions apparaîtront ici.'}</span>
            </div>
          ) : (
            <>
              {grouped.map(([day, txs]) => (
                <div key={day} className="hist-day-group">
                  <div className="hist-day-header">
                    <span className="hist-day-label">{formatDay(day)}</span>
                    <div className="hist-day-line" />
                    <span className="hist-day-count">{txs.length}</span>
                  </div>

                  <div className="hist-card-group">
                    {txs.map(tx => {
                      const meta     = TYPES[tx.type] || { label: tx.type, iconClass: 'hist-icon-default', Icon: History }
                      const { Icon } = meta
                      const client   = [tx.prenom, tx.nom].filter(Boolean).join(' ') || 'Client supprimé'
                      const sign     = tx.points_change > 0 ? '+' : ''

                      return (
                        <div key={tx.id} className="hist-row">
                          <div className={`hist-row-icon ${meta.iconClass}`}>
                            <Icon size={15} />
                          </div>
                          <div className="hist-row-info">
                            <span className="hist-type-label">{meta.label}</span>
                            <span className="hist-client-name">{client}</span>
                          </div>
                          <div className="hist-row-right">
                            {tx.points_change !== 0 && (
                              <span className={`hist-pts ${tx.points_change > 0 ? 'hist-pts-pos' : 'hist-pts-neg'}`}>
                                {sign}{tx.points_change} pts
                              </span>
                            )}
                            <span className="hist-time">{formatTime(tx.created_at)}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}

              {totalPages > 1 && (
                <div className="hist-pagination">
                  <button className="hist-page-btn"
                    onClick={() => setPage(p => p - 1)} disabled={page === 1}>
                    <ChevronLeft size={15} />
                  </button>
                  <span className="hist-page-info">{page} / {totalPages}</span>
                  <button className="hist-page-btn"
                    onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>
                    <ChevronRight size={15} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── CONFIRM DELETE ── */}
      {confirmDelete && (
        <div className="hist-confirm-overlay">
          <div className="hist-confirm-card">
            <div className="hist-confirm-icon-wrap">
              <AlertTriangle size={26} />
            </div>
            <h3>Supprimer l'historique ?</h3>
            <p>Action irréversible. Toutes les transactions seront définitivement effacées.</p>
            <div className="hist-confirm-actions">
              <button className="hist-btn-cancel"
                onClick={() => setConfirmDelete(false)} disabled={deleting}>
                Annuler
              </button>
              <button className="hist-btn-confirm-delete" onClick={handleDelete} disabled={deleting}>
                {deleting ? <Loader2 size={14} className="hist-spin" /> : <Trash2 size={14} />}
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
