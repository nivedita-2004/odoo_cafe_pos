import { useCallback, useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import FloorPopup from '../components/pos/FloorPopup'
import POSNavbar from '../components/pos/POSNavbar'
import { GlobalSearchProvider } from '../context/GlobalSearchContext.jsx'
import { POSProvider, usePOS } from '../context/POSContext.jsx'

const Toast = () => {
  const { toast, setToast } = usePOS()

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), 2200)
    return () => clearTimeout(timer)
  }, [toast, setToast])

  if (!toast) return null

  return (
    <div
      className={`fixed right-4 top-4 z-[70] rounded-2xl px-4 py-3 text-sm font-bold shadow-2xl ${
        toast.type === 'error' ? 'bg-[#EF4444] text-white' : 'bg-[#22C55E] text-white'
      }`}
    >
      {toast.message}
    </div>
  )
}

const POSLayoutContent = () => {
  const [showFloor, setShowFloor] = useState(false)
  const openFloorPopup = useCallback(() => setShowFloor(true), [])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <POSNavbar onTableClick={openFloorPopup} />
      <Outlet context={{ openFloorPopup }} />
      {showFloor ? <FloorPopup onClose={() => setShowFloor(false)} /> : null}
      <Toast />
    </div>
  )
}

const POSLayout = () => (
  <GlobalSearchProvider>
    <POSProvider>
      <POSLayoutContent />
    </POSProvider>
  </GlobalSearchProvider>
)

export default POSLayout
