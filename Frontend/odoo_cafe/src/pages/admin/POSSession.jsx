import {
  Banknote,
  CalendarClock,
  CreditCard,
  Eye,
  IndianRupee,
  PlayCircle,
  ReceiptText,
  StopCircle,
  Wallet,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { joinSocketRoom } from '../../api/socketClient'
import { closePosSession, getAdminPosSessions } from '../../api/posSessionsApi'
import { formatCurrency } from '../../utils/formatCurrency'

const statusStyles = {
  Open: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  Closed: 'bg-slate-100 text-slate-600 ring-slate-200',
}

const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '-'

const toNumber = (value) => Number(value || 0)
const sessionsPerPage = 6

const isWithinLastWeek = (value) => {
  if (!value) return false
  const sessionDate = new Date(value)
  if (Number.isNaN(sessionDate.getTime())) return false
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  return sessionDate >= sevenDaysAgo
}

const normalizeSession = (session) => ({
  id: session.id,
  sessionNo: `SESSION-${session.id}`,
  status: session.status === 'OPEN' ? 'Open' : 'Closed',
  openedAt: session.opening_time,
  closedAt: session.closing_time,
  openedBy: session.employee_name || '-',
  openingCash: toNumber(session.opening_amount),
  closingCash: toNumber(session.closing_amount),
  closingSaleAmount: toNumber(session.closing_amount || session.total_sales),
  cashSales: toNumber(session.cash_sales),
  upiSales: toNumber(session.upi_sales),
  cardSales: toNumber(session.card_sales),
  orderAmount: toNumber(session.orders_total_amount),
  orders: Number(session.orders_count || 0),
})

const SummaryCard = ({ label, value, icon: Icon, iconClass }) => (
  <article className="rounded-lg border border-slate-200 bg-white p-3">
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-bold text-slate-500">{label}</p>
        <p className="mt-2 text-xl font-black text-slate-950">{value}</p>
      </div>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ring-1 ${iconClass}`}>
        <Icon className="h-5 w-5" />
      </span>
    </div>
  </article>
)

const ModalShell = ({ title, children, onClose, size = 'max-w-2xl' }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
    <div className={`max-h-[92vh] w-full overflow-hidden rounded-lg bg-white shadow-2xl ${size}`}>
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <h2 className="text-lg font-black text-slate-950">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-3 py-2 text-sm font-black text-slate-500 hover:bg-slate-100 hover:text-slate-900"
        >
          Close
        </button>
      </div>
      <div className="max-h-[calc(92vh-64px)] overflow-auto p-5">{children}</div>
    </div>
  </div>
)

const POSSession = () => {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState([])
  const [selectedSession, setSelectedSession] = useState(null)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const loadSessions = async (showLoader = true) => {
    try {
      if (showLoader) setIsLoading(true)
      setError('')
      const response = await getAdminPosSessions()
      setSessions((response.data.sessions || []).map(normalizeSession))
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load POS sessions.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadSessions()

    const refreshTimer = window.setInterval(() => {
      loadSessions(false)
    }, 15000)

    const socket = joinSocketRoom('admin')
    const refreshSessions = () => loadSessions(false)

    socket.off('admin:sessionUpdated', refreshSessions)
    socket.on('admin:sessionUpdated', refreshSessions)

    return () => {
      window.clearInterval(refreshTimer)
      socket.off('admin:sessionUpdated', refreshSessions)
    }
  }, [])

  const recentSessions = useMemo(
    () => sessions.filter((session) => session.status === 'Open' || isWithinLastWeek(session.openedAt)),
    [sessions],
  )

  const totalPages = Math.max(1, Math.ceil(recentSessions.length / sessionsPerPage))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const paginatedSessions = recentSessions.slice(
    (safeCurrentPage - 1) * sessionsPerPage,
    safeCurrentPage * sessionsPerPage,
  )

  const goToPage = (page) => {
    setCurrentPage(Math.min(Math.max(page, 1), totalPages))
  }

  useEffect(() => {
    setCurrentPage(1)
  }, [recentSessions.length])

  const openSession = recentSessions.find((session) => session.status === 'Open')
  const lastClosedSession = recentSessions.find((session) => session.status === 'Closed')

  const summaryCards = useMemo(() => {
    const currentSales = openSession ? openSession.orderAmount : 0

    return [
      {
        label: 'Last Open Session Date',
        value: openSession ? formatDateTime(openSession.openedAt) : '-',
        icon: CalendarClock,
        iconClass: 'bg-[#fff3e8] text-[#9a5a2e] ring-[#fcd8b8]',
      },
      {
        label: 'Last Closing Sale',
        value: formatCurrency(lastClosedSession?.closingSaleAmount || 0),
        icon: IndianRupee,
        iconClass: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
      },
      {
        label: 'Current Session Sale',
        value: formatCurrency(currentSales),
        icon: ReceiptText,
        iconClass: 'bg-violet-50 text-violet-600 ring-violet-100',
      },
      {
        label: 'Current Orders',
        value: openSession?.orders || 0,
        icon: Wallet,
        iconClass: 'bg-amber-50 text-amber-600 ring-amber-100',
      },
    ]
  }, [lastClosedSession, openSession])

  const handleOpenTerminal = () => {
    navigate('/pos')
  }

  const handleCloseSession = async () => {
    if (!openSession) return

    const closingSaleAmount =
      openSession.cashSales + openSession.upiSales + openSession.cardSales
    try {
      setIsSaving(true)
      setError('')
      await closePosSession(openSession.id, closingSaleAmount)
      const closedSession = {
        ...openSession,
        status: 'Closed',
        closedAt: new Date().toISOString(),
        closingSaleAmount,
      }
      setSelectedSession(closedSession)
      setSummaryOpen(true)
      await loadSessions()
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to close session.')
    } finally {
      setIsSaving(false)
    }
  }

  const viewSummary = (session) => {
    setSelectedSession(session)
    setSummaryOpen(true)
  }

  return (
    <div className="min-h-screen">
      {error ? (
        <div className="mb-3 rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <SummaryCard key={card.label} {...card} />
        ))}
      </div>

      <section className="mt-5 rounded-lg border border-slate-100 bg-white p-3">
        <div className="rounded-lg bg-slate-50 p-4 ring-1 ring-slate-100">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase text-slate-500">POS Terminal</p>
              <h3 className="mt-1 text-xl font-black text-slate-950">
                {openSession ? openSession.sessionNo : 'No open session'}
              </h3>
              <p className="mt-2 text-sm font-semibold text-slate-500">
                {openSession
                  ? `Opened by ${openSession.openedBy} on ${formatDateTime(openSession.openedAt)}`
                  : 'Open a new session to launch the POS terminal.'}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleOpenTerminal}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg  px-4 text-sm font-black text-white bg-[#9a5a2e]"
              >
                <PlayCircle className="h-4 w-4" />
                Open Session
              </button>
              <button
                type="button"
                onClick={handleCloseSession}
                disabled={!openSession || isSaving}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-black text-white bg-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <StopCircle className="h-4 w-4" />
                {isSaving ? 'Closing...' : 'Close Session'}
              </button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="mt-5 rounded-lg border border-[#fcd8b8] bg-[#fff3e8] px-4 py-3 text-sm font-bold text-[#9a5a2e]">
            Loading sessions...
          </div>
        ) : null}

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {paginatedSessions.map((session) => {
            const totalSale =
              session.status === 'Open'
                ? session.orderAmount
                : session.closingSaleAmount

            return (
              <article key={session.id} className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase text-slate-500">Session</p>
                    <h3 className="mt-1 text-lg font-black text-slate-950">{session.sessionNo}</h3>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${statusStyles[session.status]}`}>
                    {session.status}
                  </span>
                </div>

                <div className="mt-4 grid gap-2">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs font-black uppercase text-slate-500">Opened At</p>
                    <p className="mt-1 text-sm font-black text-slate-950">
                      {formatDateTime(session.openedAt)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs font-black uppercase text-slate-500">Closed At</p>
                    <p className="mt-1 text-sm font-black text-slate-950">
                      {formatDateTime(session.closedAt)}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-xs font-black uppercase text-slate-500">Orders</p>
                      <p className="mt-1 text-sm font-black text-slate-950">{session.orders}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-xs font-black uppercase text-slate-500">Sale</p>
                      <p className="mt-1 text-sm font-black text-slate-950">
                        {formatCurrency(totalSale)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex justify-end border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={() => viewSummary(session)}
                    className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-black text-[#9a5a2e] hover:bg-[#fff3e8]"
                  >
                    <Eye className="h-4 w-4" />
                    View Summary
                  </button>
                </div>
              </article>
            )
          })}
        </div>

        {!isLoading && recentSessions.length === 0 ? (
          <div className="mt-5 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
            <CalendarClock className="mx-auto h-9 w-9 text-slate-400" />
            <h3 className="mt-3 text-base font-black text-slate-900">No sessions found</h3>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              Open a POS session to start tracking shift sales.
            </p>
          </div>
        ) : null}

        {!isLoading && recentSessions.length > 0 ? (
          <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-bold text-slate-500">
              Showing {(safeCurrentPage - 1) * sessionsPerPage + 1}-
              {Math.min(safeCurrentPage * sessionsPerPage, recentSessions.length)} of {recentSessions.length}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => goToPage(safeCurrentPage - 1)}
                disabled={safeCurrentPage === 1}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Prev
              </button>
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => goToPage(page)}
                  className={`h-9 min-w-9 rounded-lg px-3 text-xs font-black ${
                    page === safeCurrentPage
                      ? 'bg-[#c8793f] text-white'
                      : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                type="button"
                onClick={() => goToPage(safeCurrentPage + 1)}
                disabled={safeCurrentPage === totalPages}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {summaryOpen && selectedSession ? (
        <ModalShell title="Closing Summary" onClose={() => setSummaryOpen(false)}>
          <div className="space-y-4">
            <div className="rounded-lg bg-[#fff3e8] p-4 ring-1 ring-[#fcd8b8]">
              <p className="text-xs font-black uppercase text-[#9a5a2e]">Session</p>
              <h3 className="mt-1 text-xl font-black text-slate-950">
                {selectedSession.sessionNo}
              </h3>
              <p className="mt-2 text-sm font-semibold text-[#9a5a2e]">
                {formatDateTime(selectedSession.openedAt)} - {formatDateTime(selectedSession.closedAt)}
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {[
                ['Opening Cash', formatCurrency(selectedSession.openingCash), Banknote],
                ['Cash Sales', formatCurrency(selectedSession.cashSales), Banknote],
                ['UPI Sales', formatCurrency(selectedSession.upiSales), Wallet],
                ['Card Sales', formatCurrency(selectedSession.cardSales), CreditCard],
                ['Total Orders', selectedSession.orders, ReceiptText],
                [
                  'Closing Sale Amount',
                  formatCurrency(
                    selectedSession.closingSaleAmount ||
                      selectedSession.orderAmount ||
                      selectedSession.cashSales + selectedSession.upiSales + selectedSession.cardSales,
                  ),
                  IndianRupee,
                ],
              ].map(([label, value, Icon]) => (
                <div key={label} className="rounded-lg bg-slate-50 p-3">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-[#9a5a2e]" />
                    <p className="text-xs font-black uppercase text-slate-500">{label}</p>
                  </div>
                  <p className="mt-2 text-base font-black text-slate-950">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </ModalShell>
      ) : null}
    </div>
  )
}

export default POSSession
