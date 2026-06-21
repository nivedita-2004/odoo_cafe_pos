export const calculateSubtotal = (items = []) =>
  items.reduce((total, item) => total + item.price * item.quantity, 0)

export const calculateProductDiscount = () => 0

export const calculateOrderDiscount = () => 0

export const calculateTax = (items = [], discount = 0, subtotal = calculateSubtotal(items)) =>
  items.reduce((total, item) => {
    const lineTotal = item.price * item.quantity
    const share = subtotal > 0 ? lineTotal / subtotal : 0
    const lineDiscount = discount * share
    const taxableAmount = Math.max(lineTotal - lineDiscount, 0)
    return total + (taxableAmount * item.tax) / 100
  }, 0)

export const calculateCouponDiscount = (coupon, amountAfterAutoDiscounts = 0) => {
  if (!coupon) return 0
  const discountBase = Math.max(Number(amountAfterAutoDiscounts) || 0, 0)
  const couponValue = Math.max(Number(coupon.value) || 0, 0)
  let discount = 0

  if (coupon.type === 'percent') {
    discount = (discountBase * couponValue) / 100
  } else {
    discount = couponValue
  }

  return Math.min(Math.max(discount, 0), discountBase)
}

export const calculateTotal = (items = [], coupon = null) => {
  const subtotal = calculateSubtotal(items)
  const productDiscount = calculateProductDiscount(items)
  const orderDiscount = calculateOrderDiscount(subtotal)
  const beforeCoupon = Math.max(subtotal - productDiscount - orderDiscount, 0)
  const couponDiscount = calculateCouponDiscount(coupon, beforeCoupon)
  const totalDiscount = productDiscount + orderDiscount + couponDiscount
  const tax = calculateTax(items, totalDiscount, subtotal)
  const total = Math.max(subtotal - totalDiscount + tax, 0)

  return {
    subtotal,
    tax,
    productDiscount,
    orderDiscount,
    couponDiscount,
    total,
  }
}
