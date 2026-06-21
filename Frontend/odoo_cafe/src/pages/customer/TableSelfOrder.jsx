import {
  Banknote,
  CheckCircle2,
  Clock3,
  CreditCard,
  History,
  Loader2,
  Minus,
  Plus,
  ReceiptText,
  ShoppingBag,
  Sparkles,
  Wallet,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  createCustomerRazorpayOrder,
  getCustomerMenu,
  getCustomerOrderHistory,
  getCustomerOrderStatus,
  getCustomerTable,
  placeCustomerOrder,
  verifyCustomerRazorpayPayment,
} from '../../api/customerSelfApi'
import { formatCurrency } from '../../utils/formatCurrency'

const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '')

const toNumber = (value) => Number(value || 0)

const getImageUrl = (value, name) => {
  if (value?.startsWith('http')) return value
  if (value?.startsWith('/uploads')) return `${API_ORIGIN}${value}`
  return `https://images.unsplash.com/600x420/?cafe,food,${encodeURIComponent(name || 'coffee')}`
}

const statusLabel = (status) =>
  ({
    TO_COOK: 'Sent to Kitchen',
    PREPARING: 'Preparing',
    COMPLETED: 'Ready',
    PAID: 'Paid',
  })[status] || status || 'Sent to Kitchen'

const formatDateTime = (value) => {
  if (!value) return '-'
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

const orderProgressSteps = [
  {
    status: 'TO_COOK',
    title: 'Sent to Kitchen',
    description: 'Your order is waiting in the kitchen queue.',
  },
  {
    status: 'PREPARING',
    title: 'Preparing',
    description: 'The kitchen team is preparing your items.',
  },
  {
    status: 'COMPLETED',
    title: 'Ready',
    description: 'Your order is ready to serve.',
  },
]

const progressIndexByStatus = {
  TO_COOK: 0,
  PREPARING: 1,
  COMPLETED: 2,
  PAID: 2,
}

const paymentOptions = [
  {
    id: 'card',
    label: 'Card',
    description: 'Debit or credit card',
    icon: CreditCard,
  },
  {
    id: 'upi',
    label: 'UPI',
    description: 'UPI app or QR',
    icon: Wallet,
  },
  {
    id: 'cash',
    label: 'Cash',
    description: 'Pay to cashier',
    icon: Banknote,
  },
]

const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true)
      return
    }

    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })

const TableSelfOrder = () => {
  const { token } = useParams()
  const [table, setTable] = useState(null)
  const [settings, setSettings] = useState(null)
  const [menu, setMenu] = useState([])
  const [activeCategory, setActiveCategory] = useState(null)
  const [cart, setCart] = useState([])
  const [screen, setScreen] = useState('categories')
  const [placedOrder, setPlacedOrder] = useState(null)
  const [orderStatus, setOrderStatus] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isPlacing, setIsPlacing] = useState(false)
  const [isPaying, setIsPaying] = useState(false)
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [orderHistory, setOrderHistory] = useState([])
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('upi')
  const [paymentError, setPaymentError] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const loadCustomerPage = async () => {
      try {
        setError('')
        const [tableResponse, menuResponse] = await Promise.all([
          getCustomerTable(token),
          getCustomerMenu(),
        ])
        const loadedMenu = menuResponse.data.menu || []
        setTable(tableResponse.data.table)
        setSettings(tableResponse.data.settings)
        setMenu(loadedMenu)
        setActiveCategory('all')
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load table menu.')
      } finally {
        setIsLoading(false)
      }
    }

    loadCustomerPage()
  }, [token])

  useEffect(() => {
    if (!placedOrder?.orderId) return undefined

    const loadStatus = async () => {
      try {
        const response = await getCustomerOrderStatus(placedOrder.orderId)
        setOrderStatus(response.data.order)
      } catch {
        // Confirmation should stay visible even if one poll fails.
      }
    }

    loadStatus()
    const timer = window.setInterval(loadStatus, 5000)
    return () => window.clearInterval(timer)
  }, [placedOrder])

  const activeCategoryData = useMemo(
    () => menu.find((category) => category.category_name === activeCategory) || null,
    [activeCategory, menu],
  )

  const categoryOptions = useMemo(
    () => [
      {
        category_name: 'all',
        label: 'All',
        category_color: '#8B4513',
        items: menu.flatMap((category) => category.items || []),
      },
      ...menu.map((category) => ({
        ...category,
        label: category.category_name,
      })),
    ],
    [menu],
  )

  const displayedProducts = useMemo(() => {
    const sourceCategories =
      activeCategory === 'all'
        ? menu
        : menu.filter((category) => category.category_name === activeCategory)

    const products = sourceCategories.flatMap((category) =>
      (category.items || []).map((item) => ({ item, category })),
    )

    return activeCategory === 'all' ? products.slice(0, 4) : products
  }, [activeCategory, menu])

  const totals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const tax = cart.reduce((sum, item) => sum + (item.price * item.quantity * item.tax) / 100, 0)
    return { subtotal, tax, total: subtotal + tax }
  }, [cart])

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0)
  const isOrderPaid = Boolean(
    orderStatus?.payment_status === 'SUCCESS' ||
      orderStatus?.payments?.some((payment) => payment.payment_status === 'SUCCESS'),
  )
  const currentProgressIndex = progressIndexByStatus[orderStatus?.status] ?? 0

  const productFromItem = (item, category) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    image: getImageUrl(item.image_url, item.name),
    category: category.category_name,
    color: category.category_color || '#c8793f',
    price: toNumber(item.price),
    tax: toNumber(item.tax_percentage),
  })

  const addItem = (product) => {
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id)
      if (existing) {
        return current.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        )
      }
      return [...current, { ...product, quantity: 1 }]
    })
    setScreen('bill')
  }

  const changeQuantity = (id, delta) => {
    setCart((current) =>
      current
        .map((item) => (item.id === id ? { ...item, quantity: item.quantity + delta } : item))
        .filter((item) => item.quantity > 0),
    )
  }

  const submitOrder = async () => {
    if (!cart.length) return
    try {
      setIsPlacing(true)
      setError('')
      const response = await placeCustomerOrder({
        table_token: token,
        items: cart.map((item) => ({ product_id: item.id, quantity: item.quantity })),
      })
      setPlacedOrder(response.data)
      setPaymentError('')
      setCart([])
      setScreen('complete')
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to place order.')
    } finally {
      setIsPlacing(false)
    }
  }

  const confirmPayment = async () => {
    if (!placedOrder?.orderId || isOrderPaid) return
    if (selectedPaymentMethod === 'cash') return

    try {
      setIsPaying(true)
      setPaymentError('')
      const isLoaded = await loadRazorpayScript()
      if (!isLoaded) {
        throw new Error('Unable to load Razorpay checkout.')
      }

      const orderResponse = await createCustomerRazorpayOrder(placedOrder.orderId, {
        table_token: token,
      })

      const razorpayOrder = orderResponse.data
      const method =
        selectedPaymentMethod === 'upi'
          ? { upi: true, card: false, netbanking: false, wallet: false, emi: false, paylater: false }
          : { card: true, upi: false, netbanking: false, wallet: false, emi: false, paylater: false }

      const paymentResult = await new Promise((resolve, reject) => {
        const checkout = new window.Razorpay({
          key: razorpayOrder.key,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          name: 'Odoo Cafe POS',
          description: `Order ${razorpayOrder.orderNumber}`,
          order_id: razorpayOrder.razorpayOrderId,
          handler: resolve,
          method,
          modal: {
            ondismiss: () => reject(new Error('Payment was cancelled.')),
          },
          theme: {
            color: '#8B4513',
          },
        })

        checkout.on('payment.failed', (response) => {
          reject(new Error(response.error?.description || 'Payment failed. Please try again.'))
        })

        checkout.open()
      })

      await verifyCustomerRazorpayPayment(placedOrder.orderId, {
        table_token: token,
        razorpay_order_id: paymentResult.razorpay_order_id,
        razorpay_payment_id: paymentResult.razorpay_payment_id,
        razorpay_signature: paymentResult.razorpay_signature,
      })

      const statusResponse = await getCustomerOrderStatus(placedOrder.orderId)
      setOrderStatus(statusResponse.data.order)
    } catch (err) {
      setPaymentError(err.response?.data?.message || err.message || 'Unable to complete payment.')
    } finally {
      setIsPaying(false)
    }
  }

  const openOrderHistory = async () => {
    try {
      setIsHistoryLoading(true)
      setError('')
      const response = await getCustomerOrderHistory(token)
      setOrderHistory(response.data.orders || [])
      setScreen('history')
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load order history.')
    } finally {
      setIsHistoryLoading(false)
    }
  }

  const openHistoryOrder = (order) => {
    setPlacedOrder({
      orderId: order.id,
      orderNumber: order.order_number,
      total_amount: order.total_amount,
    })
    setOrderStatus(order)
    setPaymentError('')
    setScreen('complete')
  }

  const pageStyle = {
    backgroundColor: settings?.background_color || '#FFF8F0',
    backgroundImage: settings?.background_image ? `url(${getImageUrl(settings.background_image)})` : 'none',
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FFF8F0] p-5">
        <div className="rounded-3xl bg-white p-5 text-sm font-black text-[#8B4513] shadow-sm">
          <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
          Loading menu...
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-cover bg-center text-[#2D1B0E]" style={pageStyle}>
      <div className="min-h-screen bg-white/75 px-4 py-4 backdrop-blur-sm sm:px-6">
        <section className="mx-auto max-w-6xl">
          <header className="mb-5 overflow-hidden rounded-[30px] bg-[#8B4513] text-white shadow-[0_18px_55px_rgba(45,27,14,0.18)]">
            <div className="relative p-5 sm:p-6 md:p-7">
              <div className="absolute -right-14 -top-14 h-40 w-40 rounded-full bg-white/10" />
              <div className="absolute bottom-5 right-24 h-14 w-14 rounded-full bg-white/10" />

              <div className="relative flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/70">
                    QR Self Ordering
                  </p>
                  <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">
                    Hello, Table {table?.table_number}
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-white/75">
                    Browse the cafe menu, add your favourites, and send your order directly to the kitchen.
                  </p>
                  <div className="mt-4 inline-flex max-w-full items-center rounded-full bg-white/15 px-3 py-1.5 text-xs font-black text-white/90">
                    <span className="truncate">{table?.floor_name}</span>
                    <span className="mx-2 h-1 w-1 rounded-full bg-white/60" />
                    <span>{table?.seats} seats</span>
                  </div>
                </div>

                <div className="flex shrink-0 flex-col gap-2">
                  <button
                    type="button"
                    onClick={openOrderHistory}
                    disabled={isHistoryLoading}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/15 px-3 py-2 text-xs font-black text-white ring-1 ring-white/20 disabled:opacity-70"
                  >
                    {isHistoryLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <History className="h-4 w-4" />}
                    History
                  </button>
                  <button
                    type="button"
                    onClick={() => setScreen('bill')}
                    className="relative rounded-2xl bg-[#FFF8F0] p-3 text-[#8B4513] shadow-lg shadow-[#2D1B0E]/15"
                  >
                    <ShoppingBag className="h-5 w-5" />
                    {totalItems ? (
                      <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-[#F59E0B] px-1 text-xs font-black text-white">
                        {totalItems}
                      </span>
                    ) : null}
                  </button>
                </div>
              </div>
            </div>
          </header>

          {error ? (
            <div className="mb-4 rounded-3xl bg-red-50 px-4 py-3 text-sm font-black text-red-700 ring-1 ring-red-100">
              {error}
            </div>
          ) : null}

          {!settings?.self_ordering_enabled ? (
            <div className="rounded-3xl bg-white p-5 text-sm font-black text-[#8B4513] ring-1 ring-[#E7D8C9]">
              Self ordering is currently disabled. Please call the cashier.
            </div>
          ) : null}

          {screen === 'categories' || screen === 'products' ? (
            <>
              <section className="mb-5 rounded-[26px] bg-white p-4 shadow-sm ring-1 ring-[#F5E6D3] sm:p-5">
                <div className="mb-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#8B4513]/60">
                    Explore Menu
                  </p>
                  <h2 className="text-xl font-black text-[#2D1B0E]">Categories</h2>
                </div>

                <div className="flex gap-3 overflow-x-auto pb-2">
                  {categoryOptions.map((category) => {
                    const firstItem = category.items?.[0]
                    const isActive = activeCategory === category.category_name

                    return (
                      <button
                        key={category.category_name}
                        type="button"
                        onClick={() => {
                          setActiveCategory(category.category_name)
                          setScreen('categories')
                        }}
                        className={`min-w-[94px] rounded-2xl p-2.5 text-center transition ${
                          isActive
                            ? 'bg-[#8B4513] text-white shadow-md shadow-[#8B4513]/20'
                            : 'bg-[#FFF8F0] text-[#8B4513] ring-1 ring-[#E7D8C9] hover:bg-[#F5E6D3]'
                        }`}
                      >
                        <span className={`mx-auto block h-12 w-12 overflow-hidden rounded-2xl ${isActive ? 'bg-white/15' : 'bg-white'}`}>
                          <img
                            src={getImageUrl(firstItem?.image_url, category.label)}
                            alt={category.label}
                            className="h-full w-full object-cover"
                          />
                        </span>
                        <span className="mt-2 block truncate text-xs font-black">{category.label}</span>
                      </button>
                    )
                  })}
                </div>
              </section>

              <section>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#8B4513]/60">
                      {activeCategory === 'all' ? 'Recommended' : 'Selected Category'}
                    </p>
                    <h2 className="truncate text-xl font-black text-[#2D1B0E]">
                      {activeCategory === 'all'
                        ? 'Recommended For You'
                        : activeCategoryData?.category_name}
                    </h2>
                  </div>

                  <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-black text-[#8B4513] ring-1 ring-[#E7D8C9]">
                    {displayedProducts.length} Items
                  </span>
                </div>

                {displayedProducts.length ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {displayedProducts.map(({ item, category }) => {
                      const product = productFromItem(item, category)
                      return (
                        <article
                          key={`${category.category_name}-${item.id}`}
                          className="overflow-hidden rounded-[24px] bg-white shadow-sm ring-1 ring-[#F5E6D3] transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(45,27,14,0.08)]"
                        >
                          <div className="relative h-40 overflow-hidden bg-[#F5E6D3]">
                            <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
                            {activeCategory === 'all' ? (
                              <span className="absolute left-3 top-3 rounded-full bg-[#FFF8F0] px-3 py-1 text-xs font-black text-[#8B4513] shadow-sm">
                                Recommended
                              </span>
                            ) : null}
                          </div>
                          <div className="p-4">
                            <div className="mb-3 inline-flex max-w-full rounded-full bg-[#FFF8F0] px-3 py-1 text-xs font-black text-[#8B4513] ring-1 ring-[#E7D8C9]">
                              <span className="truncate">{product.category}</span>
                            </div>
                            <h3 className="text-lg font-black text-[#2D1B0E]">{product.name}</h3>
                            <p className="mt-1 line-clamp-2 min-h-10 text-sm font-bold leading-5 text-[#2D1B0E]/55">
                              {product.description || 'Fresh cafe item available for self ordering.'}
                            </p>
                            <div className="mt-4 flex items-center justify-between gap-3">
                              <span className="text-xl font-black text-[#8B4513]">{formatCurrency(product.price)}</span>
                              <button
                                type="button"
                                onClick={() => addItem(product)}
                                disabled={!settings?.self_ordering_enabled}
                                className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#8B4513] px-4 text-sm font-black text-white disabled:opacity-60"
                              >
                                <Plus className="h-4 w-4" />
                                Add
                              </button>
                            </div>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                ) : (
                  <div className="rounded-[24px] border border-dashed border-[#E7D8C9] bg-white p-8 text-center shadow-sm">
                    <ShoppingBag className="mx-auto h-10 w-10 text-[#8B4513]" />
                    <h3 className="mt-3 text-lg font-black text-[#2D1B0E]">No products found</h3>
                    <p className="mt-1 text-sm font-semibold text-[#2D1B0E]/55">
                      Products for this category will appear here.
                    </p>
                  </div>
                )}
              </section>
            </>
          ) : null}

          {screen === 'history' ? (
            <div className="mx-auto max-w-3xl rounded-[28px] bg-white p-4 shadow-xl shadow-[#8B4513]/10 ring-1 ring-[#F5E6D3] sm:p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#8B4513]/65">
                    Order History
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-[#2D1B0E]">Your Table Orders</h2>
                  <p className="mt-1 text-sm font-bold text-[#2D1B0E]/55">
                    Recent orders placed from this table QR.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setScreen('categories')}
                  className="rounded-2xl bg-[#FFF8F0] px-4 py-2 text-sm font-black text-[#8B4513] ring-1 ring-[#E7D8C9]"
                >
                  Menu
                </button>
              </div>

              {orderHistory.length ? (
                <div className="space-y-3">
                  {orderHistory.map((order) => {
                    const isPaid = order.payment_status === 'SUCCESS'
                    return (
                      <button
                        key={order.id}
                        type="button"
                        onClick={() => openHistoryOrder(order)}
                        className="w-full rounded-3xl bg-[#FFF8F0] p-4 text-left ring-1 ring-[#E7D8C9] transition hover:bg-[#F5E6D3]"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="truncate text-base font-black text-[#2D1B0E]">
                              {order.order_number}
                            </p>
                            <p className="mt-1 text-xs font-bold text-[#2D1B0E]/55">
                              {formatDateTime(order.created_at)} • {order.items?.length || 0} items
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-wrap items-center gap-2">
                            <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#8B4513] ring-1 ring-[#E7D8C9]">
                              {statusLabel(order.status)}
                            </span>
                            <span className={`rounded-full px-3 py-1 text-xs font-black ${
                              isPaid ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                            }`}>
                              {isPaid ? 'Paid' : 'Payment Pending'}
                            </span>
                            <span className="text-base font-black text-[#8B4513]">
                              {formatCurrency(order.total_amount)}
                            </span>
                          </div>
                        </div>

                        {order.items?.length ? (
                          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                            {order.items.slice(0, 4).map((item) => (
                              <span
                                key={item.id}
                                className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-black text-[#2D1B0E]/65 ring-1 ring-[#E7D8C9]"
                              >
                                {item.quantity}x {item.product_name}
                              </span>
                            ))}
                            {order.items.length > 4 ? (
                              <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-black text-[#8B4513] ring-1 ring-[#E7D8C9]">
                                +{order.items.length - 4} more
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-[#E7D8C9] bg-[#FFF8F0] p-8 text-center">
                  <History className="mx-auto h-10 w-10 text-[#8B4513]" />
                  <h3 className="mt-3 text-lg font-black text-[#2D1B0E]">No order history yet</h3>
                  <p className="mt-1 text-sm font-semibold text-[#2D1B0E]/55">
                    Orders placed from this table will appear here.
                  </p>
                </div>
              )}
            </div>
          ) : null}

          {screen === 'bill' ? (
            <div className="mx-auto max-w-2xl rounded-[28px] bg-white p-4 shadow-xl shadow-[#8B4513]/10 ring-1 ring-[#F5E6D3]">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#8B4513]/65">Bill</p>
                  <h2 className="text-2xl font-black">Review Order</h2>
                </div>
                <ReceiptText className="h-6 w-6 text-[#8B4513]" />
              </div>

              {!cart.length ? (
                <div className="rounded-3xl border border-dashed border-[#E7D8C9] bg-[#FFF8F0] p-7 text-center">
                  <ShoppingBag className="mx-auto mb-3 h-9 w-9 text-[#8B4513]" />
                  <p className="font-black">Your cart is empty</p>
                  <button type="button" onClick={() => setScreen('categories')} className="mt-4 rounded-2xl bg-[#8B4513] px-5 py-3 text-sm font-black text-white">
                    Browse Menu
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {cart.map((item) => (
                      <div key={item.id} className="flex gap-3 rounded-3xl bg-[#FFF8F0] p-3 ring-1 ring-[#E7D8C9]">
                        <img src={item.image} alt={item.name} className="h-20 w-20 rounded-2xl object-cover" />
                        <div className="min-w-0 flex-1">
                          <div className="flex justify-between gap-3">
                            <div>
                              <p className="font-black">{item.name}</p>
                              <p className="text-xs font-bold text-[#2D1B0E]/55">{formatCurrency(item.price)} each</p>
                            </div>
                            <p className="font-black">{formatCurrency(item.price * item.quantity)}</p>
                          </div>
                          <div className="mt-3 flex items-center gap-2">
                            <button type="button" onClick={() => changeQuantity(item.id, -1)} className="rounded-xl bg-white p-2 text-[#8B4513]">
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="w-8 text-center font-black">{item.quantity}</span>
                            <button type="button" onClick={() => changeQuantity(item.id, 1)} className="rounded-xl bg-[#8B4513] p-2 text-white">
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 space-y-2 border-t border-[#E7D8C9] pt-4 text-sm font-bold">
                    <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(totals.subtotal)}</span></div>
                    <div className="flex justify-between"><span>Tax</span><span>{formatCurrency(totals.tax)}</span></div>
                    <div className="flex justify-between text-xl font-black"><span>Total</span><span>{formatCurrency(totals.total)}</span></div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <button type="button" onClick={() => setScreen('products')} className="min-h-12 rounded-2xl bg-[#FFF8F0] px-5 text-sm font-black text-[#8B4513] ring-1 ring-[#E7D8C9]">
                      Add More
                    </button>
                    <button
                      type="button"
                      onClick={submitOrder}
                      disabled={isPlacing || !settings?.self_ordering_enabled}
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#8B4513] px-5 text-sm font-black text-white disabled:opacity-60"
                    >
                      {isPlacing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Confirm Order
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : null}

          {screen === 'complete' ? (
            <div className="mx-auto max-w-xl rounded-[28px] bg-white p-6 text-center shadow-xl shadow-[#8B4513]/10 ring-1 ring-[#F5E6D3]">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-9 w-9" />
              </div>
              <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-[#8B4513]/65">Complete</p>
              <h2 className="mt-2 text-3xl font-black">Order sent to KDS</h2>
              <p className="mt-3 text-sm font-bold leading-6 text-[#2D1B0E]/60">
                Your order has been sent to the kitchen display. Please wait at your table.
              </p>
              <div className="mt-5 rounded-3xl bg-[#FFF8F0] p-4 text-left ring-1 ring-[#E7D8C9]">
                <div className="flex justify-between gap-3 text-sm font-bold">
                  <span>Order No</span>
                  <span className="font-black">{placedOrder?.orderNumber}</span>
                </div>
                <div className="mt-2 flex justify-between gap-3 text-sm font-bold">
                  <span>Amount</span>
                  <span className="font-black">{formatCurrency(placedOrder?.total_amount || orderStatus?.total_amount || 0)}</span>
                </div>
                <div className="mt-2 flex justify-between gap-3 text-sm font-bold">
                  <span>Status</span>
                  <span className="font-black text-[#8B4513]">{statusLabel(orderStatus?.status)}</span>
                </div>
                <div className="mt-2 flex justify-between gap-3 text-sm font-bold">
                  <span>Payment</span>
                  <span className={`font-black ${isOrderPaid ? 'text-emerald-600' : 'text-[#8B4513]'}`}>
                    {isOrderPaid ? 'Paid' : 'Pending'}
                  </span>
                </div>
              </div>

              <div className="mt-5 rounded-3xl bg-[#FFF8F0] p-4 text-left ring-1 ring-[#E7D8C9]">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#8B4513]/65">
                      Order Tracking
                    </p>
                    <h3 className="mt-1 text-xl font-black text-[#2D1B0E]">
                      {statusLabel(orderStatus?.status)}
                    </h3>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#8B4513] ring-1 ring-[#E7D8C9]">
                    Live
                  </span>
                </div>

                <div className="space-y-4">
                  {orderProgressSteps.map((step, index) => {
                    const isDone = index <= currentProgressIndex
                    const isCurrent = index === currentProgressIndex

                    return (
                      <div key={step.status} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <span
                            className={`flex h-9 w-9 items-center justify-center rounded-full ring-4 ${
                              isDone
                                ? 'bg-[#8B4513] text-white ring-[#F5E6D3]'
                                : 'bg-white text-[#8B4513]/45 ring-[#E7D8C9]'
                            }`}
                          >
                            {isDone ? <CheckCircle2 className="h-5 w-5" /> : <Clock3 className="h-5 w-5" />}
                          </span>
                          {index < orderProgressSteps.length - 1 ? (
                            <span className={`mt-2 h-8 w-1 rounded-full ${isDone ? 'bg-[#8B4513]' : 'bg-[#E7D8C9]'}`} />
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1 pb-2">
                          <p className={`font-black ${isCurrent ? 'text-[#8B4513]' : 'text-[#2D1B0E]'}`}>
                            {step.title}
                          </p>
                          <p className="mt-1 text-sm font-bold leading-5 text-[#2D1B0E]/55">
                            {step.description}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {orderStatus?.items?.length ? (
                  <div className="mt-4 space-y-2 border-t border-[#E7D8C9] pt-4">
                    {orderStatus.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-2 ring-1 ring-[#E7D8C9]">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-[#2D1B0E]">{item.product_name}</p>
                          <p className="text-xs font-bold text-[#2D1B0E]/50">Qty {item.quantity}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-[#FFF8F0] px-3 py-1 text-xs font-black text-[#8B4513]">
                          {statusLabel(item.status)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="mt-5 rounded-3xl bg-[#FFF8F0] p-4 text-left ring-1 ring-[#E7D8C9]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#8B4513]/65">
                      Payment
                    </p>
                    <h3 className="mt-1 text-xl font-black text-[#2D1B0E]">Choose Payment</h3>
                    <p className="mt-1 text-sm font-bold leading-5 text-[#2D1B0E]/55">
                      Card and UPI payments are verified with Razorpay.
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${
                    isOrderPaid ? 'bg-emerald-50 text-emerald-700' : 'bg-white text-[#8B4513]'
                  }`}>
                    {isOrderPaid ? 'Paid' : 'Pending'}
                  </span>
                </div>

                {paymentError ? (
                  <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-black text-red-700 ring-1 ring-red-100">
                    {paymentError}
                  </div>
                ) : null}

                {!isOrderPaid ? (
                  <>
                    <div className="mt-4 rounded-3xl bg-white p-4 text-center ring-1 ring-[#E7D8C9]">
                      <p className="text-sm font-bold text-[#2D1B0E]/60">Payable Amount</p>
                      <p className="mt-1 text-3xl font-black text-[#8B4513]">
                        {formatCurrency(placedOrder?.total_amount || orderStatus?.total_amount || 0)}
                      </p>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      {paymentOptions.map((option) => {
                        const Icon = option.icon
                        const isSelected = selectedPaymentMethod === option.id

                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => {
                              setSelectedPaymentMethod(option.id)
                              setPaymentError('')
                            }}
                            className={`rounded-2xl p-3 text-left transition ${
                              isSelected
                                ? 'bg-[#8B4513] text-white shadow-md shadow-[#8B4513]/15'
                                : 'bg-white text-[#2D1B0E] ring-1 ring-[#E7D8C9]'
                            }`}
                          >
                            <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                              isSelected ? 'bg-white/15' : 'bg-[#FFF8F0] text-[#8B4513]'
                            }`}>
                              <Icon className="h-5 w-5" />
                            </span>
                            <span className="mt-3 block text-sm font-black">{option.label}</span>
                            <span className={`mt-1 block text-xs font-bold ${
                              isSelected ? 'text-white/75' : 'text-[#2D1B0E]/50'
                            }`}>
                              {option.description}
                            </span>
                          </button>
                        )
                      })}
                    </div>

                    {selectedPaymentMethod === 'upi' ? (
                      <p className="mt-3 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-[#2D1B0E]/60 ring-1 ring-[#E7D8C9]">
                        Razorpay will open UPI payment with app and QR options.
                      </p>
                    ) : null}

                    {selectedPaymentMethod === 'cash' ? (
                      <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-black text-amber-700 ring-1 ring-amber-100">
                        Please pay cash to the cashier. Payment will stay pending until cashier collects it.
                      </p>
                    ) : null}
                  </>
                ) : null}

                {isOrderPaid ? (
                  <div className="mt-4 flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700 ring-1 ring-emerald-100">
                    <CheckCircle2 className="h-5 w-5" />
                    Payment completed successfully.
                  </div>
                ) : selectedPaymentMethod !== 'cash' ? (
                  <button
                    type="button"
                    onClick={confirmPayment}
                    disabled={isPaying}
                    className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#8B4513] px-5 text-sm font-black text-white disabled:opacity-60"
                  >
                    {isPaying ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Pay with {selectedPaymentMethod === 'upi' ? 'UPI' : 'Card'}
                  </button>
                ) : null}
              </div>
              <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700">
                <Clock3 className="h-4 w-4" />
                Live status updates every few seconds
              </div>
              <button
                type="button"
                onClick={() => {
                  setPlacedOrder(null)
                  setOrderStatus(null)
                  setPaymentError('')
                  setScreen('categories')
                }}
                className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-2xl bg-[#8B4513] px-5 text-sm font-black text-white"
              >
                <Sparkles className="h-4 w-4" />
                Place Another Order
              </button>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  )
}

export default TableSelfOrder
