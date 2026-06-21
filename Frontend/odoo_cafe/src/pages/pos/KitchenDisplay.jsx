import { CheckCircle2, ChefHat, Clock3, Flame, RefreshCw, Table2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  completeKitchenItem,
  completeKitchenOrder,
  getKitchenOrders,
  startKitchenOrder,
} from '../../api/kdsApi'

const statusStyles = {
  TO_COOK: 'bg-amber-50 text-amber-700 ring-amber-200',
  PREPARING: 'bg-sky-50 text-sky-700 ring-sky-200',
  COMPLETED: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
}

const statusDots = {
  TO_COOK: 'bg-amber-500',
  PREPARING: 'bg-sky-500',
  COMPLETED: 'bg-emerald-500',
}

const formatStatus = (status) =>
  ({
    TO_COOK: 'To Cook',
    PREPARING: 'Preparing',
    COMPLETED: 'Completed',
  })[status] || status

const formatTime = (value) =>
  value
    ? new Date(value).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '-'

const KitchenDisplay = () => {
  const [orders, setOrders] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('ALL')

  const loadOrders = async (showLoader = false) => {
    try {
      if (showLoader) setIsLoading(true)
      setError('')
      const response = await getKitchenOrders()
      setOrders(response.data.orders || [])
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
        setOrders(response.data.orders || [])
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load kitchen orders.')
      } finally {
        setIsLoading(false)
      }
    }

    loadInitialOrders()
    const timer = window.setInterval(() => loadOrders(false), 15000)
    return () => window.clearInterval(timer)
  }, [])

  const stats = useMemo(
    () => ({
      all: orders.length,
      toCook: orders.filter((order) => order.status === 'TO_COOK').length,
      preparing: orders.filter((order) => order.status === 'PREPARING').length,
      completed: orders.filter((order) => order.status === 'COMPLETED').length,
      items: orders.reduce((sum, order) => sum + (order.items || []).length, 0),
    }),
    [orders],
  )

  const filteredOrders = useMemo(() => {
    if (activeTab === 'ALL') return orders
    return orders.filter((order) => order.status === activeTab)
  }, [orders, activeTab])

  const tabs = [
    { label: 'All Orders', value: 'ALL', count: stats.all },
    { label: 'To Cook', value: 'TO_COOK', count: stats.toCook },
    { label: 'Preparing', value: 'PREPARING', count: stats.preparing },
    { label: 'Completed', value: 'COMPLETED', count: stats.completed },
  ]

  const runAction = async (id, action) => {
    try {
      setSavingId(id)
      setError('')
      await action(id)
      await loadOrders(false)
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update kitchen order.')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <main className="min-h-screen bg-[#FFF8F0] px-3 py-4 text-[#2D1B0E] sm:px-5">
      <section className="mx-auto max-w-7xl">
        <div className="mb-4 overflow-hidden rounded-[26px] bg-white shadow-[0_15px_45px_rgba(45,27,14,0.08)] ring-1 ring-[#F5E6D3]">
          <div className="relative bg-gradient-to-r from-[#FFF8F0] via-white to-[#FFF3E6] px-4 py-4 md:px-5">
            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[#8B4513]/5" />
            <div className="absolute right-20 top-4 h-9 w-9 rounded-full bg-[#8B4513]/5" />

            <div className="relative flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#8B4513]/10 text-[#8B4513]">
                  <ChefHat className="h-6 w-6" />
                </span>

                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#8B4513]/65">
                    Live KDS
                  </p>
                  <h1 className="text-xl font-black md:text-2xl">Kitchen Display System</h1>
                  <p className="mt-0.5 text-xs font-semibold text-[#2D1B0E]/55">
                    Auto refresh every 15 seconds
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => loadOrders(true)}
                  className="inline-flex min-h-10 items-center rounded-xl bg-white px-4 py-2 text-sm font-black text-[#8B4513] ring-1 ring-[#E7D8C9] transition hover:bg-[#FFF8F0]"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </button>

                <Link
                  to="/pos"
                  className="inline-flex min-h-10 items-center rounded-xl bg-[#8B4513] px-4 py-2 text-sm font-black text-white shadow-md shadow-[#8B4513]/15 transition hover:bg-[#73380f]"
                >
                  Back to POS
                </Link>
              </div>
            </div>
          </div>
        </div>

        {error ? (
          <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-black text-red-700 ring-1 ring-red-100">
            {error}
          </div>
        ) : null}

        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#F5E6D3]">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8B4513]/55">To Cook</p>
            <p className="mt-1 text-3xl font-black">{stats.toCook}</p>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#F5E6D3]">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8B4513]/55">Preparing</p>
            <p className="mt-1 text-3xl font-black">{stats.preparing}</p>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#F5E6D3]">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8B4513]/55">Completed</p>
            <p className="mt-1 text-3xl font-black">{stats.completed}</p>
          </div>

          <div className="rounded-2xl bg-[#8B4513] p-4 text-white shadow-md shadow-[#8B4513]/15">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-white/70">Total Items</p>
            <p className="mt-1 text-3xl font-black">{stats.items}</p>
          </div>
        </div>

        <div className="mb-4 overflow-x-auto rounded-2xl bg-white p-2 shadow-sm ring-1 ring-[#F5E6D3]">
          <div className="flex min-w-max gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveTab(tab.value)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-black transition ${
                  activeTab === tab.value
                    ? 'bg-[#8B4513] text-white shadow-md shadow-[#8B4513]/15'
                    : 'bg-[#FFF8F0] text-[#8B4513] hover:bg-[#F5E6D3]'
                }`}
              >
                {tab.label}
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    activeTab === tab.value ? 'bg-white/20 text-white' : 'bg-white text-[#8B4513]'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-2xl bg-white p-5 text-sm font-black text-[#8B4513] ring-1 ring-[#F5E6D3]">
            Loading kitchen orders...
          </div>
        ) : null}

        {!isLoading && !filteredOrders.length ? (
          <div className="rounded-[24px] border border-dashed border-[#E7D8C9] bg-white p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#8B4513]/10">
              <ChefHat className="h-8 w-8 text-[#8B4513]" />
            </div>
            <h2 className="mt-3 text-lg font-black">No kitchen orders found</h2>
            <p className="mt-1 text-sm font-semibold text-[#2D1B0E]/55">
              Orders for selected tab will appear here.
            </p>
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredOrders.map((order) => (
            <article
              key={order.id}
              className="overflow-hidden rounded-[24px] bg-white shadow-sm ring-1 ring-[#F5E6D3] transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(45,27,14,0.08)]"
            >
              <div className="border-b border-[#F5E6D3] bg-gradient-to-r from-[#FFF8F0] to-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black">{order.order_number}</h2>

                    <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-[#2D1B0E]/60">
                      <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 ring-1 ring-[#E7D8C9]">
                        <Table2 className="h-3.5 w-3.5 text-[#8B4513]" />
                        {order.floor_name} / T{order.table_number}
                      </span>

                      <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 ring-1 ring-[#E7D8C9]">
                        <Clock3 className="h-3.5 w-3.5 text-[#8B4513]" />
                        {formatTime(order.created_at)}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ring-1 ${
                      statusStyles[order.status]
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full ${statusDots[order.status] || 'bg-gray-400'}`} />
                    {formatStatus(order.status)}
                  </span>
                </div>
              </div>

              <div className="p-4">
                <div className="max-h-[280px] space-y-2 overflow-y-auto pr-1">
                  {(order.items || []).map((item) => (
                    <div key={item.id} className="rounded-2xl bg-[#FFF8F0] p-3 ring-1 ring-[#E7D8C9]">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-black">
                            {item.quantity} x {item.product_name}
                          </p>
                          <p className="mt-1 text-xs font-semibold text-[#2D1B0E]/50">
                            Kitchen item
                          </p>
                        </div>

                        <span
                          className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-black ring-1 ${
                            statusStyles[item.status]
                          }`}
                        >
                          {formatStatus(item.status)}
                        </span>
                      </div>

                      {item.status !== 'COMPLETED' ? (
                        <button
                          type="button"
                          disabled={savingId === item.id}
                          onClick={() => runAction(item.id, completeKitchenItem)}
                          className="mt-3 inline-flex min-h-9 items-center rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 ring-1 ring-emerald-100 transition hover:bg-emerald-100 disabled:opacity-60"
                        >
                          <CheckCircle2 className="mr-1 h-4 w-4" />
                          Complete Item
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={order.status !== 'TO_COOK' || savingId === order.id}
                    onClick={() => runAction(order.id, startKitchenOrder)}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#FFF8F0] px-3 py-2 text-sm font-black text-[#8B4513] ring-1 ring-[#E7D8C9] transition hover:bg-[#F5E6D3] disabled:opacity-50"
                  >
                    <Flame className="mr-2 h-4 w-4" />
                    Start
                  </button>

                  <button
                    type="button"
                    disabled={savingId === order.id}
                    onClick={() => runAction(order.id, completeKitchenOrder)}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#8B4513] px-3 py-2 text-sm font-black text-white shadow-md shadow-[#8B4513]/15 transition hover:bg-[#73380f] disabled:opacity-60"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Complete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}

export default KitchenDisplay