import React, { useState, useEffect, useCallback } from 'react'
import {
  ArrowLeft, Search, Calendar, Filter, Trash2,
  ChevronLeft, ChevronRight, AlertTriangle, Loader2,
  Plus, Minus, Gift, History
} from 'lucide-react'
import api from '../api'
import './HistoryModal.css'

const TYPES = {
  add_points:    { label: 'Points ajoutés',  iconClass: 'hist-icon-add',    Icon: Plus  },
  redeem_reward: { label: 'Cadeau utilisé',  iconClass: 'hist-icon-redeem', Icon: Gift  },
  remove_points: { label: 'Points retirés',  iconClass: 'hist-icon-remove', Icon: Minus },
  add_stamps:    { label: 'Tampons ajoutés', iconClass: 'hist-icon-add',    Icon: Plus  },
}

function formatDay(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function groupByDay(txs) {
  const map = {}
  for (const tx of txs) {
    const day = tx.created_at.slice(0, 10)
    if (!map[day]) map[day] = []
    map[day].push(tx)
  }
  return Object.entries(map).sort(([a], [b]) => b.localeCompare(a))
}

const EMPTY_FILTERS = { dateFrom: '', dateTo: '', clientName: '', type: '' }

export default function HistoryModal({ onClose }) {
  const [transactions, setTransactions]   = useState([])
  const [total, setTotal]                 = useState(0)
  const [page, setPage]                   = useState(1)
  const [loading, setLoading]             = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting]           = useState(false)

  const [draft, setDraft]       = useState(EMPTY_FILTERS)
  const [applied, setApplied]   = useState(EMPTY_FILTERS)

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

  const handleApply = () => { setPage(1); setApplied(draft) }
  const handleClear = () => { setDraft(EMPTY_FILTERS); setPage(1); setApplied(EMPTY_FILTERS) }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await api.delete('/pro/history')
      setTransactions([]); setTotal(0); setConfirmDelete(false)
    } catch { /* silent */ }
    finally { setDeleting(false) }
  }

  const totalPages = Math.ceil(total / 100)
  const grouped    = groupByDay(transactions)
  const hasFilters = Object.values(applied).some(v => v !== '')

  return (
    <>
      <div className="hist-page">

        {/* ── TOP BAR ── */}
        <header className="hist-topbar">
          <button className="hist-back-btn" onClick={onClose} aria-label="Retour">
            <ArrowLeft size={18} />
          </button>
          <div className="hist-topbar-title">
            <h2>Historique des points &amp; cadeaux</h2>
            <span>
              {loading ? 'Chargement…' : `${total} transaction${total !== 1 ? 's' : ''} · 6 derniers mois`}
            </span>
          </div>
          <button className="hist-delete-top-btn" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={14} />
            <span>Supprimer</span>
          </button>
        </header>

        {/* ── FILTERS ── */}
        <div className="hist-filters">
          <div className="hist-filters-row">
            <div className="hist-filter-pill">
              <Calendar size={13} />
              <input
                type="date"
                value={draft.dateFrom}
                onChange={e => setDraft(f => ({ ...f, dateFrom: e.target.value }))}
                title="Date de début"
              />
            </div>
            <div className="hist-filter-pill">
              <Calendar size={13} />
              <input
                type="date"
                value={draft.dateTo}
                onChange={e => setDraft(f => ({ ...f, dateTo: e.target.value }))}
                title="Date de fin"
              />
            </div>
            <div className="hist-filter-pill hist-filter-client">
              <Search size={13} />
              <input
                type="text"
                placeholder="Nom du client…"
                value={draft.clientName}
                onChange={e => setDraft(f => ({ ...f, clientName: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleApply()}
              />
            </div>
            <div className="hist-filter-pill">
              <Filter size={13} />
              <select
                value={draft.type}
                onChange={e => setDraft(f => ({ ...f, type: e.target.value }))}
              >
                <option value="">Tous les types</option>
                <option value="add_points">Points ajoutés</option>
                <option value="redeem_reward">Cadeau utilisé</option>
                <option value="remove_points">Points retirés</option>
              </select>
            </div>
          </div>

          <div className="hist-filters-actions">
            <button className="hist-btn-apply" onClick={handleApply}>
              <Search size={13} /> Filtrer
            </button>
            {hasFilters && (
              <button className="hist-btn-clear" onClick={handleClear}>
                Réinitialiser
              </button>
            )}
            {!loading && (
              <span className="hist-result-count">
                {total} résultat{total !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="hist-body">
          {loading ? (
            <div className="hist-loading">
              <Loader2 size={28} className="hist-spin" />
              Chargement de l'historique…
            </div>
          ) : transactions.length === 0 ? (
            <div className="hist-empty">
              <div className="hist-empty-icon"><History size={26} /></div>
              <p>{hasFilters ? 'Aucun résultat' : 'Aucune transaction'}</p>
              <span>{hasFilters ? 'Modifiez vos filtres.' : 'Les transactions apparaîtront ici.'}</span>
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
                            <Icon size={16} />
                          </div>
                          <div className="hist-row-info">
                            <div className="hist-row-top">
                              <span className="hist-type-label">{meta.label}</span>
                            </div>
                            <span className="hist-client-name">{client}</span>
                            {tx.description && (
                              <span className="hist-desc">{tx.description}</span>
                            )}
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
                  <button
                    className="hist-page-btn"
                    onClick={() => setPage(p => p - 1)}
                    disabled={page === 1}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="hist-page-info">Page {page} / {totalPages}</span>
                  <button
                    className="hist-page-btn"
                    onClick={() => setPage(p => p + 1)}
                    disabled={page === totalPages}
                  >
                    <ChevronRight size={16} />
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
              <AlertTriangle size={28} />
            </div>
            <h3>Supprimer l'historique ?</h3>
            <p>
              Cette action est irréversible. Toutes les transactions enregistrées
              seront définitivement effacées.
            </p>
            <div className="hist-confirm-actions">
              <button
                className="hist-btn-cancel"
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
              >
                Annuler
              </button>
              <button
                className="hist-btn-confirm-delete"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting
                  ? <Loader2 size={14} className="hist-spin" />
                  : <Trash2 size={14} />
                }
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
