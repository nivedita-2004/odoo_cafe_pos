import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import AdminNavbar from '../components/admin/AdminNavbar'
import AdminSidebar from '../components/admin/AdminSidebar'
import { GlobalSearchProvider } from '../context/GlobalSearchContext.jsx'

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <GlobalSearchProvider>
      <div className="min-h-screen  text-[#0F172A]">
      <AdminSidebar
        isOpen={sidebarOpen}
        isCollapsed={isCollapsed}
        onClose={() => setSidebarOpen(false)}
        onToggleCollapse={() => setIsCollapsed((current) => !current)}
      />
      <div
        className={`min-h-screen transition-[padding] duration-300 ${
          isCollapsed ? 'lg:pl-20' : 'lg:pl-62'
        }`}
      >
        <AdminNavbar
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="p-3">
          <Outlet />
        </main>
      </div>
      </div>
    </GlobalSearchProvider>
  )
}

export default AdminLayout
