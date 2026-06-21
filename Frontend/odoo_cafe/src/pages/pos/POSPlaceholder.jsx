import { ChefHat, CreditCard, Loader2, LogOut, ReceiptText, Utensils } from 'lucide-react'
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
      'bg-[#8B4513] text-white shadow-lg shadow-[#8B4513]/20 hover:bg-[#73380f] focus:ring-[#FFB347]',
    ghost:
      'bg-white text-[#8B4513] ring-1 ring-[#F5E6D3] hover:bg-[#FFF8F0] focus:ring-[#FFB347]',
    danger:
      'bg-[#EF4444] text-white shadow-lg shadow-red-500/20 hover:bg-red-600 focus:ring-red-300',
  }

  return (
    <button
      type={type}
      disabled={isLoading || props.disabled}
      className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition duration-200 focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-70 ${variants[variant]} ${className}`}
      {...props}
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  )
}

const POSPlaceholder = () => {
  const { logout, user } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <main className="min-h-screen bg-[#FFF8F0] px-5 py-8 text-[#2D1B0E] sm:px-8">
      <section className="mx-auto max-w-6xl rounded-2xl bg-white p-6 shadow-xl shadow-[#8B4513]/10 ring-1 ring-[#F5E6D3] sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#8B4513]/65">
              Employee POS
            </p>
            <h1 className="mt-2 text-3xl font-black">Counter ready, {user.fullName}</h1>
          </div>
          <Button variant="ghost" className="sm:w-auto" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          {[
            { label: 'Select Table', icon: Utensils },
            { label: 'Take Order', icon: ReceiptText },
            { label: 'Kitchen Flow', icon: ChefHat },
            { label: 'Payment', icon: CreditCard },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl bg-[#FFF8F0] p-5 ring-1 ring-[#F5E6D3]"
            >
              <item.icon className="mb-4 h-6 w-6 text-[#8B4513]" />
              <h2 className="text-lg font-black">{item.label}</h2>
              <p className="mt-2 text-sm leading-6 text-[#2D1B0E]/65">
                POS workflow placeholder for the next module.
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}

export default POSPlaceholder
