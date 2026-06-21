import { Loader2, X } from 'lucide-react'
import { useState } from 'react'
import { usePOS } from '../../context/POSContext.jsx'

const blankCustomer = { name: '', email: '', phone: '' }

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
        <button
          type="button"
          onClick={onClose}
          className="rounded-2xl p-2 text-[#8B4513] hover:bg-[#FFF8F0]"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="max-h-[calc(92vh-64px)] overflow-auto p-5">{children}</div>
    </div>
  </div>
)

const CustomerModal = ({ onClose }) => {
  const { customers, selectCustomer, upsertCustomer } = usePOS()
  const [search, setSearch] = useState('')
  const [form, setForm] = useState(blankCustomer)
  const filtered = customers.filter((customer) =>
    `${customer.name} ${customer.email} ${customer.phone}`.toLowerCase().includes(search.toLowerCase()),
  )

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }))

  const save = () => {
    if (!form.name.trim()) return
    upsertCustomer(form)
    setForm(blankCustomer)
  }

  return (
    <Modal title="Select Customer" onClose={onClose} size="max-w-3xl">
      <div className="grid gap-5 lg:grid-cols-[1fr_0.85fr]">
        <div>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search customer"
            className="mb-4 min-h-11 w-full rounded-2xl border border-[#E7D8C9] px-4 font-semibold outline-none focus:border-[#8B4513]"
          />
          <div className="grid max-h-80 gap-3 overflow-auto">
            {filtered.map((customer) => (
              <div key={customer.id} className="rounded-2xl bg-[#FFF8F0] p-4 ring-1 ring-[#E7D8C9]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-black">{customer.name}</h3>
                    <p className="text-sm text-[#2D1B0E]/60">{customer.email}</p>
                    <p className="text-sm text-[#2D1B0E]/60">{customer.phone}</p>
                  </div>
                  <Button
                    className="min-h-10 w-auto rounded-xl px-4 py-2 text-xs"
                    onClick={() => {
                      selectCustomer(customer)
                      onClose()
                    }}
                  >
                    Select
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl bg-[#FFF8F0] p-4 ring-1 ring-[#E7D8C9]">
          <h3 className="mb-3 font-black">Create Customer</h3>
          <div className="space-y-3">
            {[
              ['name', 'Name'],
              ['email', 'Email'],
              ['phone', 'Phone Number'],
            ].map(([field, label]) => (
              <input
                key={field}
                value={form[field]}
                onChange={(event) => update(field, event.target.value)}
                placeholder={label}
                className="min-h-11 w-full rounded-2xl border border-[#E7D8C9] px-4 text-sm font-semibold outline-none focus:border-[#8B4513]"
              />
            ))}
            <Button onClick={save}>Create Customer</Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default CustomerModal
