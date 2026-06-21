export const DUMMY_USERS = [
  {
    id: 'admin-demo',
    fullName: 'Cafe Admin',
    email: 'admin@cafe.com',
    password: 'admin123',
    role: 'admin',
  },
  {
    id: 'employee-demo',
    fullName: 'Counter Cashier',
    email: 'employee@cafe.com',
    password: 'emp123',
    role: 'employee',
  },
  {
    id: 'customer-demo',
    fullName: 'Cafe Customer',
    email: 'customer@cafe.com',
    password: 'customer123',
    role: 'customer',
  },
]

export const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin/User' },
  { value: 'employee', label: 'Employee/Cashier' },
  { value: 'customer', label: 'Customer' },
]

export const ROLE_HOME = {
  admin: '/admin/dashboard',
  employee: '/pos',
  customer: '/customer-display',
}

export const getRoleLabel = (role) => {
  return ROLE_OPTIONS.find((option) => option.value === role)?.label || role
}
