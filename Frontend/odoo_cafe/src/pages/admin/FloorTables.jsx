import {
  Armchair,
  Building2,
  Eye,
  Layers,
  Pencil,
  Plus,
  Power,
  Search,
  Trash2,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  createAdminFloor,
  createAdminTable,
  deleteAdminFloor,
  deleteAdminTable,
  getAdminFloors,
  getAdminTables,
  updateAdminTable,
} from '../../api/floorTablesApi'
import { useGlobalSearch } from '../../context/GlobalSearchContext.jsx'

const emptyFloorForm = {
  name: '',
}

const emptyTableForm = {
  floorId: '',
  number: '',
  seats: 2,
  status: 'available',
  isEnabled: true,
}

const statusStyles = {
  available: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  active: 'bg-amber-50 text-amber-700 ring-amber-100',
  disabled: 'bg-slate-100 text-slate-600 ring-slate-200',
}

const inputClass =
  'h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#c8793f] focus:ring-2 focus:ring-[#fcd8b8]'

const tablesPerPage = 8

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

const Field = ({ label, children }) => (
  <label className="block">
    <span className="text-xs font-black uppercase text-slate-500">{label}</span>
    <div className="mt-2">{children}</div>
  </label>
)

const ModalShell = ({ title, children, onClose, size = 'max-w-2xl' }) => (
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

const normalizeTable = (table) => ({
  id: table.id,
  floorId: table.floor_id,
  floorName: table.floor_name,
  number: String(table.table_number || ''),
  seats: Number(table.seats || 1),
  status: table.pos_status || (Number(table.has_active_order) === 1 ? 'active' : 'available'),
  isEnabled: Number(table.is_active) === 1,
})

const buildFloorsWithTables = (floorRows, tableRows) => {
  const tables = tableRows.map(normalizeTable)

  return floorRows.map((floor) => ({
    id: floor.id,
    name: floor.name,
    tables: tables.filter((table) => table.floorId === floor.id),
  }))
}

const FloorTables = () => {
  const [floors, setFloors] = useState([])
  const [activeFloorId, setActiveFloorId] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [currentPage, setCurrentPage] = useState(1)
  const [modalMode, setModalMode] = useState(null)
  const [selectedFloor, setSelectedFloor] = useState(null)
  const [selectedTable, setSelectedTable] = useState(null)
  const [floorForm, setFloorForm] = useState(emptyFloorForm)
  const [tableForm, setTableForm] = useState(emptyTableForm)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const { searchQuery } = useGlobalSearch()

  const loadFloorTables = async (preferredFloorName = '') => {
    try {
      setIsLoading(true)
      setError('')
      const [floorsResponse, tablesResponse] = await Promise.all([
        getAdminFloors(),
        getAdminTables(),
      ])
      const nextFloors = buildFloorsWithTables(
        floorsResponse.data.floors || [],
        tablesResponse.data.tables || [],
      )
      setFloors(nextFloors)
      const preferredFloor = nextFloors.find(
        (floor) => floor.name.toLowerCase() === preferredFloorName.toLowerCase(),
      )
      setActiveFloorId((current) => preferredFloor?.id || current || nextFloors[0]?.id || '')
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load floors and tables.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const loadInitialFloorTables = async () => {
      try {
        setIsLoading(true)
        setError('')
        const [floorsResponse, tablesResponse] = await Promise.all([
          getAdminFloors(),
          getAdminTables(),
        ])
        const nextFloors = buildFloorsWithTables(
          floorsResponse.data.floors || [],
          tablesResponse.data.tables || [],
        )
        setFloors(nextFloors)
        setActiveFloorId(nextFloors[0]?.id || '')
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load floors and tables.')
      } finally {
        setIsLoading(false)
      }
    }

    loadInitialFloorTables()
  }, [])

  const allTables = useMemo(
    () =>
      floors.flatMap((floor) =>
        floor.tables.map((table) => ({
          ...table,
          floorId: floor.id,
          floorName: floor.name,
        })),
      ),
    [floors],
  )

  const tabFloors = floors

  const activeFloor =
    tabFloors.find((floor) => String(floor.id) === String(activeFloorId)) || tabFloors[0]

  const summaryCards = useMemo(() => {
    const enabledTables = allTables.filter((table) => table.isEnabled)
    const disabledTables = allTables.filter((table) => !table.isEnabled)
    const activeTables = enabledTables.filter((table) => table.status === 'active')

    return [
      {
        label: 'Total Floors',
        value: floors.length,
        icon: Building2,
        iconClass: 'bg-[#fff3e8] text-[#9a5a2e] ring-[#fcd8b8]',
      },
      {
        label: 'Total Tables',
        value: allTables.length,
        icon: Armchair,
        iconClass: 'bg-violet-50 text-violet-600 ring-violet-100',
      },
      {
        label: 'Active Tables',
        value: activeTables.length,
        icon: Power,
        iconClass: 'bg-amber-50 text-amber-600 ring-amber-100',
      },
      {
        label: 'Enabled Tables',
        value: enabledTables.length,
        icon: Layers,
        iconClass: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
      },
      {
        label: 'Disabled Tables',
        value: disabledTables.length,
        icon: Power,
        iconClass: 'bg-slate-100 text-slate-600 ring-slate-200',
      },
    ]
  }, [allTables, floors.length])

  const filteredTables = useMemo(() => {
    const search = (searchTerm || searchQuery).trim().toLowerCase()

    return allTables
      .filter((table) => String(table.floorId) === String(activeFloor?.id))
      .filter((table) =>
        `${table.floorName} ${table.number} ${table.seats} ${table.status} ${table.isEnabled ? 'enabled' : 'disabled'}`
          .toLowerCase()
          .includes(search),
      )
      .filter((table) => {
        if (statusFilter === 'All') return true
        if (statusFilter === 'disabled') return !table.isEnabled
        return table.isEnabled && table.status === statusFilter
      })
  }, [activeFloor?.id, allTables, searchQuery, searchTerm, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredTables.length / tablesPerPage))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const paginatedTables = filteredTables.slice(
    (safeCurrentPage - 1) * tablesPerPage,
    safeCurrentPage * tablesPerPage,
  )

  const goToPage = (page) => {
    setCurrentPage(Math.min(Math.max(page, 1), totalPages))
  }

  const closeModal = () => {
    setModalMode(null)
    setSelectedFloor(null)
    setSelectedTable(null)
    setIsSaving(false)
  }

  const openAddFloor = () => {
    setFloorForm(emptyFloorForm)
    setModalMode('add-floor')
  }

  const openAddTable = () => {
    setSelectedTable(null)
    setTableForm({
      ...emptyTableForm,
      floorId: activeFloor?.id || tabFloors[0]?.id || '',
    })
    setModalMode('add-table')
  }

  const openEditTable = (table) => {
    setSelectedTable(table)
    setTableForm({
      floorId: table.floorId,
      number: table.number,
      seats: table.seats,
      status: table.status,
      isEnabled: table.isEnabled,
    })
    setModalMode('edit-table')
  }

  const openViewTable = (table) => {
    setSelectedTable(table)
    setModalMode('view-table')
  }

  const openDeleteFloor = (floor) => {
    setSelectedFloor(floor)
    setModalMode('delete-floor')
  }

  const openDeleteTable = (table) => {
    setSelectedTable(table)
    setModalMode('delete-table')
  }

  const saveFloor = async (event) => {
    event.preventDefault()
    const name = floorForm.name.trim()
    if (!name) return

    try {
      setIsSaving(true)
      setError('')
      await createAdminFloor({ name })
      await loadFloorTables(name)
      setCurrentPage(1)
      closeModal()
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to save floor.')
      setIsSaving(false)
    }
  }

  const saveTable = async (event) => {
    event.preventDefault()
    const payload = {
      floor_id: Number(tableForm.floorId),
      table_number: tableForm.number.trim(),
      seats: Number(tableForm.seats) || 1,
      is_active: tableForm.isEnabled ? 1 : 0,
      pos_status: tableForm.status,
    }

    if (!payload.table_number) return

    try {
      setIsSaving(true)
      setError('')
      if (selectedTable) {
        await updateAdminTable(selectedTable.id, payload)
      } else {
        await createAdminTable(payload)
      }
      await loadFloorTables()
      setActiveFloorId(String(tableForm.floorId))
      setCurrentPage(1)
      closeModal()
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to save table.')
      setIsSaving(false)
    }
  }

  const deleteFloor = async () => {
    if (!selectedFloor) return

    try {
      setIsSaving(true)
      setError('')
      await deleteAdminFloor(selectedFloor.id)
      await loadFloorTables()
      setCurrentPage(1)
      closeModal()
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to delete floor.')
      setIsSaving(false)
    }
  }

  const deleteTable = async () => {
    if (!selectedTable) return

    try {
      setIsSaving(true)
      setError('')
      await deleteAdminTable(selectedTable.id)
      await loadFloorTables()
      closeModal()
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to delete table.')
      setIsSaving(false)
    }
  }

  const toggleTableStatus = async (table) => {
    try {
      setError('')
      await updateAdminTable(table.id, {
        floor_id: table.floorId,
        table_number: table.number,
        seats: table.seats,
        is_active: table.isEnabled ? 0 : 1,
        pos_status: table.status,
      })
      await loadFloorTables()
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update table status.')
    }
  }

  return (
    <div className="min-h-screen">
      {error ? (
        <div className="mb-3 rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map((card) => (
          <SummaryCard key={card.label} {...card} />
        ))}
      </div>

      <section className="mt-5 rounded-lg border border-slate-100 bg-white p-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-1 flex-nowrap gap-2 overflow-x-auto no-scrollbar pb-1">
            {tabFloors.map((floor) => (
              <button
                key={floor.id}
                type="button"
                onClick={() => {
                  setActiveFloorId(floor.id)
                  setCurrentPage(1)
                }}
                className={`shrink-0 rounded-lg px-4 py-2 text-sm font-black ${
                  String(activeFloorId) === String(floor.id)
                    ? 'bg-[#c8793f] text-white'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {floor.name}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            {activeFloor ? (
              <button
                type="button"
                onClick={() => openDeleteFloor(activeFloor)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-rose-50 px-4 text-sm font-black text-rose-600 hover:bg-rose-100"
              >
                <Trash2 className="h-4 w-4" />
                Delete Floor
              </button>
            ) : null}
            <button
              type="button"
              onClick={openAddFloor}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-black text-slate-600 hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" />
              Add Floor
            </button>
            <button
              type="button"
              onClick={openAddTable}
              disabled={!tabFloors.length}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#c8793f] px-4 text-sm font-black text-white transition hover:bg-[#9a5a2e] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Add Table
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="mt-5 rounded-lg border border-[#fcd8b8] bg-[#fff3e8] px-4 py-3 text-sm font-bold text-[#9a5a2e]">
            Loading floors and tables...
          </div>
        ) : null}

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value)
                setCurrentPage(1)
              }}
              placeholder="Search table number"
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
            <option value="available">Available</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {paginatedTables.map((table) => (
            <article
              key={table.id}
              className={`rounded-lg border bg-white p-3 ${
                table.isEnabled
                  ? 'border-slate-200'
                  : 'border-slate-200 bg-slate-50 opacity-80'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff3e8] text-[#9a5a2e] ring-1 ring-[#fcd8b8]">
                    <Armchair className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-black uppercase text-slate-500">
                      {table.floorName}
                    </p>
                    <h3 className="text-xl font-black text-slate-950">
                      {table.number}
                    </h3>
                  </div>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${table.isEnabled ? statusStyles.available : statusStyles.disabled}`}>
                  {table.isEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-slate-50 p-2.5">
                  <p className="text-xs font-black uppercase text-slate-500">Seats</p>
                  <p className="text-base font-black text-slate-950">{table.seats}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-2.5">
                  <p className="text-xs font-black uppercase text-slate-500">POS Status</p>
                  <span className={`mt-1.5 inline-flex rounded-full px-2.5 py-1 text-xs font-black ring-1 ${statusStyles[table.status]}`}>
                    {table.status === 'active' ? 'Occupied' : 'Available'}
                  </span>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => openViewTable(table)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label="View table">
                    <Eye className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => openEditTable(table)} className="rounded-lg p-2 text-[#9a5a2e] hover:bg-[#fff3e8]" aria-label="Edit table">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => openDeleteTable(table)} className="rounded-lg p-2 text-rose-500 hover:bg-rose-50" aria-label="Delete table">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <button type="button" onClick={() => toggleTableStatus(table)} className="rounded-lg px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-100">
                  {table.isEnabled ? 'Disable' : 'Enable'}
                </button>
              </div>
            </article>
          ))}
        </div>

        {!isLoading && filteredTables.length === 0 ? (
          <div className="mt-5 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
            <Armchair className="mx-auto h-9 w-9 text-slate-400" />
            <h3 className="mt-3 text-base font-black text-slate-900">No tables found</h3>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              Add a table under this floor or change your filters.
            </p>
          </div>
        ) : null}

        {filteredTables.length > 0 ? (
          <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-bold text-slate-500">
              Showing {(safeCurrentPage - 1) * tablesPerPage + 1}-
              {Math.min(safeCurrentPage * tablesPerPage, filteredTables.length)} of {filteredTables.length}
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

      {modalMode === 'add-floor' ? (
        <ModalShell title="Add Floor" onClose={closeModal} size="max-w-md">
          <form onSubmit={saveFloor} className="space-y-4">
            <Field label="Floor Name">
              <input required value={floorForm.name} onChange={(event) => setFloorForm({ name: event.target.value })} placeholder="Ground Floor" className={inputClass} />
            </Field>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={closeModal} className="h-11 rounded-lg border border-slate-200 px-5 text-sm font-black text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button disabled={isSaving} type="submit" className="h-11 rounded-lg bg-[#c8793f] px-5 text-sm font-black text-white hover:bg-[#9a5a2e] disabled:cursor-not-allowed disabled:opacity-60">
                {isSaving ? 'Saving...' : 'Save Floor'}
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {(modalMode === 'add-table' || modalMode === 'edit-table') ? (
        <ModalShell title={modalMode === 'edit-table' ? 'Edit Table' : 'Add Table'} onClose={closeModal}>
          <form onSubmit={saveTable} className="grid gap-4 md:grid-cols-2">
            <Field label="Floor">
              <select value={tableForm.floorId} onChange={(event) => setTableForm((current) => ({ ...current, floorId: event.target.value }))} className={inputClass}>
                {tabFloors.map((floor) => (
                  <option key={floor.id} value={floor.id}>{floor.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Table Number">
              <input required value={tableForm.number} onChange={(event) => setTableForm((current) => ({ ...current, number: event.target.value }))} placeholder="T1" className={inputClass} />
            </Field>
            <Field label="Number of Seats">
              <input required type="number" min="1" value={tableForm.seats} onChange={(event) => setTableForm((current) => ({ ...current, seats: event.target.value }))} className={inputClass} />
            </Field>
            <Field label="POS Status">
              <select value={tableForm.status} onChange={(event) => setTableForm((current) => ({ ...current, status: event.target.value }))} className={inputClass}>
                <option value="available">Available</option>
                <option value="active">Occupied</option>
              </select>
            </Field>
            <Field label="Active Status">
              <select value={tableForm.isEnabled ? 'enabled' : 'disabled'} onChange={(event) => setTableForm((current) => ({ ...current, isEnabled: event.target.value === 'enabled' }))} className={inputClass}>
                <option value="enabled">Enabled</option>
                <option value="disabled">Disabled</option>
              </select>
            </Field>
            <div className="flex flex-col gap-3 md:col-span-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={closeModal} className="h-11 rounded-lg border border-slate-200 px-5 text-sm font-black text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button disabled={isSaving} type="submit" className="h-11 rounded-lg bg-[#c8793f] px-5 text-sm font-black text-white hover:bg-[#9a5a2e] disabled:cursor-not-allowed disabled:opacity-60">
                {isSaving ? 'Saving...' : 'Save Table'}
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {modalMode === 'view-table' && selectedTable ? (
        <ModalShell title="Table Details" onClose={closeModal} size="max-w-xl">
          <div className="space-y-4">
            {[
              ['Table Number', selectedTable.number],
              ['Floor', selectedTable.floorName],
              ['Number of Seats', selectedTable.seats],
              ['Active Status', selectedTable.isEnabled ? 'Enabled' : 'Disabled'],
              ['POS Status', selectedTable.status === 'active' ? 'Occupied' : 'Available'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-black uppercase text-slate-500">{label}</p>
                <p className="mt-1 text-sm font-black text-slate-900">{value}</p>
              </div>
            ))}
          </div>
        </ModalShell>
      ) : null}

      {modalMode === 'delete-floor' && selectedFloor ? (
        <ModalShell title="Delete Floor" onClose={closeModal} size="max-w-md">
          <p className="text-sm font-semibold leading-6 text-slate-600">
            Delete <span className="font-black text-slate-950">{selectedFloor.name}</span> and all tables under it?
          </p>
          <div className="mt-5 flex justify-end gap-3">
            <button type="button" onClick={closeModal} className="h-11 rounded-lg border border-slate-200 px-5 text-sm font-black text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
            <button disabled={isSaving} type="button" onClick={deleteFloor} className="h-11 rounded-lg bg-rose-500 px-5 text-sm font-black text-white hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60">
              {isSaving ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </ModalShell>
      ) : null}

      {modalMode === 'delete-table' && selectedTable ? (
        <ModalShell title="Delete Table" onClose={closeModal} size="max-w-md">
          <p className="text-sm font-semibold leading-6 text-slate-600">
            Delete <span className="font-black text-slate-950">{selectedTable.number}</span> from {selectedTable.floorName}?
          </p>
          <div className="mt-5 flex justify-end gap-3">
            <button type="button" onClick={closeModal} className="h-11 rounded-lg border border-slate-200 px-5 text-sm font-black text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
            <button disabled={isSaving} type="button" onClick={deleteTable} className="h-11 rounded-lg bg-rose-500 px-5 text-sm font-black text-white hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60">
              {isSaving ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </ModalShell>
      ) : null}
    </div>
  )
}

export default FloorTables
