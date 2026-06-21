import {
  CheckCircle2,
  ChefHat,
  Clock3,
  Flame,
  Loader2,
  RefreshCw,
  Table2,
  Timer,
  Utensils,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  completeKitchenItem,
  completeKitchenOrder,
  getKitchenOrders,
  startKitchenOrder,
} from '../../api/kdsApi'
import { joinSocketRoom } from '../../api/socketClient'
import { useGlobalSearch } from '../../context/GlobalSearchContext.jsx'

const statusStyles = {
  TO_COOK: 'bg-amber-50 text-amber-700 ring-amber-100',
  PREPARING: 'bg-sky-50 text-sky-700 ring-sky-100',
  COMPLETED: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
}

const itemStatusStyles = {
  TO_COOK: 'bg-amber-100 text-amber-700',
  PREPARING: 'bg-sky-100 text-sky-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
}

const toNumber = (value) => Number(value || 0)
const kdsOrdersPerPage = 6

const formatTime = (value) =>
  value
    ? new Date(value).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '-'

const getElapsedMinutes = (value) => {
  if (!value) return 0
  const diff = Date.now() - new Date(value).getTime()
  return Math.max(0, Math.floor(diff / 60000))
}

const formatStatus = (status) =>
  ({
    TO_COOK: 'To Cook',
    PREPARING: 'Preparing',
    COMPLETED: 'Completed',
  })[status] || status

const normalizeOrder = (order) => ({
  id: order.id,
  orderNo: order.order_number || `ORD-${order.id}`,
  table: order.table_number ? `T${order.table_number}` : '-',
  floor: order.floor_name || '-',
  customer: order.customer_name || 'Walk-in',
  status: order.status,
  createdAt: order.created_at,
  totalAmount: toNumber(order.total_amount),
  items: (order.items || []).map((item) => ({
    id: item.id,
    name: item.product_name || '-',
    quantity: toNumber(item.quantity),
    note: item.notes || item.product_description || '',
    status: item.status,
  })),
})

const SummaryCard = ({ label, value, icon: Icon, iconClass }) => (
  <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/50">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-bold text-slate-500">{label}</p>
        <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
      </div>
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${iconClass}`}>
        <Icon className="h-5 w-5" />
      </span>
    </div>
  </article>
)

const KDS = () => {
  const [orders, setOrders] = useState([])
  const [statusFilter, setStatusFilter] = useState('All')
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingId, setIsSavingId] = useState(null)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const { searchQuery } = useGlobalSearch()

  const loadOrders = async (showLoader = true) => {
    try {
      if (showLoader) setIsLoading(true)
      setError('')
      const response = await getKitchenOrders()
      setOrders((response.data.orders || []).map(normalizeOrder))
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load kitchen orders.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const loadInitialOrders = async () => {
      try {
        setError('')
        const response = await getKitchenOrders()
        setOrders((response.data.orders || []).map(normalizeOrder))
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load kitchen orders.')
      } finally {
        setIsLoading(false)
      }
    }

    loadInitialOrders()
    const refreshTimer = window.setInterval(() => {
      loadOrders(false)
    }, 15000)

    return () => window.clearInterval(refreshTimer)
  }, [])

  useEffect(() => {
    const socket = joinSocketRoom('kitchen')
    const refreshKitchenOrders = () => {
      loadOrders(false)
    }

    socket.off('kitchen:newOrder', refreshKitchenOrders)
    socket.off('kitchen:orderUpdated', refreshKitchenOrders)
    socket.on('kitchen:newOrder', refreshKitchenOrders)
    socket.on('kitchen:orderUpdated', refreshKitchenOrders)

    return () => {
      socket.off('kitchen:newOrder', refreshKitchenOrders)
      socket.off('kitchen:orderUpdated', refreshKitchenOrders)
    }
  }, [])

  const stats = useMemo(() => {
    const toCook = orders.filter((order) => order.status === 'TO_COOK').length
    const preparing = orders.filter((order) => order.status === 'PREPARING').length
    const items = orders.reduce((sum, order) => sum + order.items.length, 0)

    return [
      {
        label: 'Active Orders',
        value: orders.length,
        icon: ChefHat,
        iconClass: 'bg-[#fff3e8] text-[#9a5a2e] ring-[#fcd8b8]',
      },
      {
        label: 'To Cook',
        value: toCook,
        icon: Flame,
        iconClass: 'bg-amber-50 text-amber-600 ring-amber-100',
      },
      {
        label: 'Preparing',
        value: preparing,
        icon: Loader2,
        iconClass: 'bg-sky-50 text-sky-600 ring-sky-100',
      },
      {
        label: 'Items In Queue',
        value: items,
        icon: Utensils,
        iconClass: 'bg-violet-50 text-violet-600 ring-violet-100',
      },
    ]
  }, [orders])

  const filteredOrders = useMemo(() => {
    const search = searchQuery.trim().toLowerCase()

    return orders
      .filter((order) => {
        const haystack = `${order.orderNo} ${order.table} ${order.floor} ${order.customer} ${order.status} ${order.items
          .map((item) => item.name)
          .join(' ')}`.toLowerCase()
        return haystack.includes(search)
      })
      .filter((order) => statusFilter === 'All' || order.status === statusFilter)
  }, [orders, searchQuery, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / kdsOrdersPerPage))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const paginatedOrders = filteredOrders.slice(
    (safeCurrentPage - 1) * kdsOrdersPerPage,
    safeCurrentPage * kdsOrdersPerPage,
  )

  const goToPage = (page) => {
    setCurrentPage(Math.min(Math.max(page, 1), totalPages))
  }

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter])

  const runAction = async (id, action) => {
    try {
      setIsSavingId(id)
      setError('')
      await action(id)
      await loadOrders(false)
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update kitchen order.')
    } finally {
      setIsSavingId(null)
    }
  }

  return (
    <div className="min-h-screen space-y-5">
      {error ? (
        <div className="rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((card) => (
          <SummaryCard key={card.label} {...card} />
        ))}
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/50">
        <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-950">Kitchen Display System</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Track live kitchen orders and move items through preparation.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-[#c8793f] focus:ring-2 focus:ring-[#fcd8b8]"
            >
              <option value="All">All Orders</option>
              <option value="TO_COOK">To Cook</option>
              <option value="PREPARING">Preparing</option>
              <option value="COMPLETED">Completed</option>
            </select>
            <button
              type="button"
              onClick={() => loadOrders()}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-black text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="mt-4 rounded-lg border border-[#fcd8b8] bg-[#fff3e8] px-4 py-3 text-sm font-bold text-[#9a5a2e]">
            Loading kitchen orders...
          </div>
        ) : null}

        {!isLoading && filteredOrders.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
            <ChefHat className="mx-auto h-10 w-10 text-slate-400" />
            <h3 className="mt-3 text-base font-black text-slate-900">No kitchen orders</h3>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              Orders sent to kitchen will appear here.
            </p>
          </div>
        ) : null}

        <div className="mt-4 grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {paginatedOrders.map((order) => (
            <article key={order.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/50">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-black text-slate-950">{order.orderNo}</h3>
                    <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${statusStyles[order.status]}`}>
                      {formatStatus(order.status)}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <Table2 className="h-3.5 w-3.5" />
                      {order.floor} / {order.table}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="h-3.5 w-3.5" />
                      {formatTime(order.createdAt)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Timer className="h-3.5 w-3.5" />
                      {getElapsedMinutes(order.createdAt)} min
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {order.items.map((item) => (
                  <div key={item.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-black text-slate-950">
                          {item.quantity} x {item.name}
                        </p>
                        {item.note ? (
                          <p className="mt-1 line-clamp-2 text-xs font-semibold text-slate-500">{item.note}</p>
                        ) : null}
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black ${itemStatusStyles[item.status]}`}>
                        {formatStatus(item.status)}
                      </span>
                    </div>
                    {item.status !== 'COMPLETED' ? (
                      <button
                        type="button"
                        disabled={isSavingId === item.id}
                        onClick={() => runAction(item.id, completeKitchenItem)}
                        className="mt-3 inline-flex h-8 items-center gap-2 rounded-lg bg-emerald-50 px-3 text-xs font-black text-emerald-700 hover:bg-emerald-100 disabled:cursor-wait disabled:opacity-60"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Complete Item
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  disabled={order.status !== 'TO_COOK' || isSavingId === order.id}
                  onClick={() => runAction(order.id, startKitchenOrder)}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#fff3e8] px-3 text-xs font-black text-[#9a5a2e] hover:bg-[#fcd8b8] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Flame className="h-4 w-4" />
                  Start
                </button>
                <button
                  type="button"
                  disabled={isSavingId === order.id}
                  onClick={() => runAction(order.id, completeKitchenOrder)}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 text-xs font-black text-white hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Complete
                </button>
              </div>
            </article>
          ))}
        </div>

        {!isLoading && filteredOrders.length > 0 ? (
          <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-bold text-slate-500">
              Showing {(safeCurrentPage - 1) * kdsOrdersPerPage + 1}-
              {Math.min(safeCurrentPage * kdsOrdersPerPage, filteredOrders.length)} of {filteredOrders.length}
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
    </div>
  )
}

export default KDS
