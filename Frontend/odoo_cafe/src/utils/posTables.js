const toNumber = (value) => Number(value || 0)

export const normalizePosTable = (table) => ({
  id: table.id,
  floorId: table.floor_id,
  floor: table.floor_name || '-',
  number: table.table_number,
  seats: toNumber(table.seats),
  token: table.unique_token,
  status: table.has_active_order || table.pos_status === 'active' ? 'active' : 'available',
  activeOrderId: table.active_order_id,
  activeOrderAmount: toNumber(table.active_order_amount),
  qrDataUrl: table.qrDataUrl || '',
  qrUrl: table.qrUrl || table.qr_url || '',
})

export const groupTablesByFloor = (tables) =>
  tables.reduce((floors, table) => {
    const existingFloor = floors.find((floor) => floor.id === table.floorId)

    if (existingFloor) {
      existingFloor.tables.push(table)
      return floors
    }

    return [
      ...floors,
      {
        id: table.floorId,
        name: table.floor,
        tables: [table],
      },
    ]
  }, [])
