import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Download,
  FileSpreadsheet,
  IndianRupee,
  RefreshCw,
  ShoppingCart,
  TrendingUp,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { getAdminEmployees } from '../../api/employeesApi'
import { getAdminPosSessions } from '../../api/posSessionsApi'
import { getAdminProducts } from '../../api/productsApi'
import { exportAdminReport, getAdminSalesReport } from '../../api/reportsApi'
import { formatCurrency } from '../../utils/formatCurrency'

const inputClass =
  'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#c8793f] focus:ring-2 focus:ring-[#fcd8b8]'

const chartColors = ['#c8793f', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4']

const toNumber = (value) => Number(value || 0)

const toInt = (value) => Number.parseInt(value || 0, 10)

const toDateInput = (date) => date.toISOString().slice(0, 10)

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
      })
    : '-'

const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '-'

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

const SummaryCard = ({ label, value, icon: Icon, iconClass }) => (
  <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/50">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-bold text-slate-500">{label}</p>
        <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
      </div>
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${iconClass}`}>
        <Icon className="h-5 w-5" />
      </span>
    </div>
  </article>
)

const SectionCard = ({ title, children, className = '' }) => (
  <section className={`rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/50 ${className}`}>
    <h3 className="text-base font-black text-slate-900">{title}</h3>
    {children}
  </section>
)

const Reports = () => {
  const today = useMemo(() => new Date(), [])
  const monthStart = useMemo(() => new Date(today.getFullYear(), today.getMonth(), 1), [today])

  const [period, setPeriod] = useState('month')
  const [customStart, setCustomStart] = useState(toDateInput(monthStart))
  const [customEnd, setCustomEnd] = useState(toDateInput(today))
  const [employeeId, setEmployeeId] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [productId, setProductId] = useState('')
  const [trendMetric, setTrendMetric] = useState('revenue')
  const [report, setReport] = useState({
    summary: {},
    byDate: [],
    byProduct: [],
    byCategory: [],
    topOrders: [],
    sessions: [],
  })
  const [employees, setEmployees] = useState([])
  const [sessions, setSessions] = useState([])
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState('')
  const [error, setError] = useState('')

  const queryParams = useMemo(() => {
    const params = {
      period,
      employee_id: employeeId,
      session_id: sessionId,
      product_id: productId,
    }

    if (period === 'custom') {
      params.startDate = `${customStart} 00:00:00`
      params.endDate = `${customEnd} 23:59:59`
    }

    return params
  }, [customEnd, customStart, employeeId, period, productId, sessionId])

  const loadReport = async (showLoader = true) => {
    try {
      if (showLoader) setIsLoading(true)
      setError('')
      const response = await getAdminSalesReport(queryParams)
      setReport({
        summary: response.data.report?.summary || {},
        byDate: response.data.report?.byDate || [],
        byProduct: response.data.report?.byProduct || [],
        byCategory: response.data.report?.byCategory || [],
        topOrders: response.data.report?.topOrders || [],
        sessions: response.data.report?.sessions || [],
      })
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load report.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [employeeResponse, sessionResponse, productResponse] = await Promise.all([
          getAdminEmployees(),
          getAdminPosSessions(),
          getAdminProducts(),
        ])

        setEmployees(employeeResponse.data.employees || [])
        setSessions(sessionResponse.data.sessions || [])
        setProducts(productResponse.data.products || [])
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load report filters.')
      }
    }

    loadOptions()
  }, [])

  useEffect(() => {
    const loadFilteredReport = async () => {
      try {
        setIsLoading(true)
        setError('')
        const response = await getAdminSalesReport(queryParams)
        setReport({
          summary: response.data.report?.summary || {},
          byDate: response.data.report?.byDate || [],
          byProduct: response.data.report?.byProduct || [],
          byCategory: response.data.report?.byCategory || [],
          topOrders: response.data.report?.topOrders || [],
          sessions: response.data.report?.sessions || [],
        })
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load report.')
      } finally {
        setIsLoading(false)
      }
    }

    loadFilteredReport()
  }, [queryParams])

  const summary = report.summary || {}
  const totalOrders = toInt(summary.total_orders)
  const revenue = toNumber(summary.total_sales)
  const averageOrderValue = totalOrders ? revenue / totalOrders : 0

  const salesTrend = useMemo(
    () =>
      report.byDate
        .map((item) => ({
          date: item.order_date,
          label: formatDate(item.order_date),
          revenue: toNumber(item.daily_sales),
          orders: toInt(item.order_count),
        }))
        .sort((a, b) => new Date(a.date) - new Date(b.date)),
    [report.byDate],
  )

  const productRows = useMemo(
    () =>
      report.byProduct.map((item) => ({
        id: item.product_id,
        name: item.product_name || '-',
        category: item.category_name || '-',
        quantity: toInt(item.total_quantity),
        revenue: toNumber(item.total_revenue),
      })),
    [report.byProduct],
  )

  const categoryRows = useMemo(
    () =>
      report.byCategory.map((item) => ({
        id: item.category_id,
        category: item.category_name || '-',
        quantity: toInt(item.total_quantity),
        revenue: toNumber(item.total_revenue),
      })),
    [report.byCategory],
  )

  const topOrders = useMemo(
    () =>
      report.topOrders.map((order) => ({
        id: order.order_id,
        orderNo: order.order_number || `ORD-${order.order_id}`,
        table: order.table_number ? `T${order.table_number}` : '-',
        customer: order.customer_name || 'Walk-in',
        employee: order.employee_name || '-',
        amount: toNumber(order.total_amount),
        status: order.status || '-',
        createdAt: order.created_at,
      })),
    [report.topOrders],
  )

  const bestCategory = categoryRows[0]?.category || '-'
  const bestProduct = productRows[0]?.name || '-'
  const totalQuantity = productRows.reduce((sum, item) => sum + item.quantity, 0)

  const exportReport = async (format) => {
    try {
      setIsExporting(format)
      setError('')
      const response = await exportAdminReport(format, queryParams)
      downloadBlob(
        response.data,
        format === 'pdf' ? 'Odoo_Cafe_POS_Sales_Report.pdf' : 'Odoo_Cafe_POS_Sales_Report.xlsx',
      )
    } catch (err) {
      setError(err.response?.data?.message || `Unable to export ${format.toUpperCase()} report.`)
    } finally {
      setIsExporting('')
    }
  }

  return (
    <div className="min-h-screen space-y-4">
      {error ? (
        <div className="rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
        <SummaryCard
          label="Total Orders"
          value={totalOrders}
          icon={ShoppingCart}
          iconClass="bg-[#fff3e8] text-[#9a5a2e] ring-[#fcd8b8]"
        />
        <SummaryCard
          label="Revenue"
          value={formatCurrency(revenue)}
          icon={IndianRupee}
          iconClass="bg-emerald-50 text-emerald-600 ring-emerald-100"
        />
        <SummaryCard
          label="Average Order Value"
          value={formatCurrency(averageOrderValue)}
          icon={TrendingUp}
          iconClass="bg-violet-50 text-violet-600 ring-violet-100"
        />
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/50">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-base font-black text-slate-900">Report Filters</h3>
            <p className="mt-1 text-xs font-bold text-slate-500">
              Stats, charts, tables, and exports use these backend filters.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => loadReport()} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-black text-slate-600 hover:bg-slate-50">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button type="button" onClick={() => exportReport('pdf')} disabled={isExporting === 'pdf'} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#c8793f] px-3 text-xs font-black text-white hover:bg-[#9a5a2e] disabled:cursor-wait disabled:opacity-60">
              <Download className="h-4 w-4" />
              {isExporting === 'pdf' ? 'Exporting...' : 'PDF'}
            </button>
            <button type="button" onClick={() => exportReport('excel')} disabled={isExporting === 'excel'} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-black text-slate-600 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60">
              <FileSpreadsheet className="h-4 w-4" />
              {isExporting === 'excel' ? 'Exporting...' : 'XLS'}
            </button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <select value={period} onChange={(event) => setPeriod(event.target.value)} className={inputClass}>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="custom">Custom Range</option>
          </select>
          <input type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} disabled={period !== 'custom'} className={inputClass} />
          <input type="date" value={customEnd} min={customStart} onChange={(event) => setCustomEnd(event.target.value)} disabled={period !== 'custom'} className={inputClass} />
          <select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} className={inputClass}>
            <option value="">All Employees</option>
            {employees.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
          <select value={sessionId} onChange={(event) => setSessionId(event.target.value)} className={inputClass}>
            <option value="">All Sessions</option>
            {sessions.map((item) => (
              <option key={item.id} value={item.id}>SESSION-{item.id}</option>
            ))}
          </select>
          <select value={productId} onChange={(event) => setProductId(event.target.value)} className={inputClass}>
            <option value="">All Products</option>
            {products.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </div>

        <div className="mt-3 inline-flex rounded-lg border border-slate-200 p-1">
          {[
            ['revenue', 'Revenue'],
            ['orders', 'Orders'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTrendMetric(key)}
              className={`h-9 rounded-md px-3 text-xs font-black ${
                trendMetric === key ? 'bg-[#c8793f] text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {isLoading ? (
        <div className="rounded-lg border border-[#fcd8b8] bg-[#fff3e8] px-4 py-3 text-sm font-bold text-[#9a5a2e]">
          Loading report...
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
        {[
          ['Best Category', bestCategory],
          ['Best Product', bestProduct],
          ['Items Sold', totalQuantity],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/50">
            <p className="text-xs font-black uppercase text-slate-500">{label}</p>
            <p className="mt-1 text-base font-black text-slate-950">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid items-stretch gap-4 xl:grid-cols-[1.25fr_0.95fr]">
        <SectionCard title="Sales Trend Chart">
          <div className="mt-3 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesTrend} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#E2E8F0" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12, fontWeight: 700 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12, fontWeight: 700 }} />
                <Tooltip formatter={(value) => trendMetric === 'revenue' ? formatCurrency(value) : value} />
                <Line type="monotone" dataKey={trendMetric} stroke="#c8793f" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Top Categories Chart">
          <div className="mt-3 grid gap-3 lg:grid-cols-[0.95fr_1fr] xl:grid-cols-1 2xl:grid-cols-[0.95fr_1fr]">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryRows} dataKey="revenue" nameKey="category" innerRadius={44} outerRadius={82} paddingAngle={3}>
                    {categoryRows.map((entry, index) => (
                      <Cell key={entry.category} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid content-start gap-2">
              {categoryRows.slice(0, 6).map((item, index) => (
                <div key={item.category} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: chartColors[index % chartColors.length] }} />
                    <span className="text-xs font-black text-slate-700">{item.category}</span>
                  </div>
                  <span className="text-xs font-black text-slate-900">{formatCurrency(item.revenue)}</span>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard title="Top Products Table">
          <div className="mt-3 overflow-x-auto no-scrollbar">
            <table className="min-w-[560px] w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-black uppercase text-slate-500">
                  <th className="py-3 pr-4">Product Name</th>
                  <th className="py-3 pr-4">Category</th>
                  <th className="py-3 pr-4">Qty</th>
                  <th className="py-3">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {productRows.slice(0, 8).map((item) => (
                  <tr key={item.id} className="text-sm">
                    <td className="py-3 pr-4 font-black text-slate-900">{item.name}</td>
                    <td className="py-3 pr-4 font-bold text-slate-500">{item.category}</td>
                    <td className="py-3 pr-4 font-bold text-slate-600">{item.quantity}</td>
                    <td className="py-3 font-black text-slate-900">{formatCurrency(item.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="Top Categories Table">
          <div className="mt-3 grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryRows} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#E2E8F0" strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="category" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12, fontWeight: 700 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12, fontWeight: 700 }} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Bar dataKey="revenue" fill="#c8793f" radius={[8, 8, 2, 2]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="overflow-x-auto no-scrollbar">
              <table className="min-w-[420px] w-full text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-black uppercase text-slate-500">
                    <th className="py-3 pr-4">Category</th>
                    <th className="py-3 pr-4">Qty</th>
                    <th className="py-3">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {categoryRows.map((item) => (
                    <tr key={item.id} className="text-sm">
                      <td className="py-3 pr-4 font-black text-slate-900">{item.category}</td>
                      <td className="py-3 pr-4 font-bold text-slate-600">{item.quantity}</td>
                      <td className="py-3 font-black text-slate-900">{formatCurrency(item.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Top Orders Table">
        <div className="mt-3 overflow-x-auto no-scrollbar">
          <table className="min-w-[860px] w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-black uppercase text-slate-500">
                <th className="py-3 pr-4">Order No</th>
                <th className="py-3 pr-4">Table</th>
                <th className="py-3 pr-4">Customer</th>
                <th className="py-3 pr-4">Employee</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Time</th>
                <th className="py-3">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topOrders.map((order) => (
                <tr key={order.id} className="text-sm">
                  <td className="py-3 pr-4 font-black text-slate-900">{order.orderNo}</td>
                  <td className="py-3 pr-4 font-bold text-slate-600">{order.table}</td>
                  <td className="py-3 pr-4 font-bold text-slate-600">{order.customer}</td>
                  <td className="py-3 pr-4 font-bold text-slate-600">{order.employee}</td>
                  <td className="py-3 pr-4 font-bold text-slate-600">{order.status}</td>
                  <td className="py-3 pr-4 font-bold text-slate-500">{formatDateTime(order.createdAt)}</td>
                  <td className="py-3 font-black text-slate-900">{formatCurrency(order.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  )
}

export default Reports
