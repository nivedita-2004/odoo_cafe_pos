import {
  Banknote,
  CreditCard,
  IndianRupee,
  QrCode,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  getAdminPaymentMethods,
  updateAdminPaymentMethod,
} from '../../api/paymentMethodsApi'
import { useGlobalSearch } from '../../context/GlobalSearchContext.jsx'
import { formatCurrency } from '../../utils/formatCurrency'

const methodsPerPage = 3

const methodIcons = {
  cash: Banknote,
  'digital-card': CreditCard,
  'upi-qr': QrCode,
}

const methodIconClasses = {
  cash: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
  'digital-card': 'bg-violet-50 text-violet-600 ring-violet-100',
  'upi-qr': 'bg-[#fff3e8] text-[#9a5a2e] ring-[#fcd8b8]',
}

const methodMeta = {
  cash: {
    name: 'Cash',
    description: 'Available at checkout when enabled.',
    settlement: 'Instant',
  },
  'digital-card': {
    name: 'Digital/Card',
    description: 'Represents card and bank payments.',
    settlement: 'T+1 Day',
  },
  'upi-qr': {
    name: 'UPI QR',
    description: 'Requires a UPI ID. QR code is generated dynamically at payment.',
    settlement: 'Instant',
  },
}

const getMethodKey = (methodName) => {
  const name = String(methodName || '').toLowerCase()
  if (name.includes('cash')) return 'cash'
  if (name.includes('upi')) return 'upi-qr'
  return 'digital-card'
}

const normalizeMethod = (method) => {
  const key = getMethodKey(method.name)
  const meta = methodMeta[key]

  return {
    id: key,
    recordId: method.id,
    name: meta.name,
    description: meta.description,
    enabled: Number(method.is_enabled) === 1,
    settlement: meta.settlement,
    transactionsToday: Number(method.transactions_today || 0),
    amountToday: Number(method.amount_today || 0),
    paymentStatus: method.payment_status || 'NO_PAYMENT',
    upiId: method.upi_id || '',
  }
}

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

const Toggle = ({ enabled, disabled, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`relative h-7 w-12 rounded-full transition ${
      enabled ? 'bg-[#c8793f]' : 'bg-slate-300'
    } disabled:cursor-not-allowed disabled:opacity-60`}
    aria-label={enabled ? 'Disable payment method' : 'Enable payment method'}
  >
    <span
      className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
        enabled ? 'left-6' : 'left-1'
      }`}
    />
  </button>
)

const PaymentMethod = () => {
  const [methods, setMethods] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [savingMethodId, setSavingMethodId] = useState(null)
  const [error, setError] = useState('')
  const { searchQuery } = useGlobalSearch()

  const loadPaymentMethods = async () => {
    try {
      setIsLoading(true)
      setError('')
      const response = await getAdminPaymentMethods()
      setMethods((response.data.paymentMethods || []).map(normalizeMethod))
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load payment methods.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const loadInitialPaymentMethods = async () => {
      try {
        setIsLoading(true)
        setError('')
        const response = await getAdminPaymentMethods()
        setMethods((response.data.paymentMethods || []).map(normalizeMethod))
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load payment methods.')
      } finally {
        setIsLoading(false)
      }
    }

    loadInitialPaymentMethods()
  }, [])

  const summaryCards = useMemo(() => {
    const totalAmount = methods.reduce((sum, method) => sum + method.amountToday, 0)
    const cashAmount = methods.find((method) => method.id === 'cash')?.amountToday || 0
    const cardAmount = methods.find((method) => method.id === 'digital-card')?.amountToday || 0
    const upiMethod = methods.find((method) => method.id === 'upi-qr')
    const upiAmount = upiMethod?.amountToday || 0

    return [
      {
        label: 'Total Collection',
        value: formatCurrency(totalAmount),
        icon: IndianRupee,
        iconClass: 'bg-[#fff3e8] text-[#9a5a2e] ring-[#fcd8b8]',
      },
      {
        label: 'Cash Collection',
        value: formatCurrency(cashAmount),
        icon: Banknote,
        iconClass: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
      },
      {
        label: 'Card Collection',
        value: formatCurrency(cardAmount),
        icon: CreditCard,
        iconClass: 'bg-violet-50 text-violet-600 ring-violet-100',
      },
      {
        label: 'UPI Collection',
        value: formatCurrency(upiAmount),
        icon: QrCode,
        iconClass: 'bg-amber-50 text-amber-600 ring-amber-100',
      },
    ]
  }, [methods])

  const filteredMethods = useMemo(() => {
    const search = searchQuery.trim().toLowerCase()

    return methods.filter((method) =>
      `${method.name} ${method.description} ${method.settlement} ${method.paymentStatus} ${method.upiId} ${method.enabled ? 'enabled active' : 'disabled inactive'}`
        .toLowerCase()
        .includes(search),
    )
  }, [methods, searchQuery])

  const totalPages = Math.max(1, Math.ceil(filteredMethods.length / methodsPerPage))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const paginatedMethods = filteredMethods.slice(
    (safeCurrentPage - 1) * methodsPerPage,
    safeCurrentPage * methodsPerPage,
  )

  const goToPage = (page) => {
    setCurrentPage(Math.min(Math.max(page, 1), totalPages))
  }

  const toggleMethod = async (method) => {
    try {
      setError('')
      setSavingMethodId(method.recordId)
      await updateAdminPaymentMethod(method.recordId, {
        is_enabled: method.enabled ? 0 : 1,
        upi_id: method.upiId || null,
      })
      await loadPaymentMethods()
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update payment method.')
    } finally {
      setSavingMethodId(null)
    }
  }

  const updateUpiId = (value) => {
    setMethods((current) =>
      current.map((method) =>
        method.id === 'upi-qr' ? { ...method, upiId: value } : method,
      ),
    )
  }

  const saveUpiId = async (method) => {
    try {
      setError('')
      setSavingMethodId(method.recordId)
      await updateAdminPaymentMethod(method.recordId, {
        is_enabled: method.enabled ? 1 : 0,
        upi_id: method.upiId,
      })
      await loadPaymentMethods()
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to save UPI ID.')
    } finally {
      setSavingMethodId(null)
    }
  }

  return (
    <div className="min-h-screen">
      {error ? (
        <div className="mb-3 rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <SummaryCard key={card.label} {...card} />
        ))}
      </div>

      <section className="mt-5 rounded-lg border border-slate-100 bg-white p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-black text-slate-900">Payment Method Setup</h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Enable or disable checkout methods for the cafe.
            </p>
          </div>
          <span className="rounded-full bg-[#fff3e8] px-3 py-1 text-xs font-black text-[#9a5a2e]">
            {methods.filter((method) => method.enabled).length} active
          </span>
        </div>

        {isLoading ? (
          <div className="mt-5 rounded-lg border border-[#fcd8b8] bg-[#fff3e8] px-4 py-3 text-sm font-bold text-[#9a5a2e]">
            Loading payment methods...
          </div>
        ) : null}

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {paginatedMethods.map((method) => {
            const Icon = methodIcons[method.id] || CreditCard

            return (
              <article
                key={method.id}
                className="rounded-lg border border-slate-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 gap-3">
                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 ${methodIconClasses[method.id] || methodIconClasses['digital-card']}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-base font-black text-slate-950">{method.name}</h4>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${
                            method.enabled
                              ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
                              : 'bg-slate-100 text-slate-600 ring-slate-200'
                          }`}
                        >
                          {method.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                        {method.description}
                      </p>
                    </div>
                  </div>
                  <Toggle
                    enabled={method.enabled}
                    disabled={savingMethodId === method.recordId}
                    onClick={() => toggleMethod(method)}
                  />
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-4">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs font-black uppercase text-slate-500">Today Amount</p>
                    <p className="mt-1 text-sm font-black text-slate-950">
                      {formatCurrency(method.amountToday)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs font-black uppercase text-slate-500">Transactions</p>
                    <p className="mt-1 text-sm font-black text-slate-950">
                      {method.transactionsToday}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs font-black uppercase text-slate-500">Payment Status</p>
                    <p className="mt-1 text-sm font-black text-slate-950">
                      {method.paymentStatus}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs font-black uppercase text-slate-500">Settlement</p>
                    <p className="mt-1 text-sm font-black text-slate-950">{method.settlement}</p>
                  </div>
                </div>

                {method.id === 'upi-qr' ? (
                  <div className="mt-4 rounded-lg border border-[#fcd8b8] bg-[#fff3e8] p-3">
                    <label className="block">
                      <span className="text-xs font-black uppercase text-[#9a5a2e]">UPI ID</span>
                      <input
                        value={method.upiId}
                        onChange={(event) => updateUpiId(event.target.value)}
                        onBlur={() => saveUpiId(method)}
                        disabled={savingMethodId === method.recordId}
                        placeholder="cafe@ybl"
                        className="mt-2 h-11 w-full rounded-lg border border-[#f0bd91] bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-[#c8793f] focus:ring-2 focus:ring-[#fcd8b8] disabled:cursor-not-allowed disabled:opacity-60"
                      />
                    </label>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-white text-[#9a5a2e] ring-1 ring-[#f0bd91]">
                        <QrCode className="h-9 w-9" />
                      </div>
                      <p className="text-xs font-bold leading-5 text-[#9a5a2e]">
                        QR will be generated dynamically from this UPI ID at payment screen.
                      </p>
                    </div>
                  </div>
                ) : null}
              </article>
            )
          })}
        </div>

        {!isLoading && filteredMethods.length === 0 ? (
          <div className="mt-5 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
            <CreditCard className="mx-auto h-9 w-9 text-slate-400" />
            <h3 className="mt-3 text-base font-black text-slate-900">No payment methods found</h3>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              Add payment methods in backend seed data first.
            </p>
          </div>
        ) : null}

        {filteredMethods.length > 0 ? (
        <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-bold text-slate-500">
            Showing {(safeCurrentPage - 1) * methodsPerPage + 1}-
            {Math.min(safeCurrentPage * methodsPerPage, filteredMethods.length)} of {filteredMethods.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => goToPage(safeCurrentPage - 1)}
              disabled={safeCurrentPage === 1}
              className="h-9 rounded-lg border border-slate-200 px-3 text-sm font-black text-slate-600 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50"
            >
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
            <button
              type="button"
              onClick={() => goToPage(safeCurrentPage + 1)}
              disabled={safeCurrentPage === totalPages}
              className="h-9 rounded-lg border border-slate-200 px-3 text-sm font-black text-slate-600 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50"
            >
              Next
            </button>
          </div>
        </div>
        ) : null}
      </section>
    </div>
  )
}

export default PaymentMethod
