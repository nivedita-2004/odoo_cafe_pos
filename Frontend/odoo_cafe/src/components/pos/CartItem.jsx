import { Minus, Plus, Trash2 } from 'lucide-react'
import { usePOS } from '../../context/POSContext.jsx'
import { formatCurrency } from '../../utils/formatCurrency'

const CartItem = ({ item }) => {
  const { increaseQty, decreaseQty, removeItem } = usePOS()
  const hasPromo = item.quantity >= 3

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-black text-slate-950">{item.name}</h3>
          <p className="text-xs font-bold text-[#9a5a2e]/70">{formatCurrency(item.price)} each</p>
          {hasPromo ? (
            <p className="mt-1 text-xs font-black text-emerald-600">Product promo applied</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => removeItem(item.id)}
          className="rounded-lg p-2 text-[#EF4444] hover:bg-[#EF4444]/10"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => decreaseQty(item.id)}
            className="rounded-lg bg-[#fff3e8] p-2 text-[#9a5a2e]"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-8 text-center text-sm font-black">{item.quantity}</span>
          <button
            type="button"
            onClick={() => increaseQty(item.id)}
            className="rounded-lg bg-[#c8793f] p-2 text-white"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm font-black text-slate-950">
          {formatCurrency(item.price * item.quantity)}
        </p>
      </div>
    </div>
  )
}

export default CartItem
