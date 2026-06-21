import { Banknote, CreditCard, Loader2, QrCode } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { createEmployeeRazorpayOrder, getEmployeePaymentMethods } from '../../api/employeePosApi'
import { usePOS } from '../../context/POSContext.jsx'
import { formatCurrency } from '../../utils/formatCurrency'

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
      'bg-[#c8793f] text-white shadow-lg shadow-[#c8793f]/20 hover:bg-[#9a5a2e] focus:ring-[#fcd8b8]',
    ghost:
      'bg-white text-[#9a5a2e] ring-1 ring-slate-200 hover:bg-[#fff3e8] focus:ring-[#fcd8b8]',
    danger:
      'bg-[#EF4444] text-white shadow-lg shadow-red-500/20 hover:bg-red-600 focus:ring-red-300',
  }

  return (
    <button
      type={type}
      disabled={isLoading || props.disabled}
      className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-black transition duration-200 focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-70 ${variants[variant]} ${className}`}
      {...props}
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  )
}

const methodIcons = {
  cash: Banknote,
  'digital-card': CreditCard,
  'upi-qr': QrCode,
  upi: QrCode,
  card: CreditCard,
}

const methodPaymentKeys = {
  cash: 'cash',
  'digital-card': 'card',
  'upi-qr': 'upi',
  upi: 'upi',
  card: 'card',
}

const getMethodKey = (methodName) => {
  const name = String(methodName || '').toLowerCase()
  if (name.includes('cash')) return 'cash'
  if (name.includes('upi')) return 'upi-qr'
  return 'digital-card'
}

const normalizePaymentMethod = (method) => {
  const id = getMethodKey(method.name)
  return {
    id,
    name: id === 'digital-card' ? 'Digital/Card' : id === 'upi-qr' ? 'UPI QR' : 'Cash',
    enabled: Number(method.is_enabled) === 1,
  }
}

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

const PaymentSection = () => {
  const {
    totals,
    paymentMethod,
    setPaymentMethod,
    completePayment,
    completeVerifiedOnlinePayment,
    cancelCurrentDraftOrder,
    persistCurrentOrder,
    setToast,
  } = usePOS()
  const [received, setReceived] = useState('')
  const [isOnlinePaying, setIsOnlinePaying] = useState(false)
  const [paymentMethods, setPaymentMethods] = useState([])
  const enabledMethods = useMemo(
    () => paymentMethods.filter((method) => method.enabled),
    [paymentMethods],
  )
  const cashEnabled = enabledMethods.some((method) => (methodPaymentKeys[method.id] || method.id) === 'cash')
  const fallbackMethod = enabledMethods[0] ? methodPaymentKeys[enabledMethods[0].id] || enabledMethods[0].id : ''
  const changeDue = Number(received || 0) - totals.total

  useEffect(() => {
    setReceived(totals.total ? String(totals.total) : '')
  }, [totals.total])

  useEffect(() => {
    const loadPaymentMethods = async () => {
      try {
        const response = await getEmployeePaymentMethods()
        setPaymentMethods((response.data.paymentMethods || []).map(normalizePaymentMethod))
      } catch (error) {
        setToast({
          message: error.response?.data?.message || 'Unable to load payment methods',
          type: 'error',
          id: Date.now(),
        })
      }
    }

    loadPaymentMethods()
  }, [setToast])

  useEffect(() => {
    if (!enabledMethods.length) return
    const isSelectedEnabled = enabledMethods.some((method) => (methodPaymentKeys[method.id] || method.id) === paymentMethod)
    if (!isSelectedEnabled) {
      const nextMethod = enabledMethods[0]
      setPaymentMethod(methodPaymentKeys[nextMethod.id] || nextMethod.id)
    }
  }, [enabledMethods, paymentMethod, setPaymentMethod])

  const handleCash = () => {
    if (!cashEnabled) {
      setToast({ message: 'Cash payment is disabled by admin', type: 'error', id: Date.now() })
      return
    }

    if (Number(received || 0) < totals.total) {
      setToast({ message: 'Received amount is less than total', type: 'error', id: Date.now() })
      return
    }
    completePayment('cash', { amount: Number(received || 0) })
  }

  const handleOnlinePayment = async (method) => {
    let createdOrderId = null

    try {
      setIsOnlinePaying(true)
      const isLoaded = await loadRazorpayScript()
      if (!isLoaded) {
        throw new Error('Unable to load Razorpay checkout.')
      }

      createdOrderId = await persistCurrentOrder()
      if (!createdOrderId) return

      const orderResponse = await createEmployeeRazorpayOrder(createdOrderId)
      const razorpayOrder = orderResponse.data
      const paymentMethodConfig =
        method === 'upi'
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
          method: paymentMethodConfig,
          modal: {
            ondismiss: () => reject(new Error('Payment was cancelled.')),
          },
          theme: {
            color: '#c8793f',
          },
        })

        checkout.on('payment.failed', (response) => {
          reject(new Error(response.error?.description || 'Payment failed. Please try again.'))
        })

        checkout.open()
      })

      await completeVerifiedOnlinePayment(method, paymentResult)
    } catch (error) {
      if (createdOrderId) {
        await cancelCurrentDraftOrder(createdOrderId)
      }

      setToast({
        message: error.response?.data?.message || error.message || 'Unable to complete online payment',
        type: 'error',
        id: Date.now(),
      })
    } finally {
      setIsOnlinePaying(false)
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="mb-3">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#9a5a2e]/65">
          Payment
        </p>
        <h2 className="text-xl font-black text-slate-950">{formatCurrency(totals.total)}</h2>
      </div>

      <div className="grid gap-2">
        {enabledMethods.map((method) => {
          const Icon = methodIcons[method.id] || CreditCard
          const methodKey = methodPaymentKeys[method.id] || method.id

          return (
            <button
              key={method.id}
              type="button"
              onClick={() => setPaymentMethod(methodKey)}
              className={`flex items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-black ${
                paymentMethod === methodKey
                  ? 'bg-[#c8793f] text-white'
                  : 'bg-slate-50 text-slate-800 ring-1 ring-slate-200 hover:bg-[#fff3e8] hover:text-[#9a5a2e]'
              }`}
            >
              <Icon className="h-5 w-5" />
              {method.name}
            </button>
          )
        })}
      </div>

      <div className="mt-4">
        {!enabledMethods.length ? (
          <div className="rounded-lg bg-red-50 p-4 text-center text-sm font-black text-red-700 ring-1 ring-red-100">
            No payment method is enabled by admin.
          </div>
        ) : null}

        {paymentMethod === 'cash' ? (
          <div className="space-y-3">
            <input
              value={received}
              onChange={(event) => setReceived(event.target.value)}
              type="number"
              placeholder="Amount received"
              className="min-h-11 w-full rounded-lg border border-slate-200 px-4 text-sm font-semibold outline-none focus:border-[#c8793f]"
            />
            <p className="text-sm font-black text-slate-950">
              Change due: {formatCurrency(Math.max(changeDue, 0))}
            </p>
            <Button onClick={handleCash}>Complete Payment</Button>
          </div>
        ) : null}

        {paymentMethod === 'upi' ? (
          <div className="space-y-3">
            <div className="rounded-lg bg-[#fff3e8] p-4 text-center text-sm font-black text-[#9a5a2e] ring-1 ring-[#fcd8b8]">
              Razorpay will open UPI payment with app and QR options.
            </div>
            <Button onClick={() => handleOnlinePayment('upi')} isLoading={isOnlinePaying}>
              Pay with UPI
            </Button>
            <Button variant="ghost" onClick={() => setPaymentMethod(fallbackMethod)}>
              Cancel
            </Button>
          </div>
        ) : null}

        {paymentMethod === 'card' ? (
          <div className="space-y-3">
            <div className="rounded-lg bg-[#fff3e8] p-4 text-center text-sm font-black text-[#9a5a2e] ring-1 ring-[#fcd8b8]">
              Card payment will be verified securely through Razorpay.
            </div>
            <Button onClick={() => handleOnlinePayment('card')} isLoading={isOnlinePaying}>
              Pay with Card
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  )
}

export default PaymentSection
