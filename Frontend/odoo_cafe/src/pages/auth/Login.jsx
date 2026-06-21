import {
  ChefHat,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
} from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import {
  requestPasswordReset,
  resetPassword,
  verifyPasswordOtp,
} from '../../api/authApi'
import { useAuth } from '../../context/AuthContext.jsx'
import { ROLE_HOME } from '../../utils/dummyUsers'

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

const Login = () => {
  const { isAuthenticated, login, role } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '', remember: true })
  const [resetForm, setResetForm] = useState({
    email: '',
    otp: '',
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState({})
  const [resetErrors, setResetErrors] = useState({})
  const [message, setMessage] = useState(location.state?.message || '')
  const [resetMessage, setResetMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [resetStep, setResetStep] = useState('login')

  if (isAuthenticated) {
    return <Navigate to={ROLE_HOME[role] || '/login'} replace />
  }

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: '' }))
    setMessage('')
  }

  const updateResetField = (field, value) => {
    setResetForm((current) => ({ ...current, [field]: value }))
    setResetErrors((current) => ({ ...current, [field]: '' }))
    setResetMessage('')
  }

  const validate = () => {
    const nextErrors = {}

    if (!form.email.trim()) {
      nextErrors.email = 'Email is required.'
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      nextErrors.email = 'Enter a valid email address.'
    }

    if (!form.password) {
      nextErrors.password = 'Password is required.'
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
      const result = await login(form)
      navigate(result.redirectTo, { replace: true })
    } catch (error) {
      setMessage(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const openForgotPassword = () => {
    setResetStep('email')
    setResetMessage('')
    setResetErrors({})
    setResetForm((current) => ({ ...current, email: form.email.trim() }))
  }

  const backToLogin = () => {
    setResetStep('login')
    setResetMessage('')
    setResetErrors({})
  }

  const handleForgotPassword = async (event) => {
    event.preventDefault()
    const email = resetForm.email.trim()

    if (!email) {
      setResetErrors({ email: 'Email is required.' })
      return
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setResetErrors({ email: 'Enter a valid email address.' })
      return
    }

    setResetLoading(true)
    setResetMessage('')

    try {
      const response = await requestPasswordReset(email.toLowerCase())
      setResetMessage(response.data?.message || 'OTP sent successfully.')
      setResetStep('otp')
    } catch (error) {
      setResetMessage(error.response?.data?.message || 'Unable to send OTP. Please try again.')
    } finally {
      setResetLoading(false)
    }
  }

  const handleVerifyOtp = async (event) => {
    event.preventDefault()
    const email = resetForm.email.trim().toLowerCase()
    const otp = resetForm.otp.trim()

    if (!otp || otp.length !== 6) {
      setResetErrors({ otp: 'Enter the 6 digit OTP.' })
      return
    }

    setResetLoading(true)
    setResetMessage('')

    try {
      const response = await verifyPasswordOtp({ email, otp })
      setResetMessage(response.data?.message || 'OTP verified successfully.')
      setResetStep('reset')
    } catch (error) {
      setResetMessage(error.response?.data?.message || 'Invalid or expired OTP.')
    } finally {
      setResetLoading(false)
    }
  }

  const handleResetPassword = async (event) => {
    event.preventDefault()
    const email = resetForm.email.trim().toLowerCase()
    const password = resetForm.password
    const confirmPassword = resetForm.confirmPassword
    const nextErrors = {}

    if (!password || password.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters.'
    }

    if (confirmPassword !== password) {
      nextErrors.confirmPassword = 'Passwords do not match.'
    }

    if (Object.keys(nextErrors).length) {
      setResetErrors(nextErrors)
      return
    }

    setResetLoading(true)
    setResetMessage('')

    try {
      const response = await resetPassword({ email, password })
      setMessage(response.data?.message || 'Password reset successfully. Login now.')
      setForm((current) => ({ ...current, email }))
      setResetStep('login')
      setResetForm({ email: '', otp: '', password: '', confirmPassword: '' })
    } catch (error) {
      setResetMessage(error.response?.data?.message || 'Unable to reset password. Please try again.')
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(252,216,184,0.78),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(200,121,63,0.18),transparent_34%),linear-gradient(135deg,#fff7ed_0%,#f8fafc_46%,#fff3e8_100%)] text-slate-900">
      <div className="flex min-h-screen items-center justify-center px-4 py-6 sm:px-6">
        <section className="flex w-full items-center justify-center">
          <div className="w-full max-w-[500px] rounded-lg border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-200/70 sm:p-5 lg:p-6">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.16em] text-[#9a5a2e]/75">
                  Welcome back
                </p>
                <h2 className="mt-1 text-3xl font-black text-slate-950">
                  Login
                </h2>
              </div>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#fff3e8] text-[#9a5a2e] ring-1 ring-[#fcd8b8]">
                <ChefHat className="h-6 w-6" />
              </span>
            </div>

            {resetStep === 'login' && message ? (
              <div className="mb-3 rounded-2xl border border-[#EF4444]/20 bg-[#EF4444]/10 px-4 py-2 text-left text-xs font-semibold text-[#EF4444]">
                {message}
              </div>
            ) : null}

            {resetStep === 'login' ? (
            <form className="space-y-3" onSubmit={handleSubmit}>
              <Input
                id="email"
                label="Email address"
                type="email"
                placeholder="admin@cafe.com"
                value={form.email}
                onChange={(event) => updateField('email', event.target.value)}
                error={errors.email}
                className="min-h-11 py-2.5"
                leftIcon={<Mail className="h-4 w-4" />}
              />

              <PasswordInput
                id="password"
                label="Password"
                placeholder="Enter password"
                value={form.password}
                onChange={(event) => updateField('password', event.target.value)}
                error={errors.password}
                className="min-h-11 py-2.5"
              />

              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-3 text-xs font-semibold text-slate-600">
                  <input
                    type="checkbox"
                    checked={form.remember}
                    onChange={(event) => updateField('remember', event.target.checked)}
                    className="h-4 w-4 rounded border-slate-200 accent-[#c8793f]"
                  />
                  Remember this device
                </label>
                <button
                  type="button"
                  onClick={openForgotPassword}
                  className="text-xs font-black text-[#9a5a2e] hover:underline"
                >
                  Forgot password?
                </button>
              </div>

              <Button type="submit" isLoading={isLoading}>
                {isLoading ? 'Checking access...' : 'Login'}
              </Button>
            </form>
            ) : null}

            {resetStep === 'email' ? (
              <form className="space-y-3" onSubmit={handleForgotPassword}>
                <div className="rounded-lg bg-[#fff3e8] px-3 py-2 text-xs font-bold text-[#9a5a2e] ring-1 ring-[#fcd8b8]">
                  Enter your account email. We will send a reset OTP.
                </div>
                {resetMessage ? (
                  <div className="rounded-lg border border-[#EF4444]/20 bg-[#EF4444]/10 px-4 py-2 text-left text-xs font-semibold text-[#EF4444]">
                    {resetMessage}
                  </div>
                ) : null}
                <Input
                  id="resetEmail"
                  label="Email address"
                  type="email"
                  placeholder="admin@cafe.com"
                  value={resetForm.email}
                  onChange={(event) => updateResetField('email', event.target.value)}
                  error={resetErrors.email}
                  leftIcon={<Mail className="h-4 w-4" />}
                />
                <Button type="submit" isLoading={resetLoading}>
                  {resetLoading ? 'Sending OTP...' : 'Send OTP'}
                </Button>
                <Button type="button" variant="ghost" onClick={backToLogin}>
                  Back to Login
                </Button>
              </form>
            ) : null}

            {resetStep === 'otp' ? (
              <form className="space-y-3" onSubmit={handleVerifyOtp}>
                <div className="rounded-lg bg-[#fff3e8] px-3 py-2 text-xs font-bold text-[#9a5a2e] ring-1 ring-[#fcd8b8]">
                  OTP sent to {resetForm.email}
                </div>
                {resetMessage ? (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-left text-xs font-semibold text-emerald-700">
                    {resetMessage}
                  </div>
                ) : null}
                <Input
                  id="resetOtp"
                  label="OTP"
                  placeholder="Enter 6 digit OTP"
                  value={resetForm.otp}
                  onChange={(event) => updateResetField('otp', event.target.value)}
                  error={resetErrors.otp}
                />
                <Button type="submit" isLoading={resetLoading}>
                  {resetLoading ? 'Verifying OTP...' : 'Verify OTP'}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setResetStep('email')}>
                  Change Email
                </Button>
              </form>
            ) : null}

            {resetStep === 'reset' ? (
              <form className="space-y-3" onSubmit={handleResetPassword}>
                {resetMessage ? (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-left text-xs font-semibold text-emerald-700">
                    {resetMessage}
                  </div>
                ) : null}
                <PasswordInput
                  id="newPassword"
                  label="New Password"
                  placeholder="Create new password"
                  value={resetForm.password}
                  onChange={(event) => updateResetField('password', event.target.value)}
                  error={resetErrors.password}
                />
                <PasswordInput
                  id="confirmNewPassword"
                  label="Confirm Password"
                  placeholder="Repeat new password"
                  value={resetForm.confirmPassword}
                  onChange={(event) => updateResetField('confirmPassword', event.target.value)}
                  error={resetErrors.confirmPassword}
                />
                <Button type="submit" isLoading={resetLoading}>
                  {resetLoading ? 'Resetting password...' : 'Reset Password'}
                </Button>
                <Button type="button" variant="ghost" onClick={backToLogin}>
                  Back to Login
                </Button>
              </form>
            ) : null}

            {resetStep === 'login' ? (
            <p className="mt-4 text-center text-xs font-medium text-slate-600">
              New cafe account?{' '}
              <Link to="/signup" className="font-bold text-[#9a5a2e] hover:underline">
                Create account
              </Link>
            </p>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  )
}

export default Login
