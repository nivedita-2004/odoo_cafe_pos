import { Edit, Loader2, Search, Trash2, UserCheck, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useGlobalSearch } from '../../context/GlobalSearchContext.jsx'
import { usePOS } from '../../context/POSContext.jsx'

const blankForm = { name: '', email: '', phone: '' }

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

const EmptyState = ({ title, description, icon: Icon }) => (
  <div className="rounded-2xl border border-dashed border-[#E7D8C9] bg-[#FFF8F0] p-6 text-center">
    {Icon ? <Icon className="mx-auto mb-3 h-8 w-8 text-[#8B4513]" /> : null}
    <h3 className="text-base font-black text-[#2D1B0E]">{title}</h3>
    <p className="mt-2 text-sm leading-6 text-[#2D1B0E]/60">{description}</p>
  </div>
)

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

const CustomersPage = () => {
  const { customers, selectedCustomer, selectCustomer, upsertCustomer, deleteCustomer } = usePOS()
  const { searchQuery } = useGlobalSearch()
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(blankForm)

  const filteredCustomers = useMemo(
    () => {
      const effectiveSearch = (search || searchQuery).toLowerCase()

      return customers.filter((customer) =>
        `${customer.name} ${customer.email} ${customer.phone}`.toLowerCase().includes(effectiveSearch),
      )
    },
    [customers, search, searchQuery],
  )

  const openForm = (customer = null) => {
    setEditing(customer)
    setForm(customer || blankForm)
  }

  const save = async () => {
    if (!form.name.trim()) return
    await upsertCustomer(form)
    setEditing(null)
    setForm(blankForm)
  }

  return (
    <main className="p-4">
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#E7D8C9]">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#8B4513]/55">Customers</p>
            <h1 className="text-2xl font-black">Customer Management</h1>
          </div>
          {/* <Button className="w-auto" onClick={() => openForm()}>
            <Plus className="h-4 w-4" />
            Add Customer
          </Button> */}
        </div>

        <div className="relative max-w-[600px] mb-5">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8B4513]/55" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, email, phone"
            className="h-10 w-full rounded-sm border border-[#E7D8C9] bg-[#FFF8F0] pl-10 pr-4 text-sm font-semibold outline-none focus:border-[#8B4513]"
          />
        </div>

        {!filteredCustomers.length ? (
          <EmptyState title="No customers found" description="Create a customer to attach them with POS orders." icon={Search} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredCustomers.map((customer) => (
              <div key={customer.id} className="rounded-2xl bg-[#FFF8F0] p-4 ring-1 ring-[#E7D8C9]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-black">{customer.name}</h2>
                    <p className="mt-1 text-sm text-[#2D1B0E]/60">{customer.email}</p>
                    <p className="text-sm text-[#2D1B0E]/60">{customer.phone}</p>
                  </div>
                  {selectedCustomer?.id === customer.id ? (
                    <span className="rounded-full bg-[#22C55E]/10 px-3 py-1 text-xs font-black text-[#15803D]">Selected</span>
                  ) : null}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={() => selectCustomer(customer)} className="rounded-xl bg-[#8B4513] px-3 py-2 text-sm font-black text-white">
                    <UserCheck className="inline h-4 w-4" /> Select
                  </button>
                  <button type="button" onClick={() => openForm(customer)} className="rounded-xl bg-white px-3 py-2 text-sm font-black text-[#8B4513] ring-1 ring-[#E7D8C9]">
                    <Edit className="inline h-4 w-4" /> Edit
                  </button>
                  <button type="button" onClick={() => deleteCustomer(customer.id)} className="rounded-xl bg-[#EF4444]/10 px-3 py-2 text-sm font-black text-[#EF4444]">
                    <Trash2 className="inline h-4 w-4" /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {editing !== null ? (
        <Modal title={editing?.id ? 'Edit Customer' : 'Create Customer'} onClose={() => setEditing(null)} size="max-w-md">
          <div className="space-y-3">
            {[
              ['name', 'Name'],
              ['email', 'Email'],
              ['phone', 'Phone Number'],
            ].map(([field, label]) => (
              <input
                key={field}
                value={form[field] || ''}
                onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))}
                placeholder={label}
                className="min-h-11 w-full rounded-2xl border border-[#E7D8C9] px-4 text-sm font-semibold outline-none focus:border-[#8B4513]"
              />
            ))}
            <Button onClick={save}>{editing?.id ? 'Update Customer' : 'Create Customer'}</Button>
          </div>
        </Modal>
      ) : null}
    </main>
  )
}

export default CustomersPage
