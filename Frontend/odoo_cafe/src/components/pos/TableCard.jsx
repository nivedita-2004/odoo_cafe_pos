import { Armchair } from 'lucide-react'

const badgeStyles = {
  Paid: 'bg-[#22C55E]/10 text-[#15803D]',
  Draft: 'bg-[#F59E0B]/12 text-[#B45309]',
  Cancelled: 'bg-[#EF4444]/10 text-[#B91C1C]',
  available: 'bg-[#22C55E]/10 text-[#15803D]',
  active: 'bg-[#F59E0B]/12 text-[#B45309]',
}

const StatusBadge = ({ status }) => (
  <span className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-black ${badgeStyles[status] || badgeStyles.Draft}`}>
    {status === 'active' ? 'Active Order' : status === 'available' ? 'Available' : status}
  </span>
)

const TableCard = ({ table, onSelect, amount }) => {
  const isActive = table.status === 'active'

  return (
    <button
      type="button"
      onClick={() => onSelect(table)}
      className={`flex h-28 w-full flex-col items-center justify-center gap-2 rounded-3xl border-2 p-3 text-center transition hover:-translate-y-0.5 hover:shadow-lg ${
        isActive ? 'border-[#F59E0B]/40 bg-[#FFF7ED]' : 'border-[#E6F4EA] bg-white'
      }`}
    >
      <div className="flex w-full items-center justify-between px-2">
        <p className="text-2xl font-black text-[#2D1B0E]">{table.number}</p>
        {table.qrDataUrl ? (
          <img src={table.qrDataUrl} alt={`QR for table ${table.number}`} className="h-9 w-9 rounded-lg bg-white p-0.5 ring-1 ring-[#E7D8C9]" />
        ) : (
          <StatusBadge status={table.status} />
        )}
      </div>
      <div className="flex w-full items-center justify-between px-2">
        <p className="flex items-center gap-2 text-sm font-bold text-[#2D1B0E]/60">
          <Armchair className="h-4 w-4" /> {table.seats}
        </p>
        {amount ? <p className="text-sm font-black text-[#8B4513]">{amount}</p> : null}
      </div>
    </button>
  )
}

export default TableCard
