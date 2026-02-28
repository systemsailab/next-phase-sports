import { getAdminPayments, getRevenueStats } from "@/lib/actions/payments";
import { formatCents } from "@/lib/booking-utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefundButton } from "@/components/admin/refund-button";

function paymentStatusBadge(status: string) {
  switch (status) {
    case "SUCCEEDED":
      return { variant: "default" as const, className: "bg-emerald-100 text-emerald-700 border-emerald-200", label: "Succeeded" };
    case "PENDING":
      return { variant: "outline" as const, className: "border-amber-300 text-amber-700 bg-amber-50", label: "Pending" };
    case "PROCESSING":
      return { variant: "outline" as const, className: "border-blue-300 text-blue-700 bg-blue-50", label: "Processing" };
    case "FAILED":
      return { variant: "destructive" as const, className: "", label: "Failed" };
    case "REFUNDED":
      return { variant: "outline" as const, className: "border-slate-300 text-slate-500 bg-slate-50 line-through", label: "Refunded" };
    case "PARTIALLY_REFUNDED":
      return { variant: "outline" as const, className: "border-blue-300 text-blue-600 bg-blue-50", label: "Partial Refund" };
    case "DISPUTED":
      return { variant: "destructive" as const, className: "bg-red-100 text-red-700 border-red-200", label: "Disputed" };
    default:
      return { variant: "outline" as const, className: "", label: status };
  }
}

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function percentChange(current: number, previous: number): string {
  if (previous === 0) return current > 0 ? "+100%" : "—";
  const pct = ((current - previous) / previous) * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(0)}%`;
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const statusFilter = params.status ?? "all";
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const perPage = 25;

  const [stats, { payments, total }] = await Promise.all([
    getRevenueStats(),
    getAdminPayments({
      status: statusFilter,
      limit: perPage,
      offset: (page - 1) * perPage,
    }),
  ]);

  const totalPages = Math.ceil(total / perPage);
  const pctChange = percentChange(stats.thisMonth.revenue, stats.lastMonth.revenue);
  const netRevenue = stats.allTime.revenue - stats.allTime.refunded;

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Payments & Revenue</h1>
        <p className="text-slate-500 mt-1">Track payments, issue refunds, and monitor revenue.</p>
      </div>

      {/* Revenue Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-900">
              {formatCents(stats.thisMonth.revenue)}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {stats.thisMonth.count} payment{stats.thisMonth.count !== 1 ? "s" : ""}{" "}
              <span className={pctChange.startsWith("+") ? "text-emerald-600" : pctChange.startsWith("-") ? "text-red-500" : ""}>
                {pctChange} vs last month
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Last Month</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-900">
              {formatCents(stats.lastMonth.revenue)}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {stats.lastMonth.count} payment{stats.lastMonth.count !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-900">
              {formatCents(stats.thisWeek.revenue)}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {stats.thisWeek.count} payment{stats.thisWeek.count !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">All Time (Net)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-900">
              {formatCents(netRevenue)}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {stats.allTime.count} total &middot; {formatCents(stats.allTime.refunded)} refunded
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Payments (Quick Glance) */}
      {stats.recentPayments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Payments</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {stats.recentPayments.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-6 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold">
                      {(p.customer?.firstName?.[0] ?? "?").toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {p.customer?.firstName} {p.customer?.lastName}
                      </p>
                      <p className="text-xs text-slate-400">
                        {p.booking?.space?.name ?? "—"}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-slate-900">
                    {formatCents(p.amount)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {["all", "SUCCEEDED", "PENDING", "PROCESSING", "FAILED", "REFUNDED", "PARTIALLY_REFUNDED"].map(
          (s) => {
            const isActive = statusFilter === s;
            const label = s === "all" ? "All" : s === "PARTIALLY_REFUNDED" ? "Partial Refund" : s.charAt(0) + s.slice(1).toLowerCase();
            return (
              <a
                key={s}
                href={`/admin/billing?status=${s}${page > 1 ? `&page=1` : ""}`}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-white text-slate-500 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {label}
              </a>
            );
          }
        )}
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left px-4 py-3 font-medium text-slate-500">Customer</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Space</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Booking</th>
                <th className="text-right px-4 py-3 font-medium text-slate-500">Amount</th>
                <th className="text-center px-4 py-3 font-medium text-slate-500">Status</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Date</th>
                <th className="text-right px-4 py-3 font-medium text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    No payments found{statusFilter !== "all" ? ` with status "${statusFilter}"` : ""}.
                  </td>
                </tr>
              ) : (
                payments.map((payment) => {
                  const badge = paymentStatusBadge(payment.status);
                  return (
                    <tr key={payment.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-slate-800">
                            {payment.customer?.firstName} {payment.customer?.lastName}
                          </p>
                          <p className="text-xs text-slate-400">{payment.customer?.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {payment.booking?.space?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {payment.booking?.startTime
                          ? formatDate(payment.booking.startTime)
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">
                        {formatCents(payment.amount)}
                        {payment.refundedAmount > 0 && (
                          <p className="text-xs text-blue-500 font-normal">
                            -{formatCents(payment.refundedAmount)} refunded
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={badge.variant} className={`text-xs ${badge.className}`}>
                          {badge.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {formatDate(payment.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {payment.status === "SUCCEEDED" && (
                          <RefundButton
                            paymentId={payment.id}
                            amount={payment.amount}
                            customerName={`${payment.customer?.firstName ?? ""} ${payment.customer?.lastName ?? ""}`.trim()}
                          />
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-sm text-slate-500">
              Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total}
            </p>
            <div className="flex gap-1">
              {page > 1 && (
                <a
                  href={`/admin/billing?status=${statusFilter}&page=${page - 1}`}
                  className="px-3 py-1 rounded-lg text-sm bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  ← Prev
                </a>
              )}
              {page < totalPages && (
                <a
                  href={`/admin/billing?status=${statusFilter}&page=${page + 1}`}
                  className="px-3 py-1 rounded-lg text-sm bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Next →
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
