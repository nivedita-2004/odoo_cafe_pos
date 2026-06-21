import { ArrowLeft, Loader2, ShieldAlert } from 'lucide-react'
import { Link } from 'react-router-dom'

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

const Unauthorized = () => {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FFF8F0] px-5 py-10 text-[#2D1B0E]">
      <section className="w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow-2xl shadow-[#8B4513]/10 ring-1 ring-[#F5E6D3]">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EF4444]/10 text-[#EF4444]">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <p className="mt-6 text-sm font-bold uppercase tracking-[0.18em] text-[#8B4513]/65">
          Unauthorized
        </p>
        <h1 className="mt-2 text-3xl font-black">
          You do not have permission to access this module.
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#2D1B0E]/65">
          Your session is valid, but this page needs a different Cafe POS role.
        </p>
        <Link to="/login" className="mt-7 block">
          <Button variant="ghost">
            <ArrowLeft className="h-4 w-4" />
            Back to Login
          </Button>
        </Link>
      </section>
    </main>
  )
}

export default Unauthorized
