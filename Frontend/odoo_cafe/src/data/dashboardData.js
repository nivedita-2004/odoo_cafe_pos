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

export const summaryStats = [
  {
    label: 'Total Orders',
    value: 128,
    icon: ShoppingCart,
    iconClass: 'bg-[#fff3e8] text-[#9a5a2e] ring-[#fcd8b8]',
  },
  {
    label: 'Total Revenue',
    value: 45600,
    type: 'currency',
    icon: IndianRupee,
    iconClass: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
  },
  {
    label: 'Average Order Value',
    value: 356,
    type: 'currency',
    icon: TrendingUp,
    iconClass: 'bg-violet-50 text-violet-600 ring-violet-100',
  },
  {
    label: "Today's Orders",
    value: 24,
    icon: Clock3,
    iconClass: 'bg-amber-50 text-amber-600 ring-amber-100',
  },
  {
    label: 'Pending Kitchen Orders',
    value: 6,
    icon: ChefHat,
    iconClass: 'bg-rose-50 text-rose-600 ring-rose-100',
  },
  {
    label: 'Active Tables',
    value: 8,
    icon: Armchair,
    iconClass: 'bg-cyan-50 text-cyan-600 ring-cyan-100',
  },
  {
    label: 'Total Products',
    value: 42,
    icon: Package,
    iconClass: 'bg-orange-50 text-orange-600 ring-orange-100',
  },
  {
    label: 'Active Employees',
    value: 5,
    icon: Users,
    iconClass: 'bg-indigo-50 text-indigo-600 ring-indigo-100',
  },
]

export const salesTrend = [
  { day: 'Monday', amount: 5000 },
  { day: 'Tuesday', amount: 7000 },
  { day: 'Wednesday', amount: 6500 },
  { day: 'Thursday', amount: 9000 },
  { day: 'Friday', amount: 12000 },
  { day: 'Saturday', amount: 15000 },
  { day: 'Sunday', amount: 11000 },
]

export const paymentSummary = [
  { label: 'Cash', amount: 12000, icon: Banknote },
  { label: 'UPI', amount: 22000, icon: Wallet },
  { label: 'Card', amount: 11600, icon: CreditCard },
]

export const topProducts = [
  { name: 'Cold Coffee', category: 'Coffee', quantity: 45, revenue: 5400 },
  { name: 'Veg Pizza', category: 'Pizza', quantity: 32, revenue: 8000 },
  { name: 'Cheese Burger', category: 'Burger', quantity: 28, revenue: 6160 },
  { name: 'Brownie', category: 'Dessert', quantity: 20, revenue: 3200 },
]

export const topCategories = [
  { category: 'Coffee', revenue: 12000, color: 'bg-[#c8793f]' },
  { category: 'Pizza', revenue: 18000, color: 'bg-emerald-500' },
  { category: 'Burger', revenue: 9500, color: 'bg-amber-500' },
  { category: 'Dessert', revenue: 6000, color: 'bg-rose-500' },
  { category: 'Drinks', revenue: 4100, color: 'bg-violet-500' },
]

export const recentOrders = [
  {
    orderNo: 'ORD-001',
    table: 'T1',
    customer: 'Rahul Verma',
    employee: 'Amit Sharma',
    amount: 450,
    paymentMethod: 'UPI',
    status: 'Paid',
    time: '10:30 AM',
  },
  {
    orderNo: 'ORD-002',
    table: 'T3',
    customer: 'Priya Sharma',
    employee: 'Amit Sharma',
    amount: 780,
    paymentMethod: 'Cash',
    status: 'Paid',
    time: '10:45 AM',
  },
  {
    orderNo: 'ORD-003',
    table: 'T2',
    customer: 'Walk-in',
    employee: 'Riya',
    amount: 320,
    paymentMethod: 'Card',
    status: 'Preparing',
    time: '11:00 AM',
  },
  {
    orderNo: 'ORD-004',
    table: 'T4',
    customer: 'Aman Gupta',
    employee: 'Amit Sharma',
    amount: 610,
    paymentMethod: 'UPI',
    status: 'Paid',
    time: '11:20 AM',
  },
]

export const kitchenStatus = [
  { label: 'To Cook', value: 4 },
  { label: 'Preparing', value: 3 },
  { label: 'Completed', value: 12 },
]

export const tableOccupancy = {
  totalTables: 15,
  activeTables: 8,
  availableTables: 7,
}
