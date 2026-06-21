import { Menu, Search, Table2, UserCircle, X } from 'lucide-react'
import logo from '../../assets/logo.png'
import { useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { useGlobalSearch } from '../../context/GlobalSearchContext.jsx'
import { usePOS } from '../../context/POSContext.jsx'

const employeeMenuItems = [
  { label: 'POS Order', path: '/pos' },
  { label: 'Orders', path: '/pos/orders' },
  { label: 'Customer', path: '/pos/customers' },
  { label: 'Table View', path: '/pos/table-view' },
  { label: 'Kitchen Display', path: '/kitchen-display' },
]

const adminMenuItems = [
  { label: 'Dashboard', path: '/admin/dashboard' },
  { label: 'Products', path: '/admin/products' },
  { label: 'Category', path: '/admin/category' },
  { label: 'Payment Method', path: '/admin/payment-method' },
  { label: 'Coupon & Promotion', path: '/admin/coupon-promotion' },
  { label: 'Orders', path: '/admin/orders' },
  { label: 'User/Employee', path: '/admin/users' },
  { label: 'KDS', path: '/admin/kds' },
  { label: 'Reports', path: '/admin/reports' },
]

const POSNavbar = ({ onTableClick }) => {
  const [open, setOpen] = useState(false)
  const { employee, selectedTable, setToast } = usePOS()
  const { logout, role } = useAuth()
  const { searchQuery, setSearchQuery, clearSearch } = useGlobalSearch()
  const navigate = useNavigate()
  const menuItems = role === 'admin' ? adminMenuItems : employeeMenuItems

  const location = useLocation()
  const currentItem = menuItems.find(
    (item) => location.pathname === item.path || location.pathname.startsWith(item.path),
  )
  const pageLabel = currentItem ? currentItem.label : 'POS Order'

  const linkClass = ({ isActive }) =>
    `rounded-md px-3 py-1 text-md font-semibold ${
      isActive ? 'bg-[#c8793f] text-white' : 'text-slate-600'
    }`

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-3 py-2.5 backdrop-blur sm:px-4">
      <div className="flex justify-end items-center gap-2 sm:gap-3">
        <div className="mr-auto min-w-0  flex items-center gap-1">
          <img src={logo} alt="Logo" className="h-14 w-18 object-cover" />
          <div className="min-w-0">
            <p className="text-xl font-bold uppercase text-[#9a5a2e]/70">odoo cafe ps</p>
            {/* <h1 className="truncate text-base font-black text-slate-950 sm:text-lg">{pageLabel}</h1> */}
          </div>
        </div>
        <nav className="hidden items-center gap-1 lg:flex">
          <NavLink to="/pos" end className={linkClass}>POS Order</NavLink>
          <NavLink to="/pos/orders" className={linkClass}>Orders</NavLink>
          <NavLink to="/pos/customers" className={linkClass}>Customer</NavLink>
          <NavLink to="/pos/table-view" className={linkClass}>Table View</NavLink>
        </nav>
        <div className="relative order-2 w-full min-w-0 sm:order-none sm:flex-1 lg:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a5a2e]/60" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={`Search ${pageLabel.toLowerCase()}...`}
            className="min-h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-10 text-sm font-semibold text-slate-800 outline-none focus:border-[#c8793f] focus:bg-white"
          />
          {searchQuery ? (
            <button type="button" onClick={clearSearch} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-white hover:text-slate-700" aria-label="Clear search">
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onTableClick}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#fff3e8] px-3 text-sm font-black text-[#9a5a2e] ring-1 ring-[#fcd8b8]"
        >
          <Table2 className="h-4 w-4" />
          {selectedTable ? selectedTable.number : 'Select Table'}
        </button>
        <div className="hidden items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm font-black text-slate-800 ring-1 ring-slate-200 md:flex">
          <UserCircle className="h-5 w-5 text-[#9a5a2e]" />
          {employee.name}
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            className="rounded-lg p-2.5 text-white bg-[#9a5a2e]"
          >
            <Menu className="h-5 w-5" />
          </button>
          {open ? (
            <div className="absolute right-0 top-12 z-40 w-64 rounded-lg bg-white p-2  border border-slate-200">
              <div className="grid gap-1 lg:hidden">
                <NavLink to="/pos" end className={linkClass}>POS Order</NavLink>
                <NavLink to="/pos/orders" className={linkClass}>Orders</NavLink>
                <NavLink to="/pos/customers" className={linkClass}>Customer</NavLink>
                <NavLink to="/pos/table-view" className={linkClass}>Table View</NavLink>
              </div>
              <div className="mt-1" />
              {menuItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/pos' || item.path === '/admin/dashboard'}
                  onClick={() => {
                    setOpen(false)
                    if (item.path.startsWith('/admin/') && item.path !== '/admin/dashboard') {
                      setToast({
                        message: `${item.label} module coming soon`,
                        type: 'success',
                        id: Date.now(),
                      })
                    }
                  }}
                  className={({ isActive }) =>
                    `block w-full rounded-lg px-3 py-2 text-left text-sm font-bold ${
                      isActive
                        ? 'bg-[#c8793f] text-white'
                        : 'text-slate-600 hover:bg-[#fff3e8] hover:text-[#9a5a2e]'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
              <button
                type="button"
                onClick={handleLogout}
                className="mt-1 block w-full rounded-xl px-3 py-2 text-left text-sm font-black text-[#EF4444] hover:bg-[#EF4444]/10"
              >
                Log-Out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}

export default POSNavbar
