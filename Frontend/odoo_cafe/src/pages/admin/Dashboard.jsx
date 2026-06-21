import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Armchair,
  Banknote,
  ChefHat,
  Clock3,
  CreditCard,
  IndianRupee,
  Package,
  ShoppingCart,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { getAdminDashboard } from '../../api/dashboardApi'
import { formatCurrency } from '../../utils/formatCurrency'

const defaultDashboardData = {
  summary: {
    totalOrders: 0,
    totalRevenue: 0,
    averageOrderValue: 0,
    todaysOrders: 0,
    pendingKitchenOrders: 0,
    activeTables: 0,
    totalProducts: 0,
    activeEmployees: 0,
  },
  salesTrend: [],
  paymentSummary: [],
  topProducts: [],
  topCategories: [],
  recentOrders: [],
  kitchenStatus: [],
  tableOccupancy: {
    totalTables: 0,
    activeTables: 0,
    availableTables: 0,
  },
}

const paymentIcons = {
  Cash: Banknote,
  UPI: Wallet,
  Card: CreditCard,
}

const statusStyles = {
  Paid: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  Preparing: 'bg-amber-50 text-amber-700 ring-amber-100',
  Pending: 'bg-rose-50 text-rose-700 ring-rose-100',
}

const SectionCard = ({ title, children, className = '' }) => (
  <section className={`rounded-lg bg-white p-2.5 border border-slate-100 ${className}`}>
    <h3 className="text-base font-black text-slate-900">{title}</h3>
    {children}
  </section>
)

const StatCard = ({ stat }) => {
  const Icon = stat.icon
  const value = stat.type === 'currency' ? formatCurrency(stat.value) : stat.value

  return (
    <article className="rounded-lg bg-white p-3 border border-slate-200">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-500">{stat.label}</p>
          <p className="mt-2 text-xl font-black text-slate-950">{value}</p>
        </div>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${stat.iconClass}`}>
          <Icon className="h-6 w-6" />
        </span>
      </div>
    </article>
  )
}

const SalesTrendChart = ({ salesTrend }) => {
  return (
    <SectionCard title="Sales Trend" className="lg:col-span-2">
      <div className="mt-4 h-56 min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={salesTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#E2E8F0" strokeDasharray="4 4" vertical={false} />
            <XAxis
              dataKey="day"
              tickFormatter={(value) => value.slice(0, 3)}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748B', fontSize: 12, fontWeight: 700 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748B', fontSize: 12, fontWeight: 700 }}
              tickFormatter={(value) => `₹${value / 1000}k`}
            />
            <Tooltip
              cursor={{ fill: '#fff3e8' }}
              formatter={(value) => [formatCurrency(value), 'Sales']}
              labelStyle={{ color: '#0F172A', fontWeight: 800 }}
              contentStyle={{
                border: '1px solid #E2E8F0',
                borderRadius: '2px'
              }}
            />
            <Bar dataKey="amount" fill="#c8793f" radius={[10, 10, 4, 4]} barSize={42} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  )
}

const PaymentSummary = ({ paymentSummary }) => {
  const totalPayment = paymentSummary.reduce((sum, item) => sum + item.amount, 0)

  return (
    <SectionCard title="Payment Summary">
      <div className="mt-4 space-y-4">
        {paymentSummary.map((item) => {
          const Icon = paymentIcons[item.label] || Wallet
          const percentage = totalPayment ? Math.round((item.amount / totalPayment) * 100) : 0

          return (
            <div key={item.label}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#fff3e8] text-[#9a5a2e]">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-black text-slate-800">{item.label}</span>
                </div>
                <span className="text-sm font-black text-slate-950">{formatCurrency(item.amount)}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div className="h-2 rounded-full bg-[#c8793f]" style={{ width: `${percentage}%` }} />
              </div>
              <p className="mt-1 text-right text-xs font-bold text-slate-500">{percentage}%</p>
            </div>
          )
        })}
      </div>
    </SectionCard>
  )
}

const TopProductsTable = ({ topProducts }) => (
  <SectionCard title="Top Products" className="lg:col-span-2">
    <div className="mt-4 overflow-x-auto">
      <table className="min-w-[560px] w-full text-left">
        <thead>
          <tr className="border-b border-slate-200 text-xs font-black uppercase text-slate-500">
            <th className="py-2.5 pr-4">Product Name</th>
            <th className="py-2.5 pr-4">Category</th>
            <th className="py-2.5 pr-4">Quantity Sold</th>
            <th className="py-2.5">Revenue</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {topProducts.map((product) => (
            <tr key={product.name} className="text-sm">
              <td className="py-3 pr-4 font-black text-slate-900">{product.name}</td>
              <td className="py-3 pr-4 font-bold text-slate-500">{product.category}</td>
              <td className="py-3 pr-4 font-bold text-slate-700">{product.quantity}</td>
              <td className="py-3 font-black text-slate-900">{formatCurrency(product.revenue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </SectionCard>
)

const TopCategories = ({ topCategories }) => {
  const maxRevenue = Math.max(...topCategories.map((item) => item.revenue), 0)

  return (
    <SectionCard title="Top Categories">
      <div className="mt-4 space-y-3">
        {topCategories.map((item) => {
          const percentage = maxRevenue ? Math.round((item.revenue / maxRevenue) * 100) : 0

          return (
            <div key={item.category}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-sm font-black text-slate-800">{item.category}</span>
                <span className="text-sm font-black text-slate-950">{formatCurrency(item.revenue)}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full"
                  style={{ width: `${percentage}%`, backgroundColor: item.color || '#c8793f' }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </SectionCard>
  )
}

const RecentOrdersTable = ({ recentOrders }) => (
  <SectionCard title="Recent Orders" className="xl:col-span-3">
    <div className="mt-4 overflow-x-auto">
      <table className="min-w-[800px] w-full text-left">
        <thead>
          <tr className="border-b border-slate-200 text-xs font-black uppercase text-slate-500">
            <th className="py-2.5 pr-4">Order No</th>
            <th className="py-2.5 pr-4">Table</th>
            <th className="py-2.5 pr-4">Customer</th>
            <th className="py-2.5 pr-4">Employee</th>
            <th className="py-2.5 pr-4">Amount</th>
            <th className="py-2.5 pr-4">Payment Method</th>
            <th className="py-2.5 pr-4">Status</th>
            <th className="py-2.5">Time</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {recentOrders.map((order) => (
            <tr key={order.orderNo} className="text-sm">
              <td className="py-3 pr-4 font-black text-slate-900">{order.orderNo}</td>
              <td className="py-3 pr-4 font-bold text-slate-600">{order.table}</td>
              <td className="py-3 pr-4 font-bold text-slate-700">{order.customer}</td>
              <td className="py-3 pr-4 font-bold text-slate-500">{order.employee}</td>
              <td className="py-3 pr-4 font-black text-slate-900">{formatCurrency(order.amount)}</td>
              <td className="py-3 pr-4 font-bold text-slate-600">{order.paymentMethod}</td>
              <td className="py-3 pr-4">
                <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${statusStyles[order.status] || statusStyles.Pending}`}>
                  {order.status}
                </span>
              </td>
              <td className="py-3 font-bold text-slate-500">{order.time}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </SectionCard>
)

const KitchenStatusOverview = ({ kitchenStatus }) => (
  <SectionCard title="Kitchen Status Overview">
    <div className="mt-4 grid grid-cols-3 gap-2">
      {kitchenStatus.map((item) => (
        <div key={item.label} className="rounded-2xl bg-slate-50 p-4 text-center ring-1 ring-slate-100">
          <p className="text-2xl font-black text-slate-950">{item.value}</p>
          <p className="mt-2 text-xs font-black text-slate-500">{item.label}</p>
        </div>
      ))}
    </div>
  </SectionCard>
)

const TableOccupancyOverview = ({ tableOccupancy }) => {
  const rows = [
    { label: 'Total Tables', value: tableOccupancy.totalTables },
    { label: 'Active Tables', value: tableOccupancy.activeTables },
    { label: 'Available Tables', value: tableOccupancy.availableTables },
  ]

  return (
    <SectionCard title="Table Occupancy Overview">
      <div className="mt-4 grid grid-cols-3 gap-2">
        {rows.map((item) => (
          <div key={item.label} className="rounded-2xl bg-[#fff3e8] p-4 text-center ring-1 ring-[#fcd8b8]">
            <p className="text-2xl font-black text-[#9a5a2e]">{item.value}</p>
            <p className="mt-2 text-xs font-black text-slate-600">{item.label}</p>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(defaultDashboardData)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setIsLoading(true)
        setError('')
        const response = await getAdminDashboard()
        setDashboardData({ ...defaultDashboardData, ...response.data.data })
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load dashboard data.')
      } finally {
        setIsLoading(false)
      }
    }

    loadDashboard()
  }, [])

  const summaryStats = useMemo(() => [
    {
      label: 'Total Orders',
      value: dashboardData.summary.totalOrders,
      icon: ShoppingCart,
      iconClass: 'bg-[#fff3e8] text-[#9a5a2e] ring-[#fcd8b8]',
    },
    {
      label: 'Total Revenue',
      value: dashboardData.summary.totalRevenue,
      type: 'currency',
      icon: IndianRupee,
      iconClass: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
    },
    {
      label: 'Average Order Value',
      value: dashboardData.summary.averageOrderValue,
      type: 'currency',
      icon: TrendingUp,
      iconClass: 'bg-violet-50 text-violet-600 ring-violet-100',
    },
    {
      label: "Today's Orders",
      value: dashboardData.summary.todaysOrders,
      icon: Clock3,
      iconClass: 'bg-amber-50 text-amber-600 ring-amber-100',
    },
    {
      label: 'Pending Kitchen Orders',
      value: dashboardData.summary.pendingKitchenOrders,
      icon: ChefHat,
      iconClass: 'bg-rose-50 text-rose-600 ring-rose-100',
    },
    {
      label: 'Active Tables',
      value: dashboardData.summary.activeTables,
      icon: Armchair,
      iconClass: 'bg-cyan-50 text-cyan-600 ring-cyan-100',
    },
    {
      label: 'Total Products',
      value: dashboardData.summary.totalProducts,
      icon: Package,
      iconClass: 'bg-orange-50 text-orange-600 ring-orange-100',
    },
    {
      label: 'Active Employees',
      value: dashboardData.summary.activeEmployees,
      icon: Users,
      iconClass: 'bg-indigo-50 text-indigo-600 ring-indigo-100',
    },
  ], [dashboardData.summary])

  return (
    <div className="min-h-screen">
      {error ? (
        <div className="mb-3 rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
          {error}
        </div>
      ) : null}
      {isLoading ? (
        <div className="mb-3 rounded-lg border border-[#fcd8b8] bg-[#fff3e8] px-4 py-3 text-sm font-bold text-[#9a5a2e]">
          Loading dashboard data...
        </div>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {summaryStats.map((stat) => (
          <StatCard key={stat.label} stat={stat} />
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <SalesTrendChart salesTrend={dashboardData.salesTrend} />
        <PaymentSummary paymentSummary={dashboardData.paymentSummary} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <TopProductsTable topProducts={dashboardData.topProducts} />
        <TopCategories topCategories={dashboardData.topCategories} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <RecentOrdersTable recentOrders={dashboardData.recentOrders} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <KitchenStatusOverview kitchenStatus={dashboardData.kitchenStatus} />
        <TableOccupancyOverview tableOccupancy={dashboardData.tableOccupancy} />
      </div>
    </div>
  )
}

export default Dashboard
