export const employee = {
  id: 1,
  name: 'Amit Sharma',
  role: 'Cashier',
  email: 'employee@cafe.com',
}

export const createOrderNumber = () =>
  `ORD-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`

export const tableKey = (table) => table?.id || table?.number || ''

export const getAllTables = (floors = []) =>
  floors.flatMap((floor) => floor.tables.map((table) => ({ ...table, floor: floor.name })))
