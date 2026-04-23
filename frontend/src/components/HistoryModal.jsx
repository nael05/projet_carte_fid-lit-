import React, { useState, useEffect, useCallback } from 'react'
import { X, Search, Calendar, Filter, Trash2, ChevronLeft, ChevronRight, AlertTriangle, Loader2 } from 'lucide-react'
import api from '../api'
import './HistoryModal.css'

const TYPE_LABELS = {
  add_points:    { label: 'Points ajoutés',  color: 'hist-badge-add' },
  redeem_reward: { label: 'Cadeau utilisé',  color: 'hist-badge-redeem' },
  remove_points: { label: 'Points retirés',  color: 'hist-badge-remove' },
  add_stamps:    { label: 'Tampons ajoutés', color: 'hist-badge-add' },
}

function formatDay(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function groupByDay(transactions) {
  const groups = {}
  for (const tx of transactions) {
    const day = tx.created_at.slice(0, 10)
    if (!groups[day]) groups[day] = []
    groups[day].push(tx)
  }
  return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a))
}

export default function HistoryModal({ onClose }) {
  const [transactions, setTransactions]   = useState([])
  const [total, setTotal]                 = useState(0)
  const [page, setPage]                   = useState(1)
  const [loading, setLoading]             = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting]           = useState(false)

  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    clientName: '',
    type: '',
  })
  const [appliedFilters, setAppliedFilters] = useState(filters)

  const fetchHistory = useCallback(async (f, p) => {
    setLoading(true)
    try {
      const params = { page: p, ...Object.fromEntries(Object.entries(f).filter(([, v]) => v !== '')) }
      const { data } = await api.get('/pro/history', { params })
      setTransactions(data.transactions)
      setTotal(data.total)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchHistory(appliedFilters, page) }, [appliedFilters, page, fetchHistory])

  const handleSearch = () => { setPage(1); setAppliedFilters(filters) }
  const handleReset  = () => {
    const empty = { dateFrom: '', dateTo: '', clientName: '', type: '' }
    setFilters(empty); setPage(1); setAppliedFilters(empty)
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await api.delete('/pro/history')
      setTransactions([])
      setTotal(0)
      setConfirmDelete(false)
    } catch {
      // silent
    } finally {
      setDeleting(false)
    }
  }

  const totalPages = Math.ceil(total / 100)
  const grouped    = groupByDay(transactions)

  return (
    <div className="hist-overlay">
      <div className="hist-modal">

        {/* Header */}
        <div className="hist-header">
          <div className="hist-header-left">
            <h2>Historique des points &amp; cadeaux</h2>
            <span className="hist-subtitle">{total} transaction{total !== 1 ? 's' : ''} — 6 derniers mois</span>
          </div>
          <button className="hist-close" onClick={onClose}><X size={20} /></button>
        </div>

        {/* Filters */}
        <div className="hist-filters">
          <div className="hist-filter-row">
            <div className="hist-filter-group">
              <Calendar size={14} />
              <input
                type="date"
                value={filters.dateFrom}
                onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
                placeholder="Du"
              />
            </div>
            <div className="hist-filter-group">
              <Calendar size={14} />
              <input
                type="date"
                value={filters.dateTo}
                onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))}
                placeholder="Au"
              />
            </div>
            <div className="hist-filter-group hist-filter-client">
              <Search size={14} />
              <input
                type="text"
                value={filters.clientName}
                onChange={e => setFilters(f => ({ ...f, clientName: e.target.value }))}
                placeholder="Nom du client"
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="hist-filter-group">
              <Filter size={14} />
              <select value={filters.type} onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}>
                <option value="">Tout</option>
                <option value="add_points">Points ajoutés</option>
                <option value="redeem_reward">Cadeau utilisé</option>
                <option value="remove_points">Points retirés</option>
              </select>
            </div>
          </div>
          <div className="hist-filter-actions">
            <button className="hist-btn-search" onClick={handleSearch}><Search size={14} /> Rechercher</button>
            <button className="hist-btn-reset"  onClick={handleReset}>Réinitialiser</button>
            <button className="hist-btn-delete" onClick={() => setConfirmDelete(true)}><Trash2 size={14} /> Supprimer l'historique</button>
          </div>
        </div>

        {/* Body */}
        <div className="hist-body">
          {loading ? (
            <div className="hist-loading"><Loader2 size={24} className="hist-spin" /></div>
          ) : transactions.length === 0 ? (
            <div className="hist-empty">Aucune transaction trouvée</div>
          ) : (
            grouped.map(([day, txs]) => (
              <div key={day} className="hist-day-group">
                <div className="hist-day-label">{formatDay(day)}</div>
                {txs.map(tx => {
                  const meta = TYPE_LABELS[tx.type] || { label: tx.type, color: 'hist-badge-default' }
                  const clientName = tx.prenom || tx.nom
                    ? `${tx.prenom ?? ''} ${tx.nom ?? ''}`.trim()
                    : 'Client supprimé'
                  const sign = tx.points_change > 0 ? '+' : ''
                  return (
                    <div key={tx.id} className="hist-row">
                      <div className="hist-row-left">
                        <span className={`hist-badge ${meta.color}`}>{meta.label}</span>
                        <span className="hist-client">{clientName}</span>
                        {tx.description && <span className="hist-desc">{tx.description}</span>}
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
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="hist-pagination">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft size={16} /></button>
            <span>Page {page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}><ChevronRight size={16} /></button>
          </div>
        )}
      </div>

      {/* Confirm delete */}
      {confirmDelete && (
        <div className="hist-confirm-overlay">
          <div className="hist-confirm-box">
            <AlertTriangle size={32} className="hist-confirm-icon" />
            <h3>Supprimer tout l'historique ?</h3>
            <p>Cette action est irréversible. Toutes les transactions enregistrées seront définitivement effacées.</p>
            <div className="hist-confirm-actions">
              <button className="hist-confirm-cancel" onClick={() => setConfirmDelete(false)} disabled={deleting}>Annuler</button>
              <button className="hist-confirm-ok" onClick={handleDelete} disabled={deleting}>
                {deleting ? <Loader2 size={14} className="hist-spin" /> : <Trash2 size={14} />} Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
