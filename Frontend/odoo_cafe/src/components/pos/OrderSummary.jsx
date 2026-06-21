import { formatCurrency } from '../../utils/formatCurrency'

const SummaryRow = ({ label, value, highlight }) => (
  <div className={`flex justify-between text-sm ${highlight ? 'font-black text-slate-950' : 'font-semibold text-slate-500'}`}>
    <span>{label}</span>
    <span>{formatCurrency(value)}</span>
  </div>
)

const OrderSummary = ({ totals }) => (
  <div className="space-y-2 rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
    <SummaryRow label="Subtotal" value={totals.subtotal} />
    <SummaryRow label="Tax" value={totals.tax} />
    <SummaryRow label="Product Discount" value={-totals.productDiscount} />
    <SummaryRow label="Order Discount" value={-totals.orderDiscount} />
    <SummaryRow label="Coupon Discount" value={-totals.couponDiscount} />
    <div className="border-t border-slate-200 pt-2">
      <SummaryRow label="Total" value={totals.total} highlight />
    </div>
  </div>
)

export default OrderSummary
