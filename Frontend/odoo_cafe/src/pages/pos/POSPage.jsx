import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import CartSection from '../../components/pos/CartSection'
import CustomerModal from '../../components/pos/CustomerModal'
import DiscountPopup from '../../components/pos/DiscountPopup'
import PaymentSection from '../../components/pos/PaymentSection'
import ProductSection from '../../components/pos/ProductSection'
import ReceiptModal from '../../components/pos/ReceiptModal'
import { usePOS } from '../../context/POSContext.jsx'

const tabs = ['Products', 'Cart', 'Payment']

const POSPage = () => {
  const { openFloorPopup } = useOutletContext()
  const { lastReceipt, setLastReceipt } = usePOS()
  const [activeTab, setActiveTab] = useState('Products')
  const [couponOpen, setCouponOpen] = useState(false)
  const [customerOpen, setCustomerOpen] = useState(false)

  useEffect(() => {
    openFloorPopup()
  }, [openFloorPopup])

  return (
    <main className="p-3 sm:p-4">
      <div className="sticky top-[73px] z-20 mb-3 grid grid-cols-3 gap-2 rounded-lg border border-slate-200 bg-white/95 p-1.5 shadow-sm backdrop-blur lg:hidden">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-md px-2 py-2.5 text-xs font-black sm:text-sm ${
              activeTab === tab ? 'bg-[#c8793f] text-white shadow-sm' : 'text-slate-600 hover:bg-[#fff3e8] hover:text-[#9a5a2e]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="grid gap-3 lg:min-h-[calc(100vh-96px)] lg:grid-cols-[minmax(0,1.35fr)_minmax(310px,0.78fr)_minmax(275px,0.56fr)] xl:gap-4">
        <div className={activeTab === 'Products' ? 'block' : 'hidden lg:block'}>
          <ProductSection />
        </div>
        <div className={activeTab === 'Cart' ? 'block' : 'hidden lg:block'}>
          <CartSection
            onCoupon={() => setCouponOpen(true)}
            onCustomer={() => setCustomerOpen(true)}
          />
        </div>
        <div className={activeTab === 'Payment' ? 'block' : 'hidden lg:block'}>
          <PaymentSection />
        </div>
      </div>

      {couponOpen ? <DiscountPopup onClose={() => setCouponOpen(false)} /> : null}
      {customerOpen ? <CustomerModal onClose={() => setCustomerOpen(false)} /> : null}
      {lastReceipt ? (
        <ReceiptModal order={lastReceipt} onClose={() => setLastReceipt(null)} />
      ) : null}
    </main>
  )
}

export default POSPage
