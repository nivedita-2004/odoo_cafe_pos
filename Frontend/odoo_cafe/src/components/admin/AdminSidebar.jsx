import {
  BadgePercent,
  BarChart3,
  CalendarCheck,
  ChefHat,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  Coffee,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  Table2,
  Tags,
  Users,
  X,
} from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'

const adminMenu = [
  { title: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
  { title: 'Products', path: '/admin/products', icon: Package },
  { title: 'Category', path: '/admin/category', icon: Tags },
  { title: 'Payment Method', path: '/admin/payment-method', icon: CreditCard },
  { title: 'Floor & Tables', path: '/admin/floor-tables', icon: Table2 },
  { title: 'Coupon & Promotion', path: '/admin/coupon-promotion', icon: BadgePercent },
  { title: 'Orders', path: '/admin/orders', icon: CalendarCheck },
  { title: 'User/Employee', path: '/admin/users', icon: Users },
  { title: 'POS Session', path: '/admin/pos-session', icon: Clock },
  { title: 'KDS', path: '/admin/kds', icon: ChefHat },
  { title: 'Reports', path: '/admin/reports', icon: BarChart3 },
  { title: 'Settings', path: '/admin/settings', icon: Settings },
]

const AdminSidebar = ({ isOpen, isCollapsed, onClose, onToggleCollapse }) => {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-200 bg-white  transition-all duration-300 ease-in-out lg:translate-x-0 lg:shadow-none ${
          isCollapsed ? 'lg:w-20' : 'lg:w-62'
        } ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } w-72`}
      >
        {/* Header */}
        <div
          className={`relative flex h-16 items-center border-b border-slate-200 px-4 ${
            isCollapsed ? 'lg:justify-center' : 'justify-between'
          }`}
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#fcd8b8] text-[#9a5a2e] border border-[#f0bd91]">
              <Coffee className="h-5 w-5" />
            </span>

            <div className={`min-w-0 ${isCollapsed ? 'lg:hidden' : ''}`}>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-slate-400">
                Admin Panel
              </p>
              <h1 className="text-sm font-bold text-slate-900">
                Cafe POS Admin
              </h1>
            </div>
          </div>

          {/* Desktop collapse button */}
          <button
            type="button"
            onClick={onToggleCollapse}
            className={`hidden h-7 w-7 items-center justify-center rounded-xl text-slate-500 transition hover:bg-[#fff3e8] hover:text-[#9a5a2e] lg:inline-flex ${
              isCollapsed
                ? 'lg:absolute lg:-right-4 lg:top-6 lg:bg-white  lg:border-1 lg:border-slate-200'
                : ''
            }`}
            aria-label="Toggle admin sidebar"
          >
            {isCollapsed ? (
              <ChevronsRight className="h-4 w-4" />
            ) : (
              <ChevronsLeft className="h-4 w-4" />
            )}
          </button>

          {/* Mobile close button */}
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-[#fff3e8] hover:text-[#9a5a2e] lg:hidden"
            aria-label="Close admin sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Menu */}
        <nav className="min-h-0 flex-1 overflow-y-auto no-scrollbar overflow-x-hidden px-3 py-4">
          <div className="space-y-1.5">
            {adminMenu.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `group relative flex h-11 items-center rounded-xl text-sm font-bold  ${
                    isCollapsed ? 'lg:justify-center lg:px-0' : 'gap-3 px-3'
                  } ${
                    isActive
                      ? 'bg-[#c8793f] text-white '
                      : 'text-slate-600 hover:bg-[#fff3e8] hover:text-[#9a5a2e]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      className={`h-[24px] w-[24px] shrink-0 transition ${
                        isActive
                          ? 'text-white'
                          : 'text-slate-400 group-hover:text-[#9a5a2e]'
                      }`}
                    />

                    <span
                      className={`truncate ${
                        isCollapsed ? 'lg:hidden' : ''
                      }`}
                    >
                      {item.title}
                    </span>

                    {/* Tooltip in collapsed mode */}
                    {isCollapsed ? (
                      <span className="pointer-events-none fixed left-24 z-[80] hidden whitespace-nowrap rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white opacity-0 group-hover:opacity-100 lg:block">
                        {item.title}
                      </span>
                    ) : null}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Logout */}
        <div className="border-t border-slate-200 p-3">
          <button
            type="button"
            onClick={handleLogout}
            className={`group flex h-11 w-full items-center rounded-xl text-[13px] font-bold text-slate-600 transition hover:bg-red-50 hover:text-red-600 ${
              isCollapsed ? 'lg:justify-center lg:px-0' : 'gap-3 px-3'
            }`}
          >
            <LogOut className="h-[18px] w-[18px] shrink-0 text-slate-400 transition group-hover:text-red-500" />
            <span className={isCollapsed ? 'lg:hidden' : ''}>Log-Out</span>

            {isCollapsed ? (
              <span className="pointer-events-none fixed left-24 z-[80] hidden whitespace-nowrap rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white opacity-0 group-hover:opacity-100  lg:block">
                Log-Out
              </span>
            ) : null}
          </button>
        </div>
      </aside>
    </>
  )
}

export default AdminSidebar
