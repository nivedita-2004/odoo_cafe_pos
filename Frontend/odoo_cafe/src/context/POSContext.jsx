/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  createEmployeeCustomer,
  createEmployeeOrder,
  deleteEmployeeCustomer,
  applyEmployeeCoupon,
  getActiveEmployeeSession,
  getEmployeeCustomers,
  getEmployeeOrder,
  getEmployeeOrders,
  openEmployeeSession,
  payEmployeeOrder,
  previewEmployeeOrderTotals,
  updateEmployeeCustomer,
  updateEmployeeOrder,
  updateEmployeeOrderStatus,
  verifyEmployeeRazorpayPayment,
} from '../api/employeePosApi'
import { useAuth } from './AuthContext.jsx'
import { calculateTotal } from '../utils/cartCalculations'
import { tableKey } from '../utils/orderHelpers'

const POSContext = createContext(null)
const POS_DRAFT_STORAGE_KEY = 'odoo-cafe-pos-active-draft'

const toNumber = (value) => Number(value || 0)

const readSavedDraft = () => {
  try {
    const saved = window.localStorage.getItem(POS_DRAFT_STORAGE_KEY)
    return saved ? JSON.parse(saved) : {}
  } catch {
    return {}
  }
}

const writeSavedDraft = (draft) => {
  try {
    const hasDraft =
      draft.selectedTable ||
      draft.cartItems.length ||
      draft.selectedCustomer ||
      draft.appliedCoupon ||
      draft.currentOrderId

    if (!hasDraft) {
      window.localStorage.removeItem(POS_DRAFT_STORAGE_KEY)
      return
    }

    window.localStorage.setItem(POS_DRAFT_STORAGE_KEY, JSON.stringify(draft))
  } catch {
    // Local storage can be unavailable in private mode; POS should still work.
  }
}

const statusToUi = (status) =>
  ({
    DRAFT: 'Draft',
    TO_COOK: 'To Cook',
    PREPARING: 'Preparing',
    COMPLETED: 'Completed',
    PAID: 'Paid',
    CANCELLED: 'Cancelled',
  })[status] || status || 'Draft'

const normalizeOrder = (order) => {
  const items = (order.items || []).map((item) => ({
    id: item.product_id || item.id,
    orderItemId: item.id,
    name: item.product_name || item.name,
    price: toNumber(item.unit_price || item.price),
    quantity: toNumber(item.quantity),
    tax: 0,
  }))

  return {
    id: String(order.id),
    backendId: order.id,
    orderNumber: order.order_number || order.orderNumber || `ORD-${order.id}`,
    date: order.created_at || order.date || new Date().toISOString(),
    customer: order.customer_name
      ? { id: order.customer_id, name: order.customer_name, phone: order.customer_phone }
      : order.customer || null,
    table: {
      id: order.table_id,
      number: order.table_number,
      floor: order.floor_name,
    },
    items,
    paymentMethod: order.payment_method || order.paymentMethod || '',
    status: statusToUi(order.status),
    subtotal: toNumber(order.subtotal),
    tax: toNumber(order.tax_amount),
    productDiscount: 0,
    orderDiscount: 0,
    couponDiscount: toNumber(order.discount_amount),
    total: toNumber(order.total_amount),
    amount: toNumber(order.total_amount),
  }
}

export const POSProvider = ({ children }) => {
  const { user } = useAuth()
  const savedDraft = useMemo(() => readSavedDraft(), [])
  const [selectedTable, setSelectedTable] = useState(savedDraft.selectedTable || null)
  const [cartItems, setCartItems] = useState(savedDraft.cartItems || [])
  const [selectedCustomer, setSelectedCustomer] = useState(savedDraft.selectedCustomer || null)
  const [appliedCoupon, setAppliedCoupon] = useState(savedDraft.appliedCoupon || null)
  const [orders, setOrders] = useState([])
  const [sessionStart] = useState(() => Date.now())
  const [customers, setCustomers] = useState([])
  const [paymentMethod, setPaymentMethod] = useState(savedDraft.paymentMethod || 'cash')
  const [kitchenOrders, setKitchenOrders] = useState([])
  const [toast, setToast] = useState(null)
  const [lastReceipt, setLastReceipt] = useState(null)
  const [activeSession, setActiveSession] = useState(null)
  const [currentOrderId, setCurrentOrderId] = useState(savedDraft.currentOrderId || null)
  const [previewTotals, setPreviewTotals] = useState(null)

  const employee = useMemo(
    () => ({
      id: user?.id,
      name: user?.name || user?.fullName || 'Employee',
      role: user?.role || 'employee',
      email: user?.email,
    }),
    [user],
  )

  const fallbackTotals = useMemo(
    () => calculateTotal(cartItems, appliedCoupon),
    [cartItems, appliedCoupon],
  )

  const totals = cartItems.length ? previewTotals || fallbackTotals : fallbackTotals

  const showToast = (message, type = 'success') => {
    setToast({ message, type, id: Date.now() })
  }

  const loadOrders = async () => {
    const response = await getEmployeeOrders()
    setOrders((response.data.orders || []).map(normalizeOrder))
  }

  const loadCustomers = async () => {
    const response = await getEmployeeCustomers()
    setCustomers(response.data.customers || [])
  }

  const ensureActiveSession = async () => {
    const response = await getActiveEmployeeSession()
    if (response.data.activeSession) {
      setActiveSession(response.data.activeSession)
      return response.data.activeSession
    }

    const openResponse = await openEmployeeSession(0)
    const session = openResponse.data.session
    setActiveSession(session)
    return session
  }

  useEffect(() => {
    const loadInitialPosData = async () => {
      try {
        await Promise.all([ensureActiveSession(), loadOrders(), loadCustomers()])
      } catch (error) {
        showToast(error.response?.data?.message || 'Unable to load POS data', 'error')
      }
    }

    loadInitialPosData()
    const refreshTimer = window.setInterval(() => {
      loadOrders().catch(() => {})
    }, 30000)

    return () => window.clearInterval(refreshTimer)
  }, [])

  useEffect(() => {
    if (!cartItems.length) {
      return undefined
    }

    const timer = window.setTimeout(async () => {
      try {
        const response = await previewEmployeeOrderTotals({
          coupon_code: appliedCoupon?.code || undefined,
          items: cartItems.map((item) => ({
            product_id: item.id,
            quantity: item.quantity,
          })),
        })
        setPreviewTotals(response.data.totals)
      } catch {
        setPreviewTotals(null)
      }
    }, 250)

    return () => window.clearTimeout(timer)
  }, [cartItems, appliedCoupon])

  useEffect(() => {
    writeSavedDraft({
      selectedTable,
      cartItems,
      selectedCustomer,
      appliedCoupon,
      paymentMethod,
      currentOrderId,
    })
  }, [appliedCoupon, cartItems, currentOrderId, paymentMethod, selectedCustomer, selectedTable])

  const selectTable = (table) => {
    if (selectedTable && tableKey(selectedTable) === tableKey(table)) {
      setSelectedTable(null)
      setCurrentOrderId(null)
      return
    }

    setSelectedTable(table)
    const draftForTable = orders.find(
      (order) => order.status === 'Draft' && tableKey(order.table) === tableKey(table),
    )

    if (draftForTable) {
      setCurrentOrderId(draftForTable.backendId)
      setCartItems(draftForTable.items)
      setSelectedCustomer(draftForTable.customer || null)
      setAppliedCoupon(draftForTable.coupon || null)
    }
  }

  const addToCart = (product) => {
    setCartItems((items) => {
      const exists = items.find((item) => item.id === product.id)
      if (exists) {
        return items.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        )
      }
      return [...items, { ...product, quantity: 1 }]
    })
    showToast(`${product.name} added`)
  }

  const increaseQty = (id) => {
    setCartItems((items) =>
      items.map((item) => (item.id === id ? { ...item, quantity: item.quantity + 1 } : item)),
    )
  }

  const decreaseQty = (id) => {
    setCartItems((items) =>
      items
        .map((item) => (item.id === id ? { ...item, quantity: item.quantity - 1 } : item))
        .filter((item) => item.quantity > 0),
    )
  }

  const removeItem = (id) => {
    setCartItems((items) => items.filter((item) => item.id !== id))
  }

  const clearCart = () => {
    setCartItems([])
    setSelectedCustomer(null)
    setAppliedCoupon(null)
    setPreviewTotals(null)
    setPaymentMethod('cash')
    setCurrentOrderId(null)
  }

  const applyCoupon = async (code) => {
    const couponCode = code.trim()
    if (!couponCode) {
      showToast('Enter coupon code', 'error')
      return false
    }

    try {
      const response = await applyEmployeeCoupon({
        coupon_code: couponCode,
        order_amount: fallbackTotals.total,
      })
      const coupon = response.data.coupon
      setPreviewTotals(null)
      setAppliedCoupon(coupon)
      if (cartItems.length) {
        const totalsResponse = await previewEmployeeOrderTotals({
          coupon_code: couponCode,
          items: cartItems.map((item) => ({
            product_id: item.id,
            quantity: item.quantity,
          })),
        })
        setPreviewTotals(totalsResponse.data.totals)
      }
      showToast(`${coupon.code} applied`)
      return true
    } catch (error) {
      showToast(error.response?.data?.message || 'Invalid coupon code', 'error')
      return false
    }
  }

  const removeCoupon = () => {
    setPreviewTotals(null)
    setAppliedCoupon(null)
    showToast('Coupon removed')
  }

  const selectCustomer = (customer) => {
    setSelectedCustomer(customer)
    showToast(`${customer.name} selected`)
  }

  const upsertCustomer = async (customer) => {
    try {
      if (customer.id) {
        await updateEmployeeCustomer(customer.id, customer)
        showToast('Customer updated')
      } else {
        await createEmployeeCustomer(customer)
        showToast('Customer created')
      }
      await loadCustomers()
    } catch (error) {
      showToast(error.response?.data?.message || 'Unable to save customer', 'error')
    }
  }

  const deleteCustomer = async (id) => {
    try {
      await deleteEmployeeCustomer(id)
      setCustomers((current) => current.filter((customer) => customer.id !== id))
      if (selectedCustomer?.id === id) setSelectedCustomer(null)
      showToast('Customer deleted')
    } catch (error) {
      showToast(error.response?.data?.message || 'Unable to delete customer', 'error')
    }
  }

  const orderPayload = () => ({
    table_id: selectedTable?.id,
    customer_id: selectedCustomer?.id || null,
    coupon_code: appliedCoupon?.code || undefined,
    items: cartItems.map((item) => ({
      product_id: item.id,
      quantity: item.quantity,
    })),
  })

  const persistCurrentOrder = async () => {
    if (!selectedTable?.id) {
      showToast('Select a table first', 'error')
      return null
    }

    if (!cartItems.length) {
      showToast('Cart is empty', 'error')
      return null
    }

    await ensureActiveSession()
    const payload = orderPayload()

    if (currentOrderId) {
      await updateEmployeeOrder(currentOrderId, payload)
      return currentOrderId
    }

    const response = await createEmployeeOrder(payload)
    const orderId = response.data.orderId
    setCurrentOrderId(orderId)
    return orderId
  }

  const createDraftOrder = async () => {
    showToast('Complete payment to create the order', 'error')
    return null
  }

  const sendToKitchen = async () => {
    showToast('Complete payment to create the order', 'error')
  }

  const cancelCurrentDraftOrder = async (orderId = currentOrderId) => {
    if (!orderId) return

    try {
      await updateEmployeeOrderStatus(orderId, 'CANCELLED')
      await loadOrders()
      setCurrentOrderId(null)
    } catch {
      // Payment cancellation cleanup should not block the cashier flow.
    }
  }

  const completePayment = async (method, options = {}) => {
    let orderId = null

    try {
      orderId = await persistCurrentOrder()
      if (!orderId) return null

      await payEmployeeOrder(orderId, {
        payment_method: method.toUpperCase(),
        transaction_reference: options.reference || null,
        amount: options.amount ?? totals.total,
        send_email: Boolean(options.sendEmail),
      })

      const response = await getEmployeeOrder(orderId)
      const paidOrder = normalizeOrder(response.data.order)
      paidOrder.paymentMethod = method
      setPaymentMethod(method)
      setLastReceipt(paidOrder)
      await loadOrders()
      showToast('Payment completed')
      clearCart()
      return paidOrder
    } catch (error) {
      if (orderId) {
        await cancelCurrentDraftOrder(orderId)
      }
      showToast(error.response?.data?.message || 'Unable to complete payment', 'error')
      return null
    }
  }

  const completeVerifiedOnlinePayment = async (method, paymentResult) => {
    let orderId = null

    try {
      orderId = await persistCurrentOrder()
      if (!orderId) return null

      await verifyEmployeeRazorpayPayment(orderId, {
        payment_method: method.toUpperCase(),
        razorpay_order_id: paymentResult.razorpay_order_id,
        razorpay_payment_id: paymentResult.razorpay_payment_id,
        razorpay_signature: paymentResult.razorpay_signature,
      })

      const response = await getEmployeeOrder(orderId)
      const paidOrder = normalizeOrder(response.data.order)
      paidOrder.paymentMethod = method
      setPaymentMethod(method)
      setLastReceipt(paidOrder)
      await loadOrders()
      showToast('Payment completed')
      clearCart()
      return paidOrder
    } catch (error) {
      if (orderId) {
        await cancelCurrentDraftOrder(orderId)
      }
      showToast(error.response?.data?.message || 'Unable to complete payment', 'error')
      return null
    }
  }

  const editOrder = async (orderId) => {
    const order = orders.find((item) => item.id === String(orderId))
    if (!order || order.status !== 'Draft') return false

    try {
      const response = await getEmployeeOrder(order.backendId)
      const orderDetail = normalizeOrder(response.data.order)
      setCurrentOrderId(orderDetail.backendId)
      setSelectedTable(orderDetail.table)
      setSelectedCustomer(orderDetail.customer || null)
      setAppliedCoupon(null)
      setCartItems(orderDetail.items)
      return true
    } catch (error) {
      showToast(error.response?.data?.message || 'Unable to edit order', 'error')
      return false
    }
  }

  const deleteOrder = async (orderId) => {
    try {
      await updateEmployeeOrderStatus(orderId, 'CANCELLED')
      await loadOrders()
      showToast('Order cancelled')
    } catch (error) {
      showToast(error.response?.data?.message || 'Unable to cancel order', 'error')
    }
  }

  const value = {
    employee,
    selectedTable,
    cartItems,
    selectedCustomer,
    appliedCoupon,
    orders,
    customers,
    paymentMethod,
    kitchenOrders,
    totals,
    toast,
    lastReceipt,
    activeSession,
    currentOrderId,
    loadOrders,
    persistCurrentOrder,
    setToast,
    setLastReceipt,
    setPaymentMethod,
    selectTable,
    addToCart,
    increaseQty,
    decreaseQty,
    removeItem,
    clearCart,
    applyCoupon,
    removeCoupon,
    selectCustomer,
    upsertCustomer,
    deleteCustomer,
    sendToKitchen,
    completePayment,
    completeVerifiedOnlinePayment,
    cancelCurrentDraftOrder,
    createDraftOrder,
    editOrder,
    deleteOrder,
    sessionStart,
  }

  return <POSContext.Provider value={value}>{children}</POSContext.Provider>
}

export const usePOS = () => {
  const context = useContext(POSContext)
  if (!context) {
    throw new Error('usePOS must be used inside POSProvider')
  }
  return context
}
