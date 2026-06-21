import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'

const AdminLayout = lazy(() => import('../layouts/AdminLayout'))
const POSLayout = lazy(() => import('../layouts/POSLayout'))
const Order = lazy(() => import('../pages/admin/Order'))
const Category = lazy(() => import('../pages/admin/Category'))
const CouponPromotion = lazy(() => import('../pages/admin/CouponPromotion'))
const Dashboard = lazy(() => import('../pages/admin/Dashboard'))
const FloorTables = lazy(() => import('../pages/admin/FloorTables'))
const KDS = lazy(() => import('../pages/admin/KDS'))
const PaymentMethod = lazy(() => import('../pages/admin/PaymentMethod'))
const POSSession = lazy(() => import('../pages/admin/POSSession'))
const Products = lazy(() => import('../pages/admin/Products'))
const Reports = lazy(() => import('../pages/admin/Reports'))
const Settings = lazy(() => import('../pages/admin/Settings'))
const Users = lazy(() => import('../pages/admin/Users'))
const Login = lazy(() => import('../pages/auth/Login'))
const Signup = lazy(() => import('../pages/auth/Signup'))
const CustomerDisplay = lazy(() => import('../pages/customer/CustomerDisplay'))
const TableSelfOrder = lazy(() => import('../pages/customer/TableSelfOrder'))
const CustomersPage = lazy(() => import('../pages/pos/CustomersPage'))
const KitchenDisplay = lazy(() => import('../pages/pos/KitchenDisplay'))
const OrderDetailPage = lazy(() => import('../pages/pos/OrderDetailPage'))
const OrdersPage = lazy(() => import('../pages/pos/OrdersPage'))
const POSPage = lazy(() => import('../pages/pos/POSPage'))
const TableViewPage = lazy(() => import('../pages/pos/TableViewPage'))
const Unauthorized = lazy(() => import('../pages/Unauthorized'))

const AppRoutes = () => {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="/table/:token" element={<TableSelfOrder />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="products" element={<Products />} />
          <Route path="category" element={<Category />} />
          <Route path="payment-method" element={<PaymentMethod />} />
          <Route path="floor-tables" element={<FloorTables />} />
          <Route path="coupon-promotion" element={<CouponPromotion />} />
          <Route path="orders" element={<Order />} />
          <Route path="users" element={<Users />} />
          <Route path="pos-session" element={<POSSession />} />
          <Route path="kds" element={<KDS />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
          <Route path="categories" element={<Navigate to="/admin/category" replace />} />
          <Route path="payment-methods" element={<Navigate to="/admin/payment-method" replace />} />
          <Route path="coupons" element={<Navigate to="/admin/coupon-promotion" replace />} />
          <Route path="employees" element={<Navigate to="/admin/users" replace />} />
        </Route>
        <Route
          path="/pos"
          element={
            <ProtectedRoute allowedRoles={['admin', 'employee']}>
              <POSLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<POSPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="orders/:id" element={<OrderDetailPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="table-view" element={<TableViewPage />} />
        </Route>
        <Route
          path="/kitchen-display"
          element={
            <ProtectedRoute allowedRoles={['admin', 'employee']}>
              <KitchenDisplay />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer-display"
          element={
            <ProtectedRoute allowedRoles={['admin', 'customer']}>
              <CustomerDisplay />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  )
}

export default AppRoutes
