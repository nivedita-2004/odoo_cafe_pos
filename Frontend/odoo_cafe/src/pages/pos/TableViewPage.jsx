import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { getPosTables } from '../../api/posTablesApi'
import TableCard from '../../components/pos/TableCard'
import { useGlobalSearch } from '../../context/GlobalSearchContext.jsx'
import { usePOS } from '../../context/POSContext.jsx'
import { formatCurrency } from '../../utils/formatCurrency'
import { tableKey } from '../../utils/orderHelpers'
import { groupTablesByFloor, normalizePosTable } from '../../utils/posTables'

const TableViewPage = () => {
  const { selectTable, orders } = usePOS()
  const { searchQuery } = useGlobalSearch()
  const { openFloorPopup } = useOutletContext()
  const navigate = useNavigate()
  const [floors, setFloors] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadTables = async () => {
      try {
        setError('')
        const response = await getPosTables()
        const tables = (response.data.tables || []).map(normalizePosTable)
        setFloors(groupTablesByFloor(tables))
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load tables.')
      } finally {
        setIsLoading(false)
      }
    }

    loadTables()
  }, [])

  const handleOpen = (table, floorName) => {
    selectTable({ ...table, floor: floorName })
    navigate('/pos')
  }

  const visibleFloors = useMemo(() => {
    const search = searchQuery.trim().toLowerCase()
    if (!search) return floors

    return floors
      .map((floor) => ({
        ...floor,
        tables: floor.tables.filter((table) =>
          `${floor.name} ${table.number} ${table.seats} ${table.status}`.toLowerCase().includes(search),
        ),
      }))
      .filter((floor) => floor.tables.length)
  }, [floors, searchQuery])

  return (
    <main className="p-4">
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#E7D8C9]">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#8B4513]/55">Tables</p>
            <h1 className="text-2xl font-black">Table View</h1>
          </div>
          <button type="button" onClick={openFloorPopup} className="rounded-2xl bg-[#8B4513] px-4 py-3 text-sm font-black text-white">
            Open Floor Popup
          </button>
        </div>
        {error ? (
          <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-black text-red-700">
            {error}
          </div>
        ) : null}
        {isLoading ? (
          <div className="rounded-2xl bg-[#FFF8F0] px-4 py-3 text-sm font-black text-[#8B4513]">
            Loading tables...
          </div>
        ) : null}
        <div className="space-y-6">
          {visibleFloors.map((floor) => (
            <div key={floor.id}>
              <h2 className="mb-3 text-lg font-black">{floor.name}</h2>
              <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
                {floor.tables.map((table) => {
                  const order = orders.find((item) => item.status !== 'Cancelled' && tableKey(item.table) === tableKey(table))
                  return (
                    <TableCard
                      key={table.id}
                      table={{ ...table, status: order ? 'active' : table.status }}
                      amount={order ? formatCurrency(order.amount) : table.activeOrderAmount ? formatCurrency(table.activeOrderAmount) : null}
                      onSelect={() => handleOpen(table, floor.name)}
                    />
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}

export default TableViewPage
