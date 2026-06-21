import {
  Archive,
  KeyRound,
  Mail,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  User,
  UserRound,
  Users as UsersIcon,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  archiveAdminEmployee,
  changeAdminEmployeePassword,
  createAdminEmployee,
  deleteAdminEmployee,
  getAdminEmployees,
  updateAdminEmployee,
} from '../../api/employeesApi'
import { useGlobalSearch } from '../../context/GlobalSearchContext.jsx'

const emptyUserForm = {
  name: '',
  email: '',
  password: '',
  role: 'Employee',
}

const emptyPasswordForm = {
  password: '',
  confirmPassword: '',
}

const inputClass =
  'h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#c8793f] focus:ring-2 focus:ring-[#fcd8b8]'

const statusStyles = {
  Active: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  Archived: 'bg-slate-100 text-slate-600 ring-slate-200',
}

const roleStyles = {
  Admin: 'bg-violet-50 text-violet-700 ring-violet-100',
  Employee: 'bg-amber-50 text-amber-700 ring-amber-100',
}

const usersPerPage = 8

const roleToUi = (role) => (role === 'ADMIN' ? 'Admin' : 'Employee')
const roleToApi = (role) => (role === 'Admin' ? 'ADMIN' : 'EMPLOYEE')

const normalizeUser = (user) => ({
  id: user.id,
  name: user.name || '-',
  email: user.email || '-',
  role: roleToUi(user.role),
  status: Number(user.is_active) === 1 ? 'Active' : 'Archived',
})

const SummaryCard = ({ label, value, icon: Icon, iconClass }) => (
  <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/50">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-slate-500">{label}</p>
        <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
      </div>
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${iconClass}`}>
        <Icon className="h-5 w-5" />
      </span>
    </div>
  </article>
)

const Field = ({ label, children }) => (
  <label className="block">
    <span className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</span>
    <div className="mt-2">{children}</div>
  </label>
)

const ModalShell = ({ title, children, onClose, size = 'max-w-2xl' }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
    <div className={`max-h-[92vh] w-full overflow-hidden rounded-xl bg-white shadow-2xl ${size}`}>
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
        <h2 className="text-lg font-black text-slate-950">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-3 py-2 text-sm font-black text-slate-500 hover:bg-slate-100 hover:text-slate-900"
        >
          Close
        </button>
      </div>
      <div className="max-h-[calc(92vh-64px)] overflow-auto p-5">{children}</div>
    </div>
  </div>
)

const Users = () => {
  const [users, setUsers] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [currentPage, setCurrentPage] = useState(1)
  const [modalMode, setModalMode] = useState(null)
  const [selectedUser, setSelectedUser] = useState(null)
  const [userForm, setUserForm] = useState(emptyUserForm)
  const [passwordForm, setPasswordForm] = useState(emptyPasswordForm)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [updatingRoleId, setUpdatingRoleId] = useState(null)
  const [error, setError] = useState('')
  const { searchQuery } = useGlobalSearch()

  const loadUsers = async () => {
    try {
      setIsLoading(true)
      setError('')
      const response = await getAdminEmployees()
      setUsers((response.data.employees || []).map(normalizeUser))
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load accounts.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const loadInitialUsers = async () => {
      try {
        setIsLoading(true)
        setError('')
        const response = await getAdminEmployees()
        setUsers((response.data.employees || []).map(normalizeUser))
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load accounts.')
      } finally {
        setIsLoading(false)
      }
    }

    loadInitialUsers()
  }, [])

  const summaryCards = useMemo(() => {
    const activeUsers = users.filter((user) => user.status === 'Active')
    const archivedUsers = users.filter((user) => user.status === 'Archived')
    const adminUsers = users.filter((user) => user.role === 'Admin')
    const employeeUsers = users.filter((user) => user.role === 'Employee')

    return [
      {
        label: 'Total Accounts',
        value: users.length,
        icon: UsersIcon,
        iconClass: 'bg-[#fff3e8] text-[#9a5a2e] ring-[#fcd8b8]',
      },
      {
        label: 'Active Accounts',
        value: activeUsers.length,
        icon: UserRound,
        iconClass: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
      },
      {
        label: 'Archived Accounts',
        value: archivedUsers.length,
        icon: Archive,
        iconClass: 'bg-slate-100 text-slate-600 ring-slate-200',
      },
      {
        label: 'Admin',
        value: adminUsers.length,
        icon: ShieldCheck,
        iconClass: 'bg-violet-50 text-violet-600 ring-violet-100',
      },
      {
        label: 'Employee',
        value: employeeUsers.length,
        icon: User,
        iconClass: 'bg-amber-50 text-amber-600 ring-amber-100',
      },
    ]
  }, [users])

  const filteredUsers = useMemo(() => {
    const search = (searchTerm || searchQuery).trim().toLowerCase()

    return users
      .filter((user) => `${user.name} ${user.email}`.toLowerCase().includes(search))
      .filter((user) => roleFilter === 'All' || user.role === roleFilter)
      .filter((user) => statusFilter === 'All' || user.status === statusFilter)
  }, [roleFilter, searchQuery, searchTerm, statusFilter, users])

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / usersPerPage))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const paginatedUsers = filteredUsers.slice(
    (safeCurrentPage - 1) * usersPerPage,
    safeCurrentPage * usersPerPage,
  )

  const goToPage = (page) => {
    setCurrentPage(Math.min(Math.max(page, 1), totalPages))
  }

  const closeModal = () => {
    setModalMode(null)
    setSelectedUser(null)
    setIsSaving(false)
  }

  const openAddModal = () => {
    setUserForm(emptyUserForm)
    setModalMode('add')
  }

  const openPasswordModal = (user) => {
    setSelectedUser(user)
    setPasswordForm(emptyPasswordForm)
    setModalMode('password')
  }

  const openDeleteModal = (user) => {
    setSelectedUser(user)
    setModalMode('delete')
  }

  const saveUser = async (event) => {
    event.preventDefault()
    const payload = {
      name: userForm.name.trim(),
      email: userForm.email.trim().toLowerCase(),
      password: userForm.password,
      role: roleToApi(userForm.role),
    }

    if (!payload.name || !payload.email || !payload.password) return

    try {
      setIsSaving(true)
      setError('')
      await createAdminEmployee(payload)
      await loadUsers()
      setCurrentPage(1)
      closeModal()
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to save account.')
      setIsSaving(false)
    }
  }

  const changePassword = async (event) => {
    event.preventDefault()
    if (!passwordForm.password || passwordForm.password !== passwordForm.confirmPassword) return

    try {
      setIsSaving(true)
      setError('')
      await changeAdminEmployeePassword(selectedUser.id, passwordForm.password)
      closeModal()
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to change password.')
      setIsSaving(false)
    }
  }

  const archiveUser = async (user) => {
    try {
      setError('')
      await archiveAdminEmployee(user.id, user.status === 'Archived' ? 1 : 0)
      await loadUsers()
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update account status.')
    }
  }

  const updateUserRole = async (user, nextRole) => {
    if (user.role === nextRole) return

    const previousUsers = users

    try {
      setUpdatingRoleId(user.id)
      setError('')
      setUsers((currentUsers) =>
        currentUsers.map((currentUser) =>
          currentUser.id === user.id ? { ...currentUser, role: nextRole } : currentUser,
        ),
      )
      await updateAdminEmployee(user.id, {
        name: user.name,
        email: user.email,
        role: roleToApi(nextRole),
        is_active: user.status === 'Active' ? 1 : 0,
      })
      await loadUsers()
    } catch (err) {
      setUsers(previousUsers)
      setError(err.response?.data?.message || 'Unable to update account role.')
    } finally {
      setUpdatingRoleId(null)
    }
  }

  const deleteUser = async () => {
    if (!selectedUser) return

    try {
      setIsSaving(true)
      setError('')
      await deleteAdminEmployee(selectedUser.id)
      await loadUsers()
      closeModal()
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to delete account.')
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen space-y-5">
      {error ? (
        <div className="rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map((card) => (
          <SummaryCard key={card.label} {...card} />
        ))}
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/50">
        <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-black text-slate-950">User & Employee Accounts</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Manage admin users, employee accounts, access status, and passwords.
            </p>
          </div>
          <div className="grid flex-1 gap-3 md:grid-cols-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value)
                  setCurrentPage(1)
                }}
                placeholder="Search name or email"
                className={`${inputClass} pl-10`}
              />
            </div>
            <select
              value={roleFilter}
              onChange={(event) => {
                setRoleFilter(event.target.value)
                setCurrentPage(1)
              }}
              className={inputClass}
            >
              <option value="All">All Roles</option>
              <option value="Admin">Admin</option>
              <option value="Employee">Employee</option>
            </select>
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value)
                setCurrentPage(1)
              }}
              className={inputClass}
            >
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Archived">Archived</option>
            </select>
          </div>
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#c8793f] px-4 text-sm font-black text-white shadow-sm shadow-[#fcd8b8] transition hover:bg-[#9a5a2e]"
          >
            <Plus className="h-4 w-4" />
            Add Account
          </button>
        </div>

        {isLoading ? (
          <div className="mt-5 rounded-lg border border-[#fcd8b8] bg-[#fff3e8] px-4 py-3 text-sm font-bold text-[#9a5a2e]">
            Loading accounts...
          </div>
        ) : null}

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {paginatedUsers.map((account) => (
            <article key={account.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/40 transition hover:-translate-y-0.5 hover:border-[#fcd8b8] hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#fff3e8] text-base font-black text-[#9a5a2e] ring-1 ring-[#fcd8b8]">
                    {account.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-black text-slate-950">
                      {account.name}
                    </h3>
                    <p className="mt-1 flex items-center gap-1 truncate text-xs font-bold text-slate-500">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      {account.email}
                    </p>
                  </div>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${statusStyles[account.status]}`}>
                  {account.status}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">Role</p>
                <select
                  value={account.role}
                  disabled={updatingRoleId === account.id}
                  onChange={(event) => updateUserRole(account, event.target.value)}
                  className={`h-8 rounded-full border-0 px-3 text-xs font-black outline-none ring-1 transition focus:ring-2 focus:ring-[#fcd8b8] disabled:cursor-wait disabled:opacity-70 ${roleStyles[account.role]}`}
                >
                  <option value="Admin">Admin</option>
                  <option value="Employee">Employee</option>
                </select>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3">
                <button type="button" onClick={() => openPasswordModal(account)} className="inline-flex h-9 items-center justify-center gap-1 rounded-lg bg-[#fff3e8] px-2 text-xs font-black text-[#9a5a2e] hover:bg-[#fcd8b8]">
                  <KeyRound className="h-4 w-4" />
                  Password
                </button>
                <button type="button" onClick={() => archiveUser(account)} className="inline-flex h-9 items-center justify-center gap-1 rounded-lg bg-slate-100 px-2 text-xs font-black text-slate-700 hover:bg-slate-200">
                  <Archive className="h-4 w-4" />
                  {account.status === 'Archived' ? 'Restore' : 'Archive'}
                </button>
                <button type="button" onClick={() => openDeleteModal(account)} className="inline-flex h-9 items-center justify-center gap-1 rounded-lg bg-rose-50 px-2 text-xs font-black text-rose-600 hover:bg-rose-100">
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>

        {!isLoading && filteredUsers.length === 0 ? (
          <div className="mt-5 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
            <User className="mx-auto h-9 w-9 text-slate-400" />
            <h3 className="mt-3 text-base font-black text-slate-900">No accounts found</h3>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              Add a user or employee account, or change your filters.
            </p>
          </div>
        ) : null}

        {filteredUsers.length > 0 ? (
          <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-sm font-bold text-slate-500">
              Showing {(safeCurrentPage - 1) * usersPerPage + 1}-
              {Math.min(safeCurrentPage * usersPerPage, filteredUsers.length)} of {filteredUsers.length}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => goToPage(safeCurrentPage - 1)} disabled={safeCurrentPage === 1} className="h-9 rounded-lg border border-slate-200 px-3 text-sm font-black text-slate-600 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50">
                Prev
              </button>
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => goToPage(page)}
                  className={`h-9 min-w-9 rounded-lg px-3 text-sm font-black ${
                    page === safeCurrentPage
                      ? 'bg-[#c8793f] text-white'
                      : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button type="button" onClick={() => goToPage(safeCurrentPage + 1)} disabled={safeCurrentPage === totalPages} className="h-9 rounded-lg border border-slate-200 px-3 text-sm font-black text-slate-600 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50">
                Next
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {modalMode === 'add' ? (
        <ModalShell title="Add Account" onClose={closeModal}>
          <form onSubmit={saveUser} className="grid gap-4 md:grid-cols-2">
            <Field label="Name">
              <input required value={userForm.name} onChange={(event) => setUserForm((current) => ({ ...current, name: event.target.value }))} className={inputClass} />
            </Field>
            <Field label="Email">
              <input required type="email" value={userForm.email} onChange={(event) => setUserForm((current) => ({ ...current, email: event.target.value }))} className={inputClass} />
            </Field>
            <Field label="Password">
              <input required type="password" value={userForm.password} onChange={(event) => setUserForm((current) => ({ ...current, password: event.target.value }))} className={inputClass} />
            </Field>
            <Field label="Role">
              <select value={userForm.role} onChange={(event) => setUserForm((current) => ({ ...current, role: event.target.value }))} className={inputClass}>
                <option value="Admin">Admin</option>
                <option value="Employee">Employee</option>
              </select>
            </Field>
            <div className="flex flex-col gap-3 md:col-span-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={closeModal} className="h-11 rounded-lg border border-slate-200 px-5 text-sm font-black text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button disabled={isSaving} type="submit" className="h-11 rounded-lg bg-[#c8793f] px-5 text-sm font-black text-white hover:bg-[#9a5a2e] disabled:cursor-not-allowed disabled:opacity-60">
                {isSaving ? 'Saving...' : 'Save Account'}
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {modalMode === 'password' && selectedUser ? (
        <ModalShell title="Change Password" onClose={closeModal} size="max-w-md">
          <form onSubmit={changePassword} className="space-y-4">
            <p className="rounded-lg bg-slate-50 p-3 text-sm font-bold text-slate-600">
              Account: <span className="text-slate-950">{selectedUser.email}</span>
            </p>
            <Field label="New Password">
              <input required type="password" value={passwordForm.password} onChange={(event) => setPasswordForm((current) => ({ ...current, password: event.target.value }))} className={inputClass} />
            </Field>
            <Field label="Confirm Password">
              <input required type="password" value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))} className={inputClass} />
            </Field>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={closeModal} className="h-11 rounded-lg border border-slate-200 px-5 text-sm font-black text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button disabled={isSaving} type="submit" className="h-11 rounded-lg bg-[#c8793f] px-5 text-sm font-black text-white hover:bg-[#9a5a2e] disabled:cursor-not-allowed disabled:opacity-60">
                {isSaving ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {modalMode === 'delete' && selectedUser ? (
        <ModalShell title="Delete Account" onClose={closeModal} size="max-w-md">
          <p className="text-sm font-semibold leading-6 text-slate-600">
            Delete <span className="font-black text-slate-950">{selectedUser.name}</span>? Archive is safer if you only want to deactivate the account.
          </p>
          <div className="mt-5 flex justify-end gap-3">
            <button type="button" onClick={closeModal} className="h-11 rounded-lg border border-slate-200 px-5 text-sm font-black text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
            <button disabled={isSaving} type="button" onClick={deleteUser} className="h-11 rounded-lg bg-rose-500 px-5 text-sm font-black text-white hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60">
              {isSaving ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </ModalShell>
      ) : null}
    </div>
  )
}

export default Users
