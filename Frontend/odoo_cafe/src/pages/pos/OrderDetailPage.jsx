import { Edit, Loader2, ReceiptText, Trash2 } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ReceiptModal from '../../components/pos/ReceiptModal'
import { usePOS } from '../../context/POSContext.jsx'
import { formatCurrency } from '../../utils/formatCurrency'
import { useEffect, useState } from 'react'
import { getEmployeeOrder } from '../../api/employeePosApi'

const Button = ({
  children,
  className = '',
  isLoading = false,
  variant = 'primary',
  type = 'button',
  ...props
}) => {
  const variants = {
    primary:
      'bg-[#8B4513] text-white shadow-md shadow-[#8B4513]/15 hover:bg-[#73380f] focus:ring-[#FFB347]',
    ghost:
      'bg-white text-[#8B4513] ring-1 ring-[#F5E6D3] hover:bg-[#FFF8F0] focus:ring-[#FFB347]',
    danger:
      'bg-red-600 text-white shadow-md shadow-red-500/15 hover:bg-red-700 focus:ring-red-300',
  }

  return (
    <button
      type={type}
      disabled={isLoading || props.disabled}
      className={`inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-black transition duration-200 focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-70 ${variants[variant]} ${className}`}
      {...props}
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  )
}

const EmptyState = ({ title, description, icon: Icon }) => (
  <div className="rounded-2xl border border-dashed border-[#D9BFA7] bg-gradient-to-br from-[#FFF8F0] to-white p-6 text-center">
    {Icon ? (
      <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[#8B4513]/10">
        <Icon className="h-5 w-5 text-[#8B4513]" />
      </div>
    ) : null}

    <h3 className="text-base font-black text-[#2D1B0E]">{title}</h3>
    <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-[#2D1B0E]/60">{description}</p>
  </div>
)

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

const InfoRow = ({ label, value, highlight = false }) => (
  <div className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2.5 ring-1 ring-[#E7D8C9]">
    <p className="text-xs font-bold text-[#2D1B0E]/55">{label}</p>
    <p className={`text-right text-sm font-black ${highlight ? 'text-[#8B4513]' : 'text-[#2D1B0E]'}`}>
      {value}
    </p>
  </div>
)

const formatTableLabel = (table) => {
  if (!table?.number) return 'Walk-in'
  const tableNumber = String(table.number).startsWith('T') ? table.number : `T${table.number}`
  return table.floor ? `${table.floor} / ${tableNumber}` : tableNumber
}

const OrderDetailPage = () => {
  const { id } = useParams()
  const { orders, editOrder, deleteOrder } = usePOS()
  const [detailItems, setDetailItems] = useState([])
  const [receiptOpen, setReceiptOpen] = useState(false)
  const navigate = useNavigate()
  const order = orders.find((item) => item.id === id)

  useEffect(() => {
    const loadOrderProducts = async () => {
      if (!order?.backendId) return

      try {
        const response = await getEmployeeOrder(order.backendId)
        setDetailItems(
          (response.data.order?.items || []).map((item) => ({
            id: item.id,
            name: item.product_name || item.name || '-',
            price: Number(item.unit_price || 0),
            quantity: Number(item.quantity || 0),
          })),
        )
      } catch {
        setDetailItems(order.items || [])
      }
    }

    loadOrderProducts()
  }, [order])

  if (!order) {
    return (
      <main className="min-h-screen bg-[#FFF8F0]/40 p-3 md:p-4">
        <EmptyState title="Order not found" description="This order is not available in the current session." icon={ReceiptText} />
      </main>
    )
  }

  const handleEdit = async () => {
    if (await editOrder(order.id)) navigate('/pos')
  }

  const handleDelete = async () => {
    await deleteOrder(order.backendId)
    navigate('/pos/orders')
  }

  const products = detailItems.length ? detailItems : order.items

  return (
    <main className="min-h-screen bg-[#FFF8F0]/40 p-3 md:p-4">
      <section className="overflow-hidden rounded-2xl bg-white shadow-[0_12px_35px_rgba(45,27,14,0.07)] ring-1 ring-[#E7D8C9]">
        <div className="relative border-b border-[#E7D8C9] bg-gradient-to-r from-[#FFF8F0] via-white to-[#FFF3E6] px-4 py-3 md:px-5 md:py-4">
          <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-[#8B4513]/5" />

          <div className="relative flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8B4513]/60">
                Order Detail
              </p>
              <h1 className="mt-0.5 text-xl font-black text-[#2D1B0E] md:text-2xl">
                {order.orderNumber}
              </h1>
              <p className="mt-0.5 text-xs font-semibold text-[#2D1B0E]/55">
                {new Date(order.date).toLocaleString()}
              </p>
            </div>

            <StatusBadge status={order.status} />
          </div>
        </div>

        <div className="p-4 md:p-5">
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.75fr]">
            <div className="rounded-2xl bg-[#FFF8F0] p-3 ring-1 ring-[#E7D8C9] md:p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8B4513]/50">
                    Items
                  </p>
                  <h2 className="text-lg font-black text-[#2D1B0E]">Products</h2>
                </div>

                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#8B4513] ring-1 ring-[#E7D8C9]">
                  {products.length} Items
                </span>
              </div>

              <div className="max-h-[300px] space-y-2 overflow-y-auto pr-1">
                {products.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-2 rounded-xl bg-white p-3 shadow-sm ring-1 ring-[#E7D8C9] sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-black text-[#2D1B0E]">{item.name}</p>
                      <p className="mt-0.5 text-xs font-bold text-[#2D1B0E]/50">
                        Quantity: {item.quantity}
                      </p>
                    </div>

                    <div className="text-left sm:text-right">
                      <p className="text-sm font-black text-[#8B4513]">
                        {formatCurrency(item.price * item.quantity)}
                      </p>
                      <p className="mt-0.5 text-xs font-semibold text-[#2D1B0E]/45">
                        {formatCurrency(item.price)} each
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-[#FFF8F0] p-3 ring-1 ring-[#E7D8C9] md:p-4">
              <div className="mb-3">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8B4513]/50">
                  Billing
                </p>
                <h2 className="text-lg font-black text-[#2D1B0E]">Summary</h2>
              </div>

              <div className="space-y-2">
                <InfoRow label="Customer" value={order.customer?.name || 'Guest'} />
                <InfoRow label="Table No" value={formatTableLabel(order.table)} />
                <InfoRow label="Payment" value={order.paymentMethod || 'Not paid'} />
                <InfoRow label="Tax" value={formatCurrency(order.tax)} />
                <InfoRow
                  label="Discount"
                  value={formatCurrency(order.productDiscount + order.orderDiscount + order.couponDiscount)}
                />

                <div className="rounded-2xl bg-[#8B4513] p-3 text-white shadow-md shadow-[#8B4513]/15">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/70">
                    Grand Total
                  </p>
                  <p className="mt-0.5 text-xl font-black">{formatCurrency(order.total)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Link
              to="/pos/orders"
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-black text-[#8B4513] ring-1 ring-[#E7D8C9] transition hover:bg-[#FFF8F0]"
            >
              Back to Orders
            </Link>

            {order.status === 'Draft' ? (
              <>
                <Button className="sm:w-auto" onClick={handleEdit}>
                  <Edit className="h-4 w-4" />
                  Edit Order
                </Button>

                <Button variant="danger" className="sm:w-auto" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </>
            ) : (
              <Button className="sm:w-auto" onClick={() => setReceiptOpen(true)}>
                View Receipt
              </Button>
            )}
          </div>
        </div>
      </section>

      {receiptOpen ? <ReceiptModal order={order} onClose={() => setReceiptOpen(false)} /> : null}
    </main>
  )
}

export default OrderDetailPage
