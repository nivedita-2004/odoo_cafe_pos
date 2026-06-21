import { Edit, Eye, Search, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useGlobalSearch } from '../../context/GlobalSearchContext.jsx'
import { usePOS } from '../../context/POSContext.jsx'
import { formatCurrency } from '../../utils/formatCurrency'

const badgeStyles = {
  Paid: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Draft: 'bg-amber-50 text-amber-700 ring-amber-200',
  Cancelled: 'bg-red-50 text-red-700 ring-red-200',
  available: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  active: 'bg-amber-50 text-amber-700 ring-amber-200',
}

const StatusBadge = ({ status }) => (
  <span
    className={`inline-flex w-fit items-center justify-center rounded-full px-3 py-1 text-xs font-black ring-1 ${
      badgeStyles[status] || badgeStyles.Draft
    }`}
  >
    {status === 'active' ? 'Active Order' : status === 'available' ? 'Available' : status}
  </span>
)

const EmptyState = ({ title, description, icon: Icon }) => (
  <div className="rounded-[28px] border border-dashed border-[#D9BFA7] bg-gradient-to-br from-[#FFF8F0] to-white p-10 text-center">
    {Icon ? (
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#8B4513]/10">
        <Icon className="h-7 w-7 text-[#8B4513]" />
      </div>
    ) : null}

    <h3 className="text-lg font-black text-[#2D1B0E]">{title}</h3>
    <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#2D1B0E]/60">{description}</p>
  </div>
)

const OrdersPage = () => {
  const { orders, editOrder, deleteOrder } = usePOS()
  const { searchQuery } = useGlobalSearch()
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const filteredOrders = useMemo(() => {
    const effectiveSearch = (search || searchQuery).toLowerCase()

    return orders.filter((order) =>
      `${order.customer?.name || 'Guest'} ${order.orderNumber} ${order.table?.number || ''} ${order.status} ${new Date(order.date).toLocaleDateString()}`
        .toLowerCase()
        .includes(effectiveSearch),
    )
  }, [orders, search, searchQuery])

  const handleEdit = async (orderId) => {
    if (await editOrder(orderId)) navigate('/pos')
  }

  return (
    <main className="min-h-screen bg-[#FFF8F0]/40 p-4 md:p-6">
      <section className="overflow-hidden rounded-[30px] bg-white shadow-[0_20px_60px_rgba(45,27,14,0.08)] ring-1 ring-[#E7D8C9]">
        <div className="relative border-b border-[#E7D8C9] bg-gradient-to-r from-[#FFF8F0] via-white to-[#FFF3E6] p-5 md:p-7">
          <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[#8B4513]/5" />
          <div className="absolute right-16 top-6 h-10 w-10 rounded-full bg-[#8B4513]/5" />

          <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#8B4513]/60">
                Orders
              </p>
              <h1 className="mt-1 text-2xl font-black text-[#2D1B0E] md:text-3xl">
                Current Session Orders
              </h1>
              <p className="mt-1 text-sm font-semibold text-[#2D1B0E]/55">
                Manage paid and draft orders from this session
              </p>
            </div>

            <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8B4513]/50" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search order, customer, date"
                className="min-h-12 w-full rounded-2xl border border-[#E7D8C9] bg-white pl-11 pr-4 text-sm font-bold text-[#2D1B0E] shadow-sm outline-none transition focus:border-[#8B4513] focus:ring-4 focus:ring-[#8B4513]/10"
              />
            </div>
          </div>
        </div>

        <div className="p-5 md:p-7">
          {!filteredOrders.length ? (
            <EmptyState title="No orders yet" description="Paid and draft orders will appear here." icon={Search} />
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((order) => (
                <div
                  key={order.id}
                  className="group rounded-[24px] border border-[#E7D8C9] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[#8B4513]/30 hover:shadow-[0_16px_40px_rgba(45,27,14,0.08)]"
                >
                  <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr_0.8fr_0.8fr_1.2fr] lg:items-center">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8B4513]/45">
                        Order No
                      </p>
                      <p className="mt-1 text-base font-black text-[#2D1B0E]">{order.orderNumber}</p>
                      <p className="mt-1 text-xs font-semibold text-[#2D1B0E]/50">
                        {new Date(order.date).toLocaleString()}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8B4513]/45">
                        Customer
                      </p>
                      <p className="mt-1 font-black text-[#2D1B0E]">{order.customer?.name || 'Guest'}</p>
                    </div>

                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8B4513]/45">
                        Amount
                      </p>
                      <p className="mt-1 text-lg font-black text-[#8B4513]">
                        {formatCurrency(order.amount)}
                      </p>
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-[#8B4513]/45">
                        Status
                      </p>
                      <StatusBadge status={order.status} />
                    </div>

                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      <Link
                        to={`/pos/orders/${order.id}`}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#FFF8F0] px-3.5 py-2 text-sm font-black text-[#8B4513] ring-1 ring-[#E7D8C9] transition hover:bg-[#8B4513] hover:text-white"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </Link>

                      {order.status === 'Draft' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleEdit(order.id)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-sm font-black text-[#8B4513] ring-1 ring-[#E7D8C9] transition hover:bg-[#FFF8F0]"
                          >
                            <Edit className="h-4 w-4" />
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteOrder(order.backendId)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-red-50 px-3.5 py-2 text-sm font-black text-red-600 ring-1 ring-red-100 transition hover:bg-red-600 hover:text-white"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}

export default OrdersPage
