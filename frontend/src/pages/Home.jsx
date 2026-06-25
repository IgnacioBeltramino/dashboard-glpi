import { useState } from "react"

const GLPI_BASE = "https://tickets.msm.gov.ar"
const ticketUrl = (id) => GLPI_BASE + "/index.php?redirect=/front/ticket.form.php?id=" + id

function formatTime(iso) {
  if (!iso) return ""
  const d = new Date(iso.replace(" ", "T"))
  return d.toLocaleString("es-AR", {
    day: "2-digit", month: "2-digit",
    hour: "2-digit", minute: "2-digit",
  })
}

function NotifCard({ notif, onDismiss }) {
  const isFollowup = notif.type === "new_followup"
  const key = notif.type + "-" + notif.id
  const accent = isFollowup ? "#fbbf24" : "#60a5fa"
  return (
    <div className="nc card" style={{ "--nc": accent }}>
      <div className="nc-top">
        <span className="nc-dot" />
        <span className="nc-time">{formatTime(notif.receivedAt)}</span>
        <button className="nc-x" onClick={() => onDismiss(key)}>&times;</button>
      </div>
      {isFollowup ? (
        <>
          <div className="nc-title"><span className="nc-id">#{notif.ticket_id}</span> {notif.ticket_title}</div>
          <div className="nc-author">Por: <strong>{notif.author}</strong></div>
          {notif.content && (
            <div className="nc-body">{notif.content.replace(/<[^>]*>/g, "").slice(0, 250)}</div>
          )}
          <a href={ticketUrl(notif.ticket_id)} target="_blank" rel="noreferrer" className="nc-link">Ir al ticket &rarr;</a>
        </>
      ) : (
        <>
          <div className="nc-title"><span className="nc-id">#{notif.id}</span> {notif.title}</div>
          {notif.opened_at && <div className="nc-author">Apertura: {formatTime(notif.opened_at)}</div>}
          <a href={ticketUrl(notif.id)} target="_blank" rel="noreferrer" className="nc-link">Ir al ticket &rarr;</a>
        </>
      )}
    </div>
  )
}

function Column({ title, accent, notifications, onDismiss, emptyMsg }) {
  return (
    <div>
      <div className="col-title-row" style={{ "--accent": accent }}>
        <span className="col-title">{title}</span>
        <span className="badge">{notifications.length}</span>
      </div>
      {notifications.length === 0
        ? <div className="col-empty">{emptyMsg}</div>
        : <div className="nc-list">{notifications.map(n => (
            <NotifCard key={n.type + "-" + n.id} notif={n} onDismiss={onDismiss} />
          ))}</div>
      }
    </div>
  )
}

function CatchUpCard({ event }) {
  const isFollowup = event.type === "new_followup"
  const accent = isFollowup ? "#fbbf24" : "#60a5fa"
  return (
    <div className="nc card" style={{ "--nc": accent }}>
      <div className="nc-top">
        <span className="nc-dot" />
        {isFollowup && <span className="nc-time">{event.author}</span>}
      </div>
      {isFollowup ? (
        <>
          <div className="nc-title"><span className="nc-id">#{event.ticket_id}</span> {event.ticket_title}</div>
          {event.content && (
            <div className="nc-body">{event.content.replace(/<[^>]*>/g, "").slice(0, 200)}</div>
          )}
        </>
      ) : (
        <div className="nc-title"><span className="nc-id">#{event.id}</span> {event.title}</div>
      )}
      <a href={ticketUrl(isFollowup ? event.ticket_id : event.id)} target="_blank" rel="noreferrer" className="nc-link">Ir al ticket &rarr;</a>
    </div>
  )
}

function CatchUpSection({ data, onDismiss }) {
  const [collapsed, setCollapsed] = useState(false)
  if (!data) return null
  const total = data.tickets.length + data.followups.length
  return (
    <div className="cu-wrap">
      <div className="cu-header" onClick={() => setCollapsed(c => !c)}>
        <div className="cu-header-left">
          <span className="cu-dot" />
          <span className="cu-title">Mientras no estabas</span>
          <span className="badge">{total}</span>
          <span className="cu-period">desde {formatTime(data.since)}</span>
        </div>
        <div className="cu-header-right">
          <span className="cu-chevron">{collapsed ? "v" : "^"}</span>
          <button className="nc-x" onClick={(e) => { e.stopPropagation(); onDismiss() }}>&times;</button>
        </div>
      </div>
      {!collapsed && (
        <div className="cu-body">
          {data.followups.length > 0 && (
            <div>
              <div className="col-title-row" style={{ "--accent": "#fbbf24" }}>
                <span className="col-title">Seguimientos</span>
                <span className="badge">{data.followups.length}</span>
              </div>
              <div className="nc-list">
                {data.followups.map(f => <CatchUpCard key={"cu-f-" + f.id} event={f} />)}
              </div>
            </div>
          )}
          {data.tickets.length > 0 && (
            <div>
              <div className="col-title-row" style={{ "--accent": "#60a5fa" }}>
                <span className="col-title">Tickets nuevos</span>
                <span className="badge">{data.tickets.length}</span>
              </div>
              <div className="nc-list">
                {data.tickets.map(t => <CatchUpCard key={"cu-t-" + t.id} event={t} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Home({ notifications, onDismiss, onRefresh, catchUp, onDismissCatchUp }) {
  const [lastRefresh, setLastRefresh] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    await onRefresh()
    setLastRefresh(new Date())
    setRefreshing(false)
  }

  const followups = notifications.filter(n => n.type === "new_followup")
  const tickets   = notifications.filter(n => n.type === "new_ticket")

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title" style={{ marginBottom: 0 }}>Notificaciones</h1>
        </div>
        <div className="page-header-right">
          {lastRefresh && (
            <span className="refresh-time">
              {lastRefresh.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false })}
            </span>
          )}
          <button className="btn" onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? "..." : "Actualizar"}
          </button>
        </div>
      </div>

      <CatchUpSection data={catchUp} onDismiss={onDismissCatchUp} />

      <div className="notif-grid">
        <Column title="Seguimientos"   accent="#fbbf24" notifications={followups} onDismiss={onDismiss} emptyMsg="Sin seguimientos nuevos." />
        <Column title="Tickets nuevos" accent="#60a5fa" notifications={tickets}   onDismiss={onDismiss} emptyMsg="Sin tickets nuevos." />
      </div>

      <style>{`
        .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
        .page-header-left { display: flex; align-items: center; gap: 12px; }
        .page-header-right { display: flex; align-items: center; gap: 12px; }
        .refresh-time { font-size: 12px; color: var(--text-muted); }
        .notif-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; }

        .col-title-row { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid var(--accent); }
        .col-title { font-size: 15px; font-weight: 700; color: var(--text); flex: 1; }
        .col-empty { color: var(--text-muted); font-size: 13px; padding: 16px 0; }
        .nc-list { display: flex; flex-direction: column; gap: 10px; }

        .nc { border-left: 3px solid var(--nc) !important; padding: 14px 16px; cursor: default; }
        .nc-top { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
        .nc-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--nc); flex-shrink: 0; }
        .nc-time { font-size: 11px; color: var(--text-muted); flex: 1; }
        .nc-x { background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 11px; padding: 0; line-height: 1; }
        .nc-x:hover { color: #f87171; }
        .nc-title { font-weight: 600; font-size: 13px; color: var(--text); line-height: 1.4; margin-bottom: 5px; }
        .nc-id { color: var(--nc); }
        .nc-author { font-size: 12px; color: var(--text-muted); margin-bottom: 8px; }
        .nc-body { font-size: 12px; color: var(--text-muted); background: rgba(255,255,255,0.04); border-radius: 8px; padding: 8px 10px; line-height: 1.6; border: 1px solid var(--border); margin-bottom: 8px; }
        .nc-link { display: inline-block; margin-top: 10px; font-size: 12px; color: var(--nc); opacity: 0.7; transition: opacity 0.15s; }
        .nc-link:hover { opacity: 1; }

        .cu-wrap { margin-bottom: 28px; border: 1px solid rgba(251,191,36,0.3); border-radius: var(--radius); background: rgba(251,191,36,0.04); overflow: hidden; }
        .cu-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; cursor: pointer; gap: 12px; user-select: none; }
        .cu-header:hover { background: rgba(251,191,36,0.07); }
        .cu-header-left { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
        .cu-header-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
        .cu-dot { width: 8px; height: 8px; border-radius: 50%; background: #fbbf24; flex-shrink: 0; }
        .cu-title { font-size: 13px; font-weight: 700; color: #fbbf24; white-space: nowrap; }
        .cu-period { font-size: 11px; color: var(--text-muted); }
        .cu-chevron { font-size: 10px; color: var(--text-muted); }
        .cu-body { padding: 20px; display: flex; flex-direction: column; gap: 24px; border-top: 1px solid rgba(251,191,36,0.15); }

        @media (max-width: 700px) { .notif-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  )
}
