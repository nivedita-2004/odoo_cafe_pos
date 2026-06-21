import { Plus } from 'lucide-react'
import { formatCurrency } from '../../utils/formatCurrency'

const ProductCard = ({ product, onAdd }) => (
  <button
    type="button"
    onClick={() => onAdd(product)}
    className="group overflow-hidden rounded-lg border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#f0bd91] hover:shadow-lg"
  >
    <div className="h-1" style={{ backgroundColor: product.color }} />
    <div className="aspect-[4/3] overflow-hidden bg-[#fff3e8]">
      {product.image ? (
        <img
          src={product.image}
          alt={product.name}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          loading="lazy"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-3xl font-black text-[#9a5a2e]/35">
          {product.name?.charAt(0) || 'P'}
        </div>
      )}
    </div>
    <div className="p-3 sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-black text-slate-950">{product.name}</h3>
          <p className="mt-1 text-xs font-bold text-[#9a5a2e]/70">{product.category}</p>
        </div>
        <span className="rounded-lg bg-[#fff3e8] p-2 text-[#9a5a2e] group-hover:bg-[#c8793f] group-hover:text-white">
          <Plus className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-4 flex items-end justify-between">
        <p className="text-lg font-black text-[#9a5a2e] sm:text-xl">{formatCurrency(product.price)}</p>
        <p className="text-xs font-bold text-slate-500">{product.tax}% tax</p>
      </div>
    </div>
  </button>
)

export default ProductCard
