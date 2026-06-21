import { Loader2, Percent, Save, ShoppingCart, UserPlus, Utensils } from 'lucide-react'
import { usePOS } from '../../context/POSContext.jsx'
import CartItem from './CartItem'
import OrderSummary from './OrderSummary'

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
      'bg-[#c8793f] text-white shadow-lg shadow-[#c8793f]/20 hover:bg-[#9a5a2e] focus:ring-[#fcd8b8]',
    ghost:
      'bg-white text-[#9a5a2e] ring-1 ring-slate-200 hover:bg-[#fff3e8] focus:ring-[#fcd8b8]',
    danger:
      'bg-[#EF4444] text-white shadow-lg shadow-red-500/20 hover:bg-red-600 focus:ring-red-300',
  }

  return (
    <button
      type={type}
      disabled={isLoading || props.disabled}
      className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-black transition duration-200 focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-70 ${variants[variant]} ${className}`}
      {...props}
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  )
}

const EmptyState = ({ title, description, icon: Icon }) => (
  <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-5 text-center">
    {Icon ? <Icon className="mx-auto mb-3 h-8 w-8 text-[#9a5a2e]" /> : null}
    <h3 className="text-base font-black text-slate-950">{title}</h3>
    <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
  </div>
)

const CartSection = ({ onCoupon, onCustomer }) => {
  const {
    cartItems,
    selectedCustomer,
    selectedTable,
    appliedCoupon,
    totals,
    sendToKitchen,
    createDraftOrder,
  } = usePOS()

  return (
    <section className="flex min-h-0 flex-col rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#9a5a2e]/65">
            Current Order
          </p>
          <h2 className="text-lg font-black text-slate-950 sm:text-xl">
            {selectedTable ? `Table ${selectedTable.number}` : 'No table selected'}
          </h2>
          {selectedCustomer ? (
            <p className="mt-1 text-xs font-bold text-[#22C55E]">{selectedCustomer.name}</p>
          ) : null}
        </div>
        <ShoppingCart className="h-6 w-6 text-[#9a5a2e]" />
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-visible lg:max-h-[calc(100vh-380px)] lg:overflow-auto lg:pr-1">
        {!cartItems.length ? (
          <EmptyState
            title="Cart is empty"
            description="Select a table and add products to start an order."
            icon={ShoppingCart}
          />
        ) : (
          cartItems.map((item) => <CartItem key={item.id} item={item} />)
        )}
      </div>

      <div className="mt-3 space-y-3">
        {appliedCoupon ? (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">
            Coupon applied: {appliedCoupon.code}
          </p>
        ) : null}
        <OrderSummary totals={totals} />
        <div className="grid grid-cols-2 gap-2">
          <Button variant="ghost" className="min-h-10 py-2 text-xs" onClick={onCustomer}>
            <UserPlus className="h-4 w-4" />
            Customer
          </Button>
          <Button variant="ghost" className="min-h-10 py-2 text-xs" onClick={onCoupon}>
            <Percent className="h-4 w-4" />
            Discount
          </Button>
          <Button variant="ghost" className="min-h-10 py-2 text-xs" onClick={sendToKitchen}>
            <Utensils className="h-4 w-4" />
            Kitchen
          </Button>
          <Button variant="ghost" className="min-h-10 py-2 text-xs" onClick={createDraftOrder}>
            <Save className="h-4 w-4" />
            Draft
          </Button>
        </div>
      </div>
    </section>
  )
}

export default CartSection
