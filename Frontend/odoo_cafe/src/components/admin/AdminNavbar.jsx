import { Bell, Menu, Search, UserCircle, X } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useGlobalSearch } from '../../context/GlobalSearchContext.jsx'

const adminPageTitles = {
  '/admin/dashboard': 'Dashboard',
  '/admin/products': 'Products',
  '/admin/category': 'Category',
  '/admin/payment-method': 'Payment Method',
  '/admin/floor-tables': 'Floor & Tables',
  '/admin/coupon-promotion': 'Coupon & Promotion',
  '/admin/orders': 'Orders',
  '/admin/users': 'User/Employee',
  '/admin/pos-session': 'POS Session',
  '/admin/kds': 'KDS',
  '/admin/reports': 'Reports',
  '/admin/settings': 'Settings',
}

const AdminNavbar = ({ onMenuClick }) => {
  const { pathname } = useLocation()
  const { searchQuery, setSearchQuery, clearSearch } = useGlobalSearch()
  const pageTitle = adminPageTitles[pathname] || 'Admin Panel'

  return (
    <header className="sticky top-0 z-30 border border-slate-200 bg-white px-3 py-2">
      <div className="flex items-center justify-between gap-4">
        {/* Left section */}
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 ring-1 ring-slate-200 transition hover:bg-[#fff3e8] hover:text-[#9a5a2e] lg:hidden"
            aria-label="Open admin sidebar"
          >
            <Menu className="h-4 w-4" />
          </button>

          <div className="min-w-0">
          
            <h2 className="truncate text-lg font-bold leading-tight text-slate-900 ">
              {pageTitle}
            </h2>
          </div>
        </div>

        {/* Middle search - desktop only */}
        <div className="hidden max-w-md flex-1 md:block">
          <div className="flex h-10 items-center gap-2 rounded-sm bg-slate-50 px-3 text-slate-500 border border-slate-200">
            <Search className="h-4 w-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={`Search ${pageTitle.toLowerCase()}...`}
              className="w-full bg-transparent text-sm font-medium text-slate-700 outline-none placeholder:text-slate-400"
            />
            {searchQuery ? (
              <button type="button" onClick={clearSearch} className="rounded-md p-1 text-slate-400 hover:bg-white hover:text-slate-700" aria-label="Clear search">
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>

        {/* Right section */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            className="hidden h-10 w-10 items-center justify-center text-gray-800 inline-flex"
            aria-label="Notifications"
          >
            <Bell className="h-6 w-6" />
          </button>

          <div className="flex h-10 items-center gap-2 rounded-xl bg-white px-2.5 border border-slate-200">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#fff3e8] text-[#9a5a2e]">
              <UserCircle className="h-5 w-5" />
            </span>

            <div className="hidden leading-tight sm:block">
              <p className="text-xs font-black text-slate-900">Admin User</p>
              <p className="text-[10px] font-bold text-[#9a5a2e]">Admin</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default AdminNavbar
