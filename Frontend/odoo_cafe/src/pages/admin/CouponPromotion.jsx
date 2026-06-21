import {
  BadgePercent,
  Eye,
  Gift,
  Pencil,
  Plus,
  Power,
  Search,
  TicketPercent,
  Trash2,
  WandSparkles,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  createAdminCoupon,
  createAdminPromotion,
  deleteAdminCoupon,
  deleteAdminPromotion,
  getAdminCoupons,
  getAdminPromotions,
  updateAdminCoupon,
  updateAdminPromotion,
} from '../../api/discountsApi'
import { getAdminProducts } from '../../api/productsApi'
import { useGlobalSearch } from '../../context/GlobalSearchContext.jsx'
import { formatCurrency } from '../../utils/formatCurrency'

const emptyCouponForm = {
  code: '',
  discountType: 'percentage',
  discountValue: '',
  status: 'Active',
}

const emptyPromotionForm = {
  name: '',
  appliesTo: 'Product',
  target: '',
  minimumQuantity: '',
  minimumOrderAmount: '',
  discountType: 'percentage',
  discountValue: '',
  status: 'Active',
}

const inputClass =
  'h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#c8793f] focus:ring-2 focus:ring-[#fcd8b8]'

const statusStyles = {
  Active: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  Inactive: 'bg-slate-100 text-slate-600 ring-slate-200',
}

const itemsPerPage = 6

const formatDiscount = (type, value) =>
  type === 'percentage' ? `${value}% off` : `${formatCurrency(value)} off`

const toUiDiscountType = (type) => (String(type).toUpperCase() === 'FIXED' ? 'fixed' : 'percentage')

const toApiDiscountType = (type) => (type === 'fixed' ? 'FIXED' : 'PERCENTAGE')

const normalizeCoupon = (coupon) => ({
  id: coupon.id,
  code: coupon.code || '',
  discountType: toUiDiscountType(coupon.discount_type || coupon.discountType),
  discountValue: Number(coupon.discount_value || coupon.discountValue || 0),
  status: Number(coupon.is_active) === 1 ? 'Active' : 'Inactive',
  redemptions: Number(coupon.redemptions || 0),
})

const normalizePromotion = (promotion) => {
  const appliesTo = String(promotion.promotion_type || '').toUpperCase() === 'PRODUCT' ? 'Product' : 'Order'

  return {
    id: promotion.id,
    name: promotion.name || `${appliesTo} Promotion`,
    appliesTo,
    productId: promotion.product_id || '',
    target: appliesTo === 'Product' ? promotion.product_name || 'Selected Product' : 'Whole Order',
    minimumQuantity: promotion.min_quantity || '',
    minimumOrderAmount: promotion.min_order_amount || '',
    discountType: toUiDiscountType(promotion.discount_type || promotion.discountType),
    discountValue: Number(promotion.discount_value || promotion.discountValue || 0),
    status: Number(promotion.is_active) === 1 ? 'Active' : 'Inactive',
  }
}

const normalizeProductOption = (product) => ({
  id: product.id,
  name: product.name || product.product_name || '-',
})

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

const ModalShell = ({ title, children, onClose, size = 'max-w-3xl' }) => (
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

const CouponPromotion = () => {
  const [couponCodes, setCouponCodes] = useState([])
  const [promotions, setPromotions] = useState([])
  const [products, setProducts] = useState([])
  const [activeTab, setActiveTab] = useState('coupons')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [currentPage, setCurrentPage] = useState(1)
  const [modalMode, setModalMode] = useState(null)
  const [selectedItem, setSelectedItem] = useState(null)
  const [couponForm, setCouponForm] = useState(emptyCouponForm)
  const [promotionForm, setPromotionForm] = useState(emptyPromotionForm)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const { searchQuery } = useGlobalSearch()

  const loadDiscountData = async () => {
    try {
      setIsLoading(true)
      setError('')
      const [couponsResponse, promotionsResponse, productsResponse] = await Promise.all([
        getAdminCoupons(),
        getAdminPromotions(),
        getAdminProducts(),
      ])
      setCouponCodes((couponsResponse.data.coupons || []).map(normalizeCoupon))
      setPromotions((promotionsResponse.data.promotions || []).map(normalizePromotion))
      setProducts((productsResponse.data.products || []).map(normalizeProductOption))
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load discounts.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const loadInitialDiscountData = async () => {
      try {
        setIsLoading(true)
        setError('')
        const [couponsResponse, promotionsResponse, productsResponse] = await Promise.all([
          getAdminCoupons(),
          getAdminPromotions(),
          getAdminProducts(),
        ])
        setCouponCodes((couponsResponse.data.coupons || []).map(normalizeCoupon))
        setPromotions((promotionsResponse.data.promotions || []).map(normalizePromotion))
        setProducts((productsResponse.data.products || []).map(normalizeProductOption))
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load discounts.')
      } finally {
        setIsLoading(false)
      }
    }

    loadInitialDiscountData()
  }, [])

  const summaryCards = useMemo(() => {
    const activeCoupons = couponCodes.filter((coupon) => coupon.status === 'Active')
    const activePromotions = promotions.filter((promotion) => promotion.status === 'Active')

    return [
      {
        label: 'Coupon Codes',
        value: couponCodes.length,
        icon: TicketPercent,
        iconClass: 'bg-[#fff3e8] text-[#9a5a2e] ring-[#fcd8b8]',
      },
      {
        label: 'Automated Promotions',
        value: promotions.length,
        icon: WandSparkles,
        iconClass: 'bg-violet-50 text-violet-600 ring-violet-100',
      },
      {
        label: 'Active Discounts',
        value: activeCoupons.length + activePromotions.length,
        icon: Power,
        iconClass: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
      },
      {
        label: 'Total Redemptions',
        value: couponCodes.reduce((sum, coupon) => sum + coupon.redemptions, 0),
        icon: Gift,
        iconClass: 'bg-amber-50 text-amber-600 ring-amber-100',
      },
    ]
  }, [couponCodes, promotions])

  const currentItems = activeTab === 'coupons' ? couponCodes : promotions
  const filteredItems = useMemo(() => {
    const search = (searchTerm || searchQuery).trim().toLowerCase()

    return currentItems
      .filter((item) => {
        const label = activeTab === 'coupons' ? item.code : `${item.name} ${item.target}`
        return label.toLowerCase().includes(search)
      })
      .filter((item) => statusFilter === 'All' || item.status === statusFilter)
  }, [activeTab, currentItems, searchQuery, searchTerm, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const paginatedItems = filteredItems.slice(
    (safeCurrentPage - 1) * itemsPerPage,
    safeCurrentPage * itemsPerPage,
  )

  const goToPage = (page) => {
    setCurrentPage(Math.min(Math.max(page, 1), totalPages))
  }

  const closeModal = () => {
    setModalMode(null)
    setSelectedItem(null)
    setIsSaving(false)
  }

  const openAddCoupon = () => {
    setCouponForm(emptyCouponForm)
    setModalMode('add-coupon')
  }

  const openAddPromotion = () => {
    setPromotionForm({
      ...emptyPromotionForm,
      target: products[0] ? String(products[0].id) : '',
    })
    setModalMode('add-promotion')
  }

  const openEdit = (item) => {
    setSelectedItem(item)
    if (activeTab === 'coupons') {
      setCouponForm({
        code: item.code,
        discountType: item.discountType,
        discountValue: String(item.discountValue),
        status: item.status,
      })
      setModalMode('edit-coupon')
    } else {
      setPromotionForm({
        name: item.name,
        appliesTo: item.appliesTo,
        target: item.appliesTo === 'Product' ? String(item.productId || '') : '',
        minimumQuantity: String(item.minimumQuantity || ''),
        minimumOrderAmount: String(item.minimumOrderAmount || ''),
        discountType: item.discountType,
        discountValue: String(item.discountValue),
        status: item.status,
      })
      setModalMode('edit-promotion')
    }
  }

  const openView = (item) => {
    setSelectedItem(item)
    setModalMode('view')
  }

  const openDelete = (item) => {
    setSelectedItem(item)
    setModalMode('delete')
  }

  const saveCoupon = async (event) => {
    event.preventDefault()
    const payload = {
      code: couponForm.code.trim().toUpperCase(),
      discount_type: toApiDiscountType(couponForm.discountType),
      discount_value: Number(couponForm.discountValue) || 0,
      is_active: couponForm.status === 'Active' ? 1 : 0,
    }

    if (!payload.code) return

    try {
      setIsSaving(true)
      setError('')
      if (modalMode === 'edit-coupon' && selectedItem) {
        await updateAdminCoupon(selectedItem.id, payload)
      } else {
        await createAdminCoupon(payload)
      }
      await loadDiscountData()
      closeModal()
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to save coupon.')
      setIsSaving(false)
    }
  }

  const savePromotion = async (event) => {
    event.preventDefault()
    const appliesToProduct = promotionForm.appliesTo === 'Product'
    const payload = {
      name: promotionForm.name.trim(),
      promotion_type: appliesToProduct ? 'PRODUCT' : 'ORDER',
      product_id: appliesToProduct ? Number(promotionForm.target) : null,
      min_quantity: appliesToProduct ? Number(promotionForm.minimumQuantity) || 0 : null,
      min_order_amount: appliesToProduct ? null : Number(promotionForm.minimumOrderAmount) || 0,
      discount_type: toApiDiscountType(promotionForm.discountType),
      discount_value: Number(promotionForm.discountValue) || 0,
      is_active: promotionForm.status === 'Active' ? 1 : 0,
    }

    if (!payload.name) return
    if (appliesToProduct && !payload.product_id) return

    try {
      setIsSaving(true)
      setError('')
      if (modalMode === 'edit-promotion' && selectedItem) {
        await updateAdminPromotion(selectedItem.id, payload)
      } else {
        await createAdminPromotion(payload)
      }
      await loadDiscountData()
      closeModal()
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to save promotion.')
      setIsSaving(false)
    }
  }

  const deleteItem = async () => {
    if (!selectedItem) return

    try {
      setIsSaving(true)
      setError('')
      if (activeTab === 'coupons') {
        await deleteAdminCoupon(selectedItem.id)
      } else {
        await deleteAdminPromotion(selectedItem.id)
      }
      await loadDiscountData()
      closeModal()
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to delete discount.')
      setIsSaving(false)
    }
  }

  const toggleStatus = async (item) => {
    const nextStatus = item.status === 'Active' ? 'Inactive' : 'Active'
    try {
      setError('')
      if (activeTab === 'coupons') {
        await updateAdminCoupon(item.id, {
          code: item.code,
          discount_type: toApiDiscountType(item.discountType),
          discount_value: item.discountValue,
          is_active: nextStatus === 'Active' ? 1 : 0,
        })
      } else {
        await updateAdminPromotion(item.id, {
          name: item.name,
          promotion_type: item.appliesTo === 'Product' ? 'PRODUCT' : 'ORDER',
          product_id: item.appliesTo === 'Product' ? item.productId : null,
          min_quantity: item.appliesTo === 'Product' ? item.minimumQuantity : null,
          min_order_amount: item.appliesTo === 'Order' ? item.minimumOrderAmount : null,
          discount_type: toApiDiscountType(item.discountType),
          discount_value: item.discountValue,
          is_active: nextStatus === 'Active' ? 1 : 0,
        })
      }
      await loadDiscountData()
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update discount status.')
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
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {[
              ['coupons', 'Coupon Codes'],
              ['promotions', 'Automated Promotions'],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setActiveTab(key)
                  setSearchTerm('')
                  setStatusFilter('All')
                  setCurrentPage(1)
                }}
                className={`rounded-lg px-4 py-2 text-sm font-black ${
                  activeTab === key
                    ? 'bg-[#c8793f] text-white'
                    : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={activeTab === 'coupons' ? openAddCoupon : openAddPromotion}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#c8793f] px-4 text-sm font-black text-white transition hover:bg-[#9a5a2e]"
          >
            <Plus className="h-4 w-4" />
            {activeTab === 'coupons' ? 'Add Coupon' : 'Add Promotion'}
          </button>
        </div>

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
              placeholder={activeTab === 'coupons' ? 'Search coupon code' : 'Search promotion'}
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
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        {isLoading ? (
          <div className="mt-5 rounded-lg border border-[#fcd8b8] bg-[#fff3e8] px-4 py-3 text-sm font-bold text-[#9a5a2e]">
            Loading discounts...
          </div>
        ) : null}

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {paginatedItems.map((item) => (
            <article key={item.id} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff3e8] text-[#9a5a2e] ring-1 ring-[#fcd8b8]">
                    {activeTab === 'coupons' ? (
                      <TicketPercent className="h-5 w-5" />
                    ) : (
                      <WandSparkles className="h-5 w-5" />
                    )}
                  </span>
                  <div>
                    <p className="text-xs font-black uppercase text-slate-500">
                      {activeTab === 'coupons' ? 'Manual Coupon' : item.appliesTo}
                    </p>
                    <h3 className="mt-1 text-lg font-black text-slate-950">
                      {activeTab === 'coupons' ? item.code : item.name}
                    </h3>
                  </div>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${statusStyles[item.status]}`}>
                  {item.status}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-lg bg-slate-50 p-3 w-full">
                  <p className="text-xs font-black uppercase text-slate-500">Discount</p>
                  <p className="mt-1 text-sm font-black text-slate-950">
                    {formatDiscount(item.discountType, item.discountValue)}
                  </p>
                </div>
                {activeTab === 'coupons' ? (
                  <div className="rounded-lg bg-slate-50 p-3 w-full">
                    <p className="text-xs font-black uppercase text-slate-500">Redeemed</p>
                    <p className="mt-1 text-sm font-black text-slate-950">{item.redemptions} times</p>
                  </div>
                ) : (
                  <div className="rounded-lg bg-slate-50 p-3 w-full">
                    <p className="text-xs font-black uppercase text-slate-500">Trigger</p>
                    <p className="mt-1 text-sm font-black text-slate-950">
                      {item.appliesTo === 'Product'
                        ? `${item.target} x ${item.minimumQuantity}`
                        : `Order above ${formatCurrency(item.minimumOrderAmount)}`}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => openView(item)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label="View discount">
                    <Eye className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => openEdit(item)} className="rounded-lg p-2 text-[#9a5a2e] hover:bg-[#fff3e8]" aria-label="Edit discount">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => openDelete(item)} className="rounded-lg p-2 text-rose-500 hover:bg-rose-50" aria-label="Delete discount">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <button type="button" onClick={() => toggleStatus(item)} className="rounded-lg px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-100">
                  {item.status === 'Active' ? 'Disable' : 'Enable'}
                </button>
              </div>
            </article>
          ))}
        </div>

        {!isLoading && filteredItems.length === 0 ? (
          <div className="mt-5 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
            <BadgePercent className="mx-auto h-9 w-9 text-slate-400" />
            <h3 className="mt-3 text-base font-black text-slate-900">No discounts found</h3>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              Add a coupon or promotion, or change your filters.
            </p>
          </div>
        ) : null}

        {filteredItems.length > 0 ? (
          <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-bold text-slate-500">
              Showing {(safeCurrentPage - 1) * itemsPerPage + 1}-
              {Math.min(safeCurrentPage * itemsPerPage, filteredItems.length)} of {filteredItems.length}
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

      {(modalMode === 'add-coupon' || modalMode === 'edit-coupon') ? (
        <ModalShell title={modalMode === 'edit-coupon' ? 'Edit Coupon Code' : 'Add Coupon Code'} onClose={closeModal}>
          <form onSubmit={saveCoupon} className="grid gap-4 md:grid-cols-2">
            <Field label="Coupon Code">
              <input required value={couponForm.code} onChange={(event) => setCouponForm((current) => ({ ...current, code: event.target.value }))} placeholder="WELCOME10" className={inputClass} />
            </Field>
            <Field label="Discount Type">
              <select value={couponForm.discountType} onChange={(event) => setCouponForm((current) => ({ ...current, discountType: event.target.value }))} className={inputClass}>
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
              </select>
            </Field>
            <Field label="Discount Value">
              <input required type="number" min="0" value={couponForm.discountValue} onChange={(event) => setCouponForm((current) => ({ ...current, discountValue: event.target.value }))} className={inputClass} />
            </Field>
            <Field label="Status">
              <select value={couponForm.status} onChange={(event) => setCouponForm((current) => ({ ...current, status: event.target.value }))} className={inputClass}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </Field>
            <div className="flex flex-col gap-3 md:col-span-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={closeModal} className="h-11 rounded-lg border border-slate-200 px-5 text-sm font-black text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button disabled={isSaving} type="submit" className="h-11 rounded-lg bg-[#c8793f] px-5 text-sm font-black text-white hover:bg-[#9a5a2e] disabled:cursor-not-allowed disabled:opacity-60">
                {isSaving ? 'Saving...' : 'Save Coupon'}
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {(modalMode === 'add-promotion' || modalMode === 'edit-promotion') ? (
        <ModalShell title={modalMode === 'edit-promotion' ? 'Edit Automated Promotion' : 'Add Automated Promotion'} onClose={closeModal}>
          <form onSubmit={savePromotion} className="grid gap-4 md:grid-cols-2">
            <Field label="Promotion Name">
              <input required value={promotionForm.name} onChange={(event) => setPromotionForm((current) => ({ ...current, name: event.target.value }))} className={inputClass} />
            </Field>
            <Field label="Applies To">
              <select value={promotionForm.appliesTo} onChange={(event) => setPromotionForm((current) => ({ ...current, appliesTo: event.target.value }))} className={inputClass}>
                <option value="Product">Product</option>
                <option value="Order">Order</option>
              </select>
            </Field>
            {promotionForm.appliesTo === 'Product' ? (
              <>
                <Field label="Product Name">
                  <select required value={promotionForm.target} onChange={(event) => setPromotionForm((current) => ({ ...current, target: event.target.value }))} className={inputClass}>
                    <option value="">Select product</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>{product.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Minimum Quantity">
                  <input required type="number" min="1" value={promotionForm.minimumQuantity} onChange={(event) => setPromotionForm((current) => ({ ...current, minimumQuantity: event.target.value }))} className={inputClass} />
                </Field>
              </>
            ) : (
              <Field label="Minimum Order Amount">
                <input required type="number" min="0" value={promotionForm.minimumOrderAmount} onChange={(event) => setPromotionForm((current) => ({ ...current, minimumOrderAmount: event.target.value }))} className={inputClass} />
              </Field>
            )}
            <Field label="Discount Type">
              <select value={promotionForm.discountType} onChange={(event) => setPromotionForm((current) => ({ ...current, discountType: event.target.value }))} className={inputClass}>
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
              </select>
            </Field>
            <Field label="Discount Value">
              <input required type="number" min="0" value={promotionForm.discountValue} onChange={(event) => setPromotionForm((current) => ({ ...current, discountValue: event.target.value }))} className={inputClass} />
            </Field>
            <Field label="Status">
              <select value={promotionForm.status} onChange={(event) => setPromotionForm((current) => ({ ...current, status: event.target.value }))} className={inputClass}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </Field>
            <div className="flex flex-col gap-3 md:col-span-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={closeModal} className="h-11 rounded-lg border border-slate-200 px-5 text-sm font-black text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button disabled={isSaving} type="submit" className="h-11 rounded-lg bg-[#c8793f] px-5 text-sm font-black text-white hover:bg-[#9a5a2e] disabled:cursor-not-allowed disabled:opacity-60">
                {isSaving ? 'Saving...' : 'Save Promotion'}
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {modalMode === 'view' && selectedItem ? (
        <ModalShell title="Discount Details" onClose={closeModal} size="max-w-xl">
          <div className="space-y-4">
            {(activeTab === 'coupons'
              ? [
                  ['Code', selectedItem.code],
                  ['Discount', formatDiscount(selectedItem.discountType, selectedItem.discountValue)],
                  ['Redeemed', `${selectedItem.redemptions} times`],
                  ['Status', selectedItem.status],
                ]
              : [
                  ['Promotion', selectedItem.name],
                  ['Applies To', selectedItem.appliesTo],
                  ['Trigger', selectedItem.appliesTo === 'Product' ? `${selectedItem.target} x ${selectedItem.minimumQuantity}` : `Order above ${formatCurrency(selectedItem.minimumOrderAmount)}`],
                  ['Discount', formatDiscount(selectedItem.discountType, selectedItem.discountValue)],
                  ['Status', selectedItem.status],
                ]
            ).map(([label, value]) => (
              <div key={label} className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-black uppercase text-slate-500">{label}</p>
                <p className="mt-1 text-sm font-black text-slate-900">{value}</p>
              </div>
            ))}
          </div>
        </ModalShell>
      ) : null}

      {modalMode === 'delete' && selectedItem ? (
        <ModalShell title="Delete Discount" onClose={closeModal} size="max-w-md">
          <p className="text-sm font-semibold leading-6 text-slate-600">
            Delete <span className="font-black text-slate-950">{activeTab === 'coupons' ? selectedItem.code : selectedItem.name}</span>?
          </p>
          <div className="mt-5 flex justify-end gap-3">
            <button type="button" onClick={closeModal} className="h-11 rounded-lg border border-slate-200 px-5 text-sm font-black text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
            <button disabled={isSaving} type="button" onClick={deleteItem} className="h-11 rounded-lg bg-rose-500 px-5 text-sm font-black text-white hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60">
              {isSaving ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </ModalShell>
      ) : null}
    </div>
  )
}

export default CouponPromotion
