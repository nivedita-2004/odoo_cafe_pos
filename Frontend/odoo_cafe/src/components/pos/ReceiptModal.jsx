import { Loader2, Printer, Send, X } from 'lucide-react'
import { usePOS } from '../../context/POSContext.jsx'
import { formatCurrency } from '../../utils/formatCurrency'

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
      'bg-[#8B4513] text-white shadow-lg shadow-[#8B4513]/20 hover:bg-[#73380f] focus:ring-[#FFB347]',
    ghost:
      'bg-white text-[#8B4513] ring-1 ring-[#F5E6D3] hover:bg-[#FFF8F0] focus:ring-[#FFB347]',
    danger:
      'bg-[#EF4444] text-white shadow-lg shadow-red-500/20 hover:bg-red-600 focus:ring-red-300',
  }

  return (
    <button
      type={type}
      disabled={isLoading || props.disabled}
      className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition duration-200 focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-70 ${variants[variant]} ${className}`}
      {...props}
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  )
}

const Modal = ({ title, children, onClose, size = 'max-w-3xl' }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2D1B0E]/55 p-4 backdrop-blur-sm">
    <div className={`max-h-[92vh] w-full overflow-hidden rounded-2xl bg-white shadow-2xl ${size}`}>
      <div className="flex items-center justify-between border-b border-[#E7D8C9] px-5 py-4">
        <h2 className="text-lg font-black text-[#2D1B0E]">{title}</h2>
        <button type="button" onClick={onClose} className="rounded-2xl p-2 text-[#8B4513] hover:bg-[#FFF8F0]" aria-label="Close modal">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="max-h-[calc(92vh-64px)] overflow-auto p-5">{children}</div>
    </div>
  </div>
)

const ReceiptModal = ({ order, onClose }) => {
  const { clearCart, setToast } = usePOS()

  const handleNewOrder = () => {
    clearCart()
    onClose()
  }

  return (
    <Modal title="Payment Receipt" onClose={onClose} size="max-w-lg">
      <div className="rounded-2xl bg-[#FFF8F0] p-5 ring-1 ring-[#E7D8C9]">
        <div className="text-center">
          <h3 className="text-2xl font-black text-[#2D1B0E]">Odoo Cafe POS</h3>
          <p className="text-sm font-bold text-[#8B4513]/65">{order.orderNumber}</p>
        </div>
        <div className="mt-5 grid gap-2 text-sm text-[#2D1B0E]/70">
          <p>Table: {order.table?.number || 'Walk-in'}</p>
          <p>Customer: {order.customer?.name || 'Guest'}</p>
          <p>Date: {new Date(order.date).toLocaleString()}</p>
          <p>Payment: {order.paymentMethod}</p>
        </div>
        <div className="my-5 space-y-2 border-y border-[#E7D8C9] py-4">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm font-bold">
              <span>
                {item.name} x {item.quantity}
              </span>
              <span>{formatCurrency(item.price * item.quantity)}</span>
            </div>
          ))}
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
          <div className="flex justify-between"><span>Tax</span><span>{formatCurrency(order.tax)}</span></div>
          <div className="flex justify-between"><span>Discounts</span><span>-{formatCurrency(order.productDiscount + order.orderDiscount + order.couponDiscount)}</span></div>
          <div className="flex justify-between border-t border-[#E7D8C9] pt-2 text-lg font-black"><span>Total</span><span>{formatCurrency(order.total)}</span></div>
        </div>
        <p className="mt-5 text-center text-sm font-black text-[#8B4513]">Thank you. Visit again.</p>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Button variant="ghost" onClick={() => setToast({ message: 'Print ready', type: 'success', id: Date.now() })}>
          <Printer className="h-4 w-4" />
          Print
        </Button>
        <Button variant="ghost" onClick={() => setToast({ message: 'Email popup coming soon', type: 'success', id: Date.now() })}>
          <Send className="h-4 w-4" />
          Email
        </Button>
        <Button onClick={handleNewOrder}>New Order</Button>
      </div>
    </Modal>
  )
}

export default ReceiptModal
