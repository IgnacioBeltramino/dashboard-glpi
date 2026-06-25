import { useState, useEffect } from 'react'

const TECNICOS = ['Gaston Puca', 'Gonzalo Galarza', 'Ignacio Beltramino']

function matchTech(glpiName, target) {
  if (!glpiName) return false
  const n = glpiName.toLowerCase()
  return target.toLowerCase().split(' ').every(part => n.includes(part))
}

// Suma los tickets de `dayData` que correspondan a `tecnico`
function countFor(dayData, tecnico) {
  return Object.entries(dayData || {}).reduce((sum, [name, count]) => {
    return sum + (matchTech(name, tecnico) ? count : 0)
  }, 0)
}

function getMondayOfCurrentWeek() {
  const today = new Date()
  const day = today.getDay() // 0=Dom, 1=Lun, ..., 6=Sáb
  const diff = day === 0 ? -6 : 1 - day
  const d = new Date(today)
  d.setDate(today.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

function getDaysInRange(from, to) {
  const days = []
  const d = new Date(from + 'T12:00:00')
  const end = new Date(to + 'T12:00:00')
  while (d <= end) {
    days.push(d.toISOString().slice(0, 10))
    d.setDate(d.getDate() + 1)
  }
  return days
}

function formatDay(iso) {
  const date = new Date(iso + 'T12:00:00')
  const weekday = date.toLocaleDateString('es-AR', { weekday: 'short' })
  const [, m, d] = iso.split('-')
  return {
    weekday: weekday.charAt(0).toUpperCase() + weekday.slice(1, 3),
    date: `${d}/${m}`,
  }
}

function isWeekend(iso) {
  const day = new Date(iso + 'T12:00:00').getDay()
  return day === 0 || day === 6
}

export default function TicketsPorDia() {
  const today = new Date().toISOString().slice(0, 10)
  const defaultFrom = getMondayOfCurrentWeek()

  const [activeFrom, setActiveFrom] = useState(defaultFrom)
  const [activeTo, setActiveTo]   = useState(today)
  const [pendingFrom, setPendingFrom] = useState(defaultFrom)
  const [pendingTo, setPendingTo]     = useState(today)

  const [showRange, setShowRange] = useState(false)
  const [data, setData]           = useState(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [lastRefresh, setLastRefresh] = useState(null)

  const fetchData = async (from, to) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/soporte/closed-by-day?date_from=${from}&date_to=${to}`)
      if (!res.ok) throw new Error('Error al cargar datos')
      setData(await res.json())
      setActiveFrom(from)
      setActiveTo(to)
      setLastRefresh(new Date())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData(defaultFrom, today) }, [])

  const handleSearch = () => {
    fetchData(pendingFrom, pendingTo)
    setShowRange(false)
  }

  // ── construir tabla ────────────────────────────────────────────────────────
  const days = getDaysInRange(activeFrom, activeTo)
  const techs = TECNICOS

  const techTotals = {}
  techs.forEach(t => {
    techTotals[t] = days.reduce((s, d) => s + countFor(data?.[d], t), 0)
  })
  const grandTotal = Object.values(techTotals).reduce((a, b) => a + b, 0)

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title" style={{ marginBottom: 0 }}>Cerrados por Día</h1>
        </div>
        <div className="page-header-right">
          {lastRefresh && (
            <span className="refresh-time">
              {lastRefresh.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })}
            </span>
          )}
          <button
            className="btn"
            style={{ fontSize: 12, padding: '6px 14px' }}
            onClick={() => setShowRange(s => !s)}
          >
            {showRange ? '✕ Cerrar' : '📅 Rango'}
          </button>
          <button className="btn" onClick={() => fetchData(activeFrom, activeTo)}>
            ↻ Actualizar
          </button>
        </div>
      </div>

      {/* Range picker colapsable */}
      {showRange && (
        <div className="card pdd-range-bar">
          <div className="pdd-range-inner">
            <div className="pdd-filter-group">
              <label className="pdd-label">Desde</label>
              <input
                type="date"
                className="pdd-date-input"
                value={pendingFrom}
                onChange={e => setPendingFrom(e.target.value)}
              />
            </div>
            <div className="pdd-filter-group">
              <label className="pdd-label">Hasta</label>
              <input
                type="date"
                className="pdd-date-input"
                value={pendingTo}
                onChange={e => setPendingTo(e.target.value)}
              />
            </div>
            <button className="pdd-search-btn" onClick={handleSearch}>
              Buscar
            </button>
            <button
              className="pdd-preset-btn"
              style={{ alignSelf: 'flex-end' }}
              onClick={() => {
                const from = getMondayOfCurrentWeek()
                const to   = new Date().toISOString().slice(0, 10)
                setPendingFrom(from)
                setPendingTo(to)
                fetchData(from, to)
                setShowRange(false)
              }}
            >
              Semana actual
            </button>
          </div>
        </div>
      )}

      {error && <div className="error-banner">⚠ {error}</div>}

      {/* Tabla */}
      {loading ? (
        <div className="loading">Cargando…</div>
      ) : data !== null && (
        grandTotal === 0 ? (
          <div className="loading">Sin tickets cerrados en el período.</div>
        ) : (
          <div className="pdd-scroll">
            <table className="pdd-table">
              <thead>
                <tr>
                  <th className="pdd-th pdd-th-day">Día</th>
                  {techs.map(t => {
                    const parts = t.split(' ')
                    return (
                      <th key={t} className="pdd-th pdd-th-tech">
                        {parts[0]}
                        {parts.length > 1 && <><br /><span className="pdd-th-last">{parts.slice(1).join(' ')}</span></>}
                      </th>
                    )
                  })}
                  <th className="pdd-th pdd-th-total">Total</th>
                </tr>
              </thead>

              <tbody>
                {days.map(day => {
                  const dayData = data[day] || {}
                  const dayTotal = techs.reduce((s, t) => s + countFor(dayData, t), 0)
                  const weekend  = isWeekend(day)
                  const { weekday, date } = formatDay(day)
                  return (
                    <tr key={day} className={weekend ? 'pdd-weekend' : ''}>
                      <td className="pdd-td pdd-td-day">
                        <span className="pdd-weekday">{weekday}</span>
                        <span className="pdd-date">{date}</span>
                      </td>
                      {techs.map(t => {
                        const count = countFor(dayData, t)
                        return (
                          <td key={t} className="pdd-td pdd-td-count">
                            {count > 0
                              ? <span className="pdd-count">{count}</span>
                              : <span className="pdd-zero">—</span>}
                          </td>
                        )
                      })}
                      <td className="pdd-td pdd-td-total">
                        {dayTotal > 0 ? dayTotal : <span className="pdd-zero">—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>

              <tfoot>
                <tr className="pdd-foot-row">
                  <td className="pdd-td pdd-td-day pdd-foot-label">Total</td>
                  {techs.map(t => (
                    <td key={t} className="pdd-td pdd-td-count pdd-foot-count">
                      {techTotals[t] || 0}
                    </td>
                  ))}
                  <td className="pdd-td pdd-td-total pdd-foot-count">{grandTotal}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )
      )}

      <style>{`
        .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
        .page-header-left { display: flex; align-items: center; gap: 12px; }
        .page-header-right { display: flex; align-items: center; gap: 12px; }
        .refresh-time { font-size: 12px; color: var(--text-muted); }

        /* Range bar */
        .pdd-range-bar { padding: 16px 20px; margin-bottom: 20px; }
        .pdd-range-inner { display: flex; align-items: flex-end; gap: 16px; flex-wrap: wrap; }
        .pdd-filter-group { display: flex; flex-direction: column; gap: 6px; }
        .pdd-label { font-size: 11px; color: var(--text-muted); font-weight: 600; letter-spacing: 0.4px; text-transform: uppercase; }
        .pdd-date-input {
          background: var(--surface2); border: 1px solid var(--border); border-radius: 8px;
          color: var(--text); font-family: inherit; font-size: 13px;
          padding: 7px 10px; outline: none; transition: border-color 0.15s;
        }
        .pdd-date-input:focus { border-color: #404040; }
        .pdd-preset-btn {
          background: var(--surface2); color: var(--text); border: 1px solid var(--border);
          border-radius: 8px; font-family: inherit; font-size: 13px;
          font-weight: 500; padding: 7px 14px; cursor: pointer;
          transition: background 0.15s, color 0.15s; white-space: nowrap;
        }
        .pdd-preset-btn:hover { background: rgba(255,255,255,0.08); }
        .pdd-search-btn {
          background: var(--text); color: var(--bg); border: none;
          border-radius: 8px; font-family: inherit; font-size: 13px;
          font-weight: 600; padding: 8px 20px; cursor: pointer;
          transition: opacity 0.15s; align-self: flex-end;
        }
        .pdd-search-btn:hover { opacity: 0.85; }

        /* Scroll wrapper — tabla puede ser ancha */
        .pdd-scroll { overflow-x: auto; border-radius: var(--radius); border: 1px solid var(--border); }

        /* Tabla */
        .pdd-table { width: 100%; border-collapse: collapse; font-size: 13px; }

        .pdd-th {
          padding: 11px 18px;
          background: var(--surface);
          border-bottom: 1px solid var(--border);
          font-size: 11px; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.4px;
          color: var(--text-muted);
          white-space: nowrap;
        }
        .pdd-th-day { text-align: left; position: sticky; left: 0; z-index: 2; }
        .pdd-th-tech { text-align: center; color: var(--text); font-size: 12px; text-transform: none; letter-spacing: 0; line-height: 1.3; }
        .pdd-th-last { font-weight: 400; color: var(--text-muted); }
        .pdd-th-total {
          text-align: center;
          border-left: 1px solid var(--border);
        }

        .pdd-td {
          border-bottom: 1px solid rgba(255,255,255,0.04);
          vertical-align: middle;
        }
        .pdd-td-day {
          padding: 8px 16px;
          background: var(--surface);
          position: sticky; left: 0; z-index: 1;
          display: flex; flex-direction: column; gap: 1px;
          min-width: 64px;
        }
        .pdd-weekday { font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.3px; }
        .pdd-date    { font-size: 13px; font-weight: 600; color: var(--text); }

        .pdd-td-count { text-align: center; padding: 8px 18px; }
        .pdd-td-total {
          text-align: center; padding: 8px 18px;
          border-left: 1px solid var(--border);
          font-weight: 600; color: var(--text);
        }

        .pdd-count {
          display: inline-flex; align-items: center; justify-content: center;
          width: 30px; height: 30px; border-radius: 8px;
          background: rgba(79,142,247,0.12); color: #6aa8ff;
          font-weight: 700; font-size: 15px;
        }
        .pdd-zero { color: var(--text-muted); opacity: 0.35; }

        /* Fines de semana */
        .pdd-weekend .pdd-date,
        .pdd-weekend .pdd-weekday { opacity: 0.4; }
        .pdd-weekend .pdd-count   { background: rgba(79,142,247,0.06); }

        /* Footer */
        .pdd-foot-row .pdd-td { border-top: 1px solid var(--border); border-bottom: none; background: var(--surface2); }
        .pdd-foot-label { font-weight: 700; color: var(--text); }
        .pdd-foot-count { font-size: 15px; font-weight: 700; color: var(--text); }
      `}</style>
    </div>
  )
}
