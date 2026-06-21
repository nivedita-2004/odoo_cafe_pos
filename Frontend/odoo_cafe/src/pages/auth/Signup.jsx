import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  User,
} from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { ROLE_HOME } from '../../utils/dummyUsers'

const initialForm = {
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
  terms: false,
}

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
      'bg-[#c8793f] text-white shadow-lg shadow-[#c8793f]/20 hover:bg-[#9a5a2e] focus:ring-[#fcd8b8]',
    ghost:
      'bg-white text-[#9a5a2e] ring-1 ring-[#fcd8b8] hover:bg-[#fff3e8] focus:ring-[#fcd8b8]',
    danger:
      'bg-[#EF4444] text-white shadow-lg shadow-red-500/20 hover:bg-red-600 focus:ring-red-300',
  }

  return (
    <button
      type={type}
      disabled={isLoading || props.disabled}
      className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-black transition duration-200 focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-70 ${variants[variant]} ${className}`}
      {...props}
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  )
}

const Input = ({
  id,
  label,
  error,
  className = '',
  leftIcon,
  rightElement,
  ...props
}) => (
  <div className="space-y-2 text-left">
    {label ? (
      <label htmlFor={id} className="text-sm font-black text-slate-800">
        {label}
      </label>
    ) : null}
    <div className="relative">
      {leftIcon ? (
        <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9a5a2e]/70">
          {leftIcon}
        </div>
      ) : null}
      <input
        id={id}
        className={`min-h-11 w-full rounded-lg border bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#c8793f] focus:ring-4 focus:ring-[#fcd8b8]/45 ${
          leftIcon ? 'pl-11' : ''
        } ${rightElement ? 'pr-12' : ''} ${
          error ? 'border-[#EF4444]' : 'border-slate-200'
        } ${className}`}
        {...props}
      />
      {rightElement ? (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {rightElement}
        </div>
      ) : null}
    </div>
    {error ? <p className="text-xs font-medium text-[#EF4444]">{error}</p> : null}
  </div>
)

const PasswordInput = ({ id, label, error, ...props }) => {
  const [visible, setVisible] = useState(false)

  return (
    <Input
      id={id}
      label={label}
      error={error}
      type={visible ? 'text' : 'password'}
      leftIcon={<Lock className="h-4 w-4" />}
      rightElement={
        <button
          type="button"
          aria-label={visible ? 'Hide password' : 'Show password'}
          onClick={() => setVisible((current) => !current)}
          className="rounded-lg p-1.5 text-[#9a5a2e]/70 transition hover:bg-[#fff3e8] hover:text-[#9a5a2e] focus:outline-none focus:ring-2 focus:ring-[#fcd8b8]"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      }
      {...props}
    />
  )
}

const Signup = () => {
  const { isAuthenticated, role, signup } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  if (isAuthenticated) {
    return <Navigate to={ROLE_HOME[role] || '/login'} replace />
  }

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: '' }))
    setMessage('')
  }

  const validate = () => {
    const nextErrors = {}

    if (!form.fullName.trim()) {
      nextErrors.fullName = 'Full name is required.'
    }

    if (!form.email.trim()) {
      nextErrors.email = 'Email is required.'
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      nextErrors.email = 'Enter a valid email address.'
    }

    if (!form.password) {
      nextErrors.password = 'Password is required.'
    } else if (form.password.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters.'
    }

    if (!form.confirmPassword) {
      nextErrors.confirmPassword = 'Confirm your password.'
    } else if (form.confirmPassword !== form.password) {
      nextErrors.confirmPassword = 'Passwords do not match.'
    }

    if (!form.terms) {
      nextErrors.terms = 'Accept terms to create this admin account.'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!validate()) return

    setIsLoading(true)
    setMessage('')

    try {
      const user = await signup(form)
      navigate(ROLE_HOME[user.role] || '/admin/dashboard', { replace: true })
    } catch (error) {
      setMessage(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(252,216,184,0.78),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(200,121,63,0.18),transparent_34%),linear-gradient(135deg,#fff7ed_0%,#f8fafc_46%,#fff3e8_100%)] text-slate-900">
      <div className="flex min-h-screen items-center justify-center px-4 py-6 sm:px-6">
        <section className="flex w-full items-center justify-center">
          <div className="w-full max-w-[520px] rounded-lg border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-200/70 sm:p-5 lg:p-6">
            <div className="mb-4">
              <p className="text-sm font-black uppercase tracking-[0.16em] text-[#9a5a2e]/75">
                Admin onboarding
              </p>
              <h2 className="mt-1 text-3xl font-black text-slate-950">
                Create Account
              </h2>
            </div>

            {message ? (
              <div className="mb-3 rounded-2xl border border-[#EF4444]/20 bg-[#EF4444]/10 px-4 py-2 text-left text-xs font-semibold text-[#EF4444]">
                {message}
              </div>
            ) : null}

            <form className="space-y-3" onSubmit={handleSubmit}>
              <Input
                id="fullName"
                label="Full Name"
                placeholder="Priya Sharma"
                value={form.fullName}
                onChange={(event) => updateField('fullName', event.target.value)}
                error={errors.fullName}
                className="min-h-11 py-2.5"
                leftIcon={<User className="h-4 w-4" />}
              />

              <Input
                id="email"
                label="Email"
                type="email"
                placeholder="team@cafe.com"
                value={form.email}
                onChange={(event) => updateField('email', event.target.value)}
                error={errors.email}
                className="min-h-11 py-2.5"
                leftIcon={<Mail className="h-4 w-4" />}
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <PasswordInput
                  id="password"
                  label="Password"
                  placeholder="Create password"
                  value={form.password}
                  onChange={(event) => updateField('password', event.target.value)}
                  error={errors.password}
                  className="min-h-11 py-2.5"
                />
                <PasswordInput
                  id="confirmPassword"
                  label="Confirm Password"
                  placeholder="Repeat password"
                  value={form.confirmPassword}
                  onChange={(event) =>
                    updateField('confirmPassword', event.target.value)
                  }
                  error={errors.confirmPassword}
                  className="min-h-11 py-2.5"
                />
              </div>

              <div>
                <label className="flex items-start gap-3 text-left text-xs font-semibold text-slate-600">
                  <input
                    type="checkbox"
                    checked={form.terms}
                    onChange={(event) => updateField('terms', event.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-200 accent-[#c8793f]"
                  />
                  <span>
                    I agree to create an admin account for Cafe POS.
                  </span>
                </label>
                {errors.terms ? (
                  <p className="mt-2 text-left text-xs font-medium text-[#EF4444]">
                    {errors.terms}
                  </p>
                ) : null}
              </div>

              <Button type="submit" isLoading={isLoading}>
                {isLoading ? 'Creating account...' : 'Create Account'}
              </Button>
            </form>

            <p className="mt-4 text-center text-xs font-medium text-slate-600">
              Already have access?{' '}
              <Link to="/login" className="font-bold text-[#9a5a2e] hover:underline">
                Back to Login
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}

export default Signup
