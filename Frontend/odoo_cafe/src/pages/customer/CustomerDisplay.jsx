import { Coffee, Loader2, LogOut, MonitorSmartphone, ShoppingBag } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'

const Button = ({
  children,
  className = '',
  isLoading = false,
  variant = 'primary',
  type = 'button',
  ...props
}) => {
  const variants = {
    primary:
      'bg-[#8B4513] text-white shadow-md shadow-[#8B4513]/20 hover:bg-[#73380f] focus:ring-[#FFB347]',
    ghost:
      'bg-white text-[#8B4513] ring-1 ring-[#E7D8C9] hover:bg-[#FFF8F0] focus:ring-[#FFB347]',
    danger:
      'bg-[#EF4444] text-white shadow-red-500/20 hover:bg-red-600 focus:ring-red-300',
  }

  return (
    <button
      type={type}
      disabled={isLoading || props.disabled}
      className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black transition duration-200 focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-70 ${variants[variant]} ${className}`}
      {...props}
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  )
}

const categories = [
  { id: 'all', name: 'All', icon: Coffee },
  { id: 'coffee', name: 'Coffee', icon: Coffee },
  { id: 'snacks', name: 'Snacks', icon: ShoppingBag },
  { id: 'orders', name: 'Orders', icon: MonitorSmartphone },
]

const products = [
  {
    id: 1,
    name: 'Self Ordering',
    category: 'orders',
    description: 'Allow customers to browse menu items and place orders from the display.',
    icon: ShoppingBag,
  },
  {
    id: 2,
    name: 'Live Order Display',
    category: 'orders',
    description: 'Show live order status and customer-facing order progress updates.',
    icon: MonitorSmartphone,
  },
  {
    id: 3,
    name: 'Coffee Counter',
    category: 'coffee',
    description: 'Customer display module for cafe counter and quick order preview.',
    icon: Coffee,
  },
  {
    id: 4,
    name: 'Quick Snacks',
    category: 'snacks',
    description: 'Show selected snacks and quick menu options for customers.',
    icon: ShoppingBag,
  },
]

const CustomerDisplay = () => {
  const { logout, user } = useAuth()
  const navigate = useNavigate()
  const [activeCategory, setActiveCategory] = useState('all')

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const filteredProducts = useMemo(() => {
    if (activeCategory === 'all') return products.slice(0, 4)
    return products.filter((product) => product.category === activeCategory)
  }, [activeCategory])

  return (
    <main className="min-h-screen bg-[#FFF8F0] px-3 py-4 text-[#2D1B0E] sm:px-5 md:py-6">
      <section className="mx-auto max-w-6xl">
        <div className="relative overflow-hidden rounded-[30px] bg-[#8B4513] p-5 text-white shadow-[0_18px_55px_rgba(45,27,14,0.18)] md:p-7">
          <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-white/10" />
          <div className="absolute bottom-5 right-20 h-12 w-12 rounded-full bg-white/10" />

          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/70">
                Customer Display
              </p>

              <h1 className="mt-2 text-3xl font-black leading-tight md:text-4xl">
                Hello, {user.fullName}
              </h1>

              <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-white/75">
                Browse customer modules, self-ordering options and live order display features from one clean screen.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:items-end">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white/15">
                <MonitorSmartphone className="h-8 w-8" />
              </div>

              <Button variant="ghost" className="bg-white text-[#8B4513] sm:w-auto" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-[26px] bg-white p-4 shadow-sm ring-1 ring-[#F5E6D3] sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#8B4513]/60">
                Explore
              </p>
              <h2 className="text-xl font-black text-[#2D1B0E]">Categories</h2>
            </div>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2">
            {categories.map((category) => {
              const Icon = category.icon
              const isActive = activeCategory === category.id

              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setActiveCategory(category.id)}
                  className={`min-w-[92px] rounded-2xl p-3 text-center transition ${
                    isActive
                      ? 'bg-[#8B4513] text-white shadow-md shadow-[#8B4513]/20'
                      : 'bg-[#FFF8F0] text-[#8B4513] ring-1 ring-[#E7D8C9] hover:bg-[#F5E6D3]'
                  }`}
                >
                  <span
                    className={`mx-auto flex h-11 w-11 items-center justify-center rounded-2xl ${
                      isActive ? 'bg-white/15' : 'bg-white'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>

                  <p className="mt-2 text-xs font-black">{category.name}</p>
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#8B4513]/60">
                Modules
              </p>
              <h2 className="text-xl font-black text-[#2D1B0E]">
                {activeCategory === 'all'
                  ? 'Recommended Products'
                  : `${categories.find((item) => item.id === activeCategory)?.name} Products`}
              </h2>
            </div>

            <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#8B4513] ring-1 ring-[#E7D8C9]">
              {filteredProducts.length} Items
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((product) => {
              const Icon = product.icon

              return (
                <div
                  key={product.id}
                  className="group relative overflow-hidden rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-[#F5E6D3] transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(45,27,14,0.08)]"
                >
                  <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[#8B4513]/5 transition group-hover:scale-110" />

                  <div className="relative">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF8F0] text-[#8B4513] ring-1 ring-[#E7D8C9]">
                      <Icon className="h-6 w-6" />
                    </div>

                    <h3 className="text-lg font-black text-[#2D1B0E]">{product.name}</h3>

                    <p className="mt-2 text-sm font-semibold leading-6 text-[#2D1B0E]/60">
                      {product.description}
                    </p>

                    <div className="mt-5 inline-flex rounded-full bg-[#FFF8F0] px-3 py-1 text-xs font-black text-[#8B4513] ring-1 ring-[#E7D8C9]">
                      Coming Soon
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {!filteredProducts.length ? (
            <div className="rounded-2xl border border-dashed border-[#E7D8C9] bg-white p-8 text-center">
              <Coffee className="mx-auto h-9 w-9 text-[#8B4513]" />
              <h3 className="mt-3 text-lg font-black">No products found</h3>
              <p className="mt-1 text-sm font-semibold text-[#2D1B0E]/55">
                Products for this category will appear here.
              </p>
            </div>
          ) : null}
        </div>

        <div className="mt-5 overflow-hidden rounded-[24px] bg-[#F5E6D3] p-5 text-[#8B4513]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/60">
              <Coffee className="h-5 w-5" />
            </div>

            <div>
              <h3 className="text-base font-black">Display Access</h3>
              <p className="mt-1 text-sm font-semibold leading-6">
                Customer display is available to customer and admin roles.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

export default CustomerDisplay