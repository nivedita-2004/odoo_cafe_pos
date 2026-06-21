import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getPosTables } from '../../api/posTablesApi'
import { usePOS } from '../../context/POSContext.jsx'
import { groupTablesByFloor, normalizePosTable } from '../../utils/posTables'
import TableCard from './TableCard'

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

const FloorPopup = ({ onClose }) => {
  const [floors, setFloors] = useState([])
  const [activeFloor, setActiveFloor] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const { selectTable } = usePOS()
  const floor = floors.find((item) => item.id === activeFloor) || floors[0]

  useEffect(() => {
    const loadTables = async () => {
      try {
        setError('')
        const response = await getPosTables()
        const tables = (response.data.tables || []).map(normalizePosTable)
        const groupedFloors = groupTablesByFloor(tables)
        setFloors(groupedFloors)
        setActiveFloor((current) => current || groupedFloors[0]?.id || null)
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load tables.')
      } finally {
        setIsLoading(false)
      }
    }

    loadTables()
  }, [])

  const handleSelect = (table) => {
    selectTable({ ...table, floor: floor.name })
    onClose()
  }

  return (
    <Modal title="Select Floor & Table" onClose={onClose} size="max-w-4xl">
      {error ? (
        <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-black text-red-700">
          {error}
        </div>
      ) : null}
      <div className="mb-5 flex flex-wrap gap-2">
        {floors.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveFloor(item.id)}
            className={`rounded-2xl px-4 py-2 text-sm font-black ${
              activeFloor === item.id
                ? 'bg-[#8B4513] text-white'
                : 'bg-[#FFF8F0] text-[#8B4513] ring-1 ring-[#E7D8C9]'
            }`}
          >
            {item.name}
          </button>
        ))}
      </div>
      {isLoading ? (
        <div className="rounded-2xl bg-[#FFF8F0] px-4 py-3 text-sm font-black text-[#8B4513]">
          Loading tables...
        </div>
      ) : null}
      {!isLoading && !floors.length ? (
        <div className="rounded-2xl bg-[#FFF8F0] px-4 py-3 text-sm font-black text-[#8B4513]">
          No tables found.
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(floor?.tables || []).map((table) => (
          <TableCard key={table.id} table={table} onSelect={handleSelect} />
        ))}
      </div>
    </Modal>
  )
}

export default FloorPopup
