import {
  Banknote,
  ChefHat,
  ClipboardList,
  Eye,
  IndianRupee,
  PackageCheck,
  Search,
  ShoppingBag,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  getAdminOrder,
  getAdminOrders,
  updateAdminOrderStatus,
} from '../../api/ordersApi'
import { useGlobalSearch } from '../../context/GlobalSearchContext.jsx'
import { formatCurrency } from '../../utils/formatCurrency'

const ordersPerPage = 8

const statusOptions = ['DRAFT', 'TO_COOK', 'PREPARING', 'COMPLETED', 'PAID', 'CANCELLED']

const statusStyles = {
  DRAFT: 'bg-slate-100 text-slate-700 ring-slate-200',
  TO_COOK: 'bg-amber-50 text-amber-700 ring-amber-100',
  PREPARING: 'bg-violet-50 text-violet-700 ring-violet-100',
  COMPLETED: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  PAID: 'bg-[#fff3e8] text-[#9a5a2e] ring-[#fcd8b8]',
  CANCELLED: 'bg-rose-50 text-rose-700 ring-rose-100',
}

const inputClass =
  'h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#c8793f] focus:ring-2 focus:ring-[#fcd8b8]'

const toNumber = (value) => Number(value || 0)

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

const normalizeOrder = (order) => ({
  id: order.id,
  orderNumber: order.order_number || `#${order.id}`,
  table: order.table_number ? `T${order.table_number}` : '-',
  floor: order.floor_name || '-',
  customer: order.customer_name || 'Walk-in',
  employee: order.employee_name || '-',
  subtotal: toNumber(order.subtotal),
  tax: toNumber(order.tax_amount),
  discount: toNumber(order.discount_amount),
  total: toNumber(order.total_amount),
  status: order.status || 'DRAFT',
  paymentMethod: order.payment_method || '-',
  paymentStatus: order.payment_status || '-',
  createdAt: order.created_at,
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

const FieldBlock = ({ label, value }) => (
  <div className="rounded-lg bg-slate-50 p-3">
    <p className="text-xs font-black uppercase text-slate-500">{label}</p>
    <p className="mt-1 text-sm font-black text-slate-900">{value}</p>
  </div>
)

const ModalShell = ({ title, children, onClose, size = 'max-w-4xl' }) => (
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

const Order = () => {
  const [orders, setOrders] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const { searchQuery } = useGlobalSearch()

  const loadOrders = async () => {
    try {
      setIsLoading(true)
      setError('')
      const response = await getAdminOrders()
      setOrders((response.data.orders || []).map(normalizeOrder))
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load orders.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const loadInitialOrders = async () => {
      try {
        setIsLoading(true)
        setError('')
        const response = await getAdminOrders()
        setOrders((response.data.orders || []).map(normalizeOrder))
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load orders.')
      } finally {
        setIsLoading(false)
      }
    }

    loadInitialOrders()
  }, [])

  const summaryCards = useMemo(() => {
    const paidOrders = orders.filter((order) => order.status === 'PAID')
    const kitchenOrders = orders.filter((order) => ['TO_COOK', 'PREPARING'].includes(order.status))
    const completedOrders = orders.filter((order) => order.status === 'COMPLETED')

    return [
      {
        label: 'Total Orders',
        value: orders.length,
        icon: ClipboardList,
        iconClass: 'bg-[#fff3e8] text-[#9a5a2e] ring-[#fcd8b8]',
      },
      {
        label: 'Paid Revenue',
        value: formatCurrency(paidOrders.reduce((sum, order) => sum + order.total, 0)),
        icon: IndianRupee,
        iconClass: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
      },
      {
        label: 'Kitchen Orders',
        value: kitchenOrders.length,
        icon: ChefHat,
        iconClass: 'bg-amber-50 text-amber-600 ring-amber-100',
      },
      {
        label: 'Completed',
        value: completedOrders.length,
        icon: PackageCheck,
        iconClass: 'bg-violet-50 text-violet-600 ring-violet-100',
      },
    ]
  }, [orders])

  const filteredOrders = useMemo(() => {
    const search = (searchTerm || searchQuery).trim().toLowerCase()

    return orders
      .filter((order) => {
        const haystack = `${order.orderNumber} ${order.table} ${order.customer} ${order.employee}`.toLowerCase()
        return haystack.includes(search)
      })
      .filter((order) => statusFilter === 'All' || order.status === statusFilter)
  }, [orders, searchQuery, searchTerm, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ordersPerPage))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const paginatedOrders = filteredOrders.slice(
    (safeCurrentPage - 1) * ordersPerPage,
    safeCurrentPage * ordersPerPage,
  )

  const goToPage = (page) => {
    setCurrentPage(Math.min(Math.max(page, 1), totalPages))
  }

  const openOrderDetails = async (order) => {
    try {
      setError('')
      const response = await getAdminOrder(order.id)
      setSelectedOrder(response.data.order)
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load order details.')
    }
  }

  const closeModal = () => {
    setSelectedOrder(null)
    setIsSaving(false)
  }

  const changeOrderStatus = async (order, status) => {
    try {
      setIsSaving(true)
      setError('')
      await updateAdminOrderStatus(order.id, status)
      await loadOrders()
      setSelectedOrder((current) => (current?.id === order.id ? { ...current, status } : current))
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update order status.')
    } finally {
      setIsSaving(false)
    }
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
        <div className="grid gap-3 md:grid-cols-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value)
                setCurrentPage(1)
              }}
              placeholder="Search order, table, customer, employee"
              className={`${inputClass} pl-10`}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value)
              setCurrentPage(1)
            }}
            className={inputClass}
          >
            <option value="All">All Status</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <div className="mt-5 rounded-lg border border-[#fcd8b8] bg-[#fff3e8] px-4 py-3 text-sm font-bold text-[#9a5a2e]">
            Loading orders...
          </div>
        ) : null}

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-[1050px] w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-black uppercase text-slate-500">
                <th className="py-3 pr-4">Order No</th>
                <th className="py-3 pr-4">Table</th>
                <th className="py-3 pr-4">Customer</th>
                <th className="py-3 pr-4">Employee</th>
                <th className="py-3 pr-4">Amount</th>
                <th className="py-3 pr-4">Payment</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Created</th>
                <th className="py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedOrders.map((order) => (
                <tr key={order.id} className="text-sm">
                  <td className="py-3 pr-4 font-black text-slate-950">{order.orderNumber}</td>
                  <td className="py-3 pr-4 font-bold text-slate-600">{order.floor} / {order.table}</td>
                  <td className="py-3 pr-4 font-bold text-slate-600">{order.customer}</td>
                  <td className="py-3 pr-4 font-bold text-slate-600">{order.employee}</td>
                  <td className="py-3 pr-4 font-black text-slate-950">{formatCurrency(order.total)}</td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2 font-bold text-slate-600">
                      <Banknote className="h-4 w-4 text-[#9a5a2e]" />
                      {order.paymentMethod}
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${statusStyles[order.status] || statusStyles.DRAFT}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="py-3 pr-4 font-bold text-slate-500">{formatDateTime(order.createdAt)}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openOrderDetails(order)}
                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                        aria-label="View order"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <select
                        value={order.status}
                        onChange={(event) => changeOrderStatus(order, event.target.value)}
                        disabled={isSaving}
                        className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-black text-slate-600 outline-none focus:border-[#c8793f] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {statusOptions.map((status) => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!isLoading && filteredOrders.length === 0 ? (
          <div className="mt-5 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
            <ShoppingBag className="mx-auto h-9 w-9 text-slate-400" />
            <h3 className="mt-3 text-base font-black text-slate-900">No orders found</h3>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              Try changing search or status filter.
            </p>
          </div>
        ) : null}

        {filteredOrders.length > 0 ? (
          <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-bold text-slate-500">
              Showing {(safeCurrentPage - 1) * ordersPerPage + 1}-
              {Math.min(safeCurrentPage * ordersPerPage, filteredOrders.length)} of {filteredOrders.length}
            </p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => goToPage(safeCurrentPage - 1)} disabled={safeCurrentPage === 1} className="h-9 rounded-lg border border-slate-200 px-3 text-sm font-black text-slate-600 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50">
                Prev
              </button>
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => goToPage(page)}
                  className={`h-9 min-w-9 rounded-lg px-3 text-sm font-black ${
                    page === safeCurrentPage
                      ? 'bg-[#c8793f] text-white'
                      : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button type="button" onClick={() => goToPage(safeCurrentPage + 1)} disabled={safeCurrentPage === totalPages} className="h-9 rounded-lg border border-slate-200 px-3 text-sm font-black text-slate-600 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50">
                Next
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {selectedOrder ? (
        <ModalShell title="Order Details" onClose={closeModal}>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <FieldBlock label="Order No" value={selectedOrder.order_number || `#${selectedOrder.id}`} />
            <FieldBlock label="Table" value={`${selectedOrder.floor_name || '-'} / T${selectedOrder.table_number || '-'}`} />
            <FieldBlock label="Customer" value={selectedOrder.customer_name || 'Walk-in'} />
            <FieldBlock label="Status" value={selectedOrder.status || '-'} />
            <FieldBlock label="Subtotal" value={formatCurrency(toNumber(selectedOrder.subtotal))} />
            <FieldBlock label="Tax" value={formatCurrency(toNumber(selectedOrder.tax_amount))} />
            <FieldBlock label="Discount" value={formatCurrency(toNumber(selectedOrder.discount_amount))} />
            <FieldBlock label="Total" value={formatCurrency(toNumber(selectedOrder.total_amount))} />
          </div>

          <div className="mt-5 overflow-x-auto rounded-lg border border-slate-100">
            <table className="min-w-[720px] w-full text-left">
              <thead className="bg-slate-50">
                <tr className="text-xs font-black uppercase text-slate-500">
                  <th className="px-3 py-3">Product</th>
                  <th className="px-3 py-3">Qty</th>
                  <th className="px-3 py-3">Unit Price</th>
                  <th className="px-3 py-3">Tax</th>
                  <th className="px-3 py-3">Discount</th>
                  <th className="px-3 py-3">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(selectedOrder.items || []).map((item) => (
                  <tr key={item.id} className="text-sm">
                    <td className="px-3 py-3 font-black text-slate-900">{item.product_name}</td>
                    <td className="px-3 py-3 font-bold text-slate-600">{item.quantity}</td>
                    <td className="px-3 py-3 font-bold text-slate-600">{formatCurrency(toNumber(item.unit_price))}</td>
                    <td className="px-3 py-3 font-bold text-slate-600">{formatCurrency(toNumber(item.tax_amount))}</td>
                    <td className="px-3 py-3 font-bold text-slate-600">{formatCurrency(toNumber(item.discount_amount))}</td>
                    <td className="px-3 py-3 font-black text-slate-900">{formatCurrency(toNumber(item.line_total))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <select
              value={selectedOrder.status || 'DRAFT'}
              onChange={(event) => changeOrderStatus(selectedOrder, event.target.value)}
              disabled={isSaving}
              className={`${inputClass} sm:max-w-xs`}
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            <button type="button" onClick={closeModal} className="h-11 rounded-lg bg-[#c8793f] px-5 text-sm font-black text-white hover:bg-[#9a5a2e]">
              Done
            </button>
          </div>
        </ModalShell>
      ) : null}
    </div>
  )
}

export default Order
