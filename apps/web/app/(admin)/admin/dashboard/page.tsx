import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CalendarDays,
  DollarSign,
  Users,
  TrendingUp,
  Clock,
  AlertCircle,
} from "lucide-react";

const stats = [
  {
    title: "Today's Bookings",
    value: "0",
    change: "No bookings yet",
    icon: CalendarDays,
    color: "text-blue-500",
    bg: "bg-blue-50",
  },
  {
    title: "Revenue Today",
    value: "$0.00",
    change: "No revenue yet",
    icon: DollarSign,
    color: "text-emerald-500",
    bg: "bg-emerald-50",
  },
  {
    title: "Active Members",
    value: "0",
    change: "No members yet",
    icon: Users,
    color: "text-purple-500",
    bg: "bg-purple-50",
  },
  {
    title: "Utilization Rate",
    value: "0%",
    change: "No data yet",
    icon: TrendingUp,
    color: "text-orange-500",
    bg: "bg-orange-50",
  },
];

type Booking = { time: string; customer: string; space: string; duration: string };
const upcomingBookings: Booking[] = [];

export default function DashboardPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">
          Welcome back! Here's what's happening at your facility.
        </p>
      </div>

      <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
        <div>
          <p className="font-medium text-amber-900">Finish setting up your facility</p>
          <p className="text-sm text-amber-700 mt-1">
            Add your spaces, configure pricing, and invite staff to get started.
          </p>
          <div className="flex gap-2 mt-3">
            <a
              href="/admin/settings"
              className="text-xs bg-amber-500 text-white px-3 py-1.5 rounded-lg hover:bg-amber-600 transition-colors"
            >
              Configure Facility
            </a>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500 font-medium">{stat.title}</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
                  <p className="text-xs text-slate-400 mt-1">{stat.change}</p>
                </div>
                <div className={`p-2.5 rounded-xl ${stat.bg}`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              Upcoming Bookings
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingBookings.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No upcoming bookings</p>
                <p className="text-xs mt-1">Bookings will appear here once customers start booking.</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {upcomingBookings.map((b, i) => (
                  <li key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{b.customer}</p>
                      <p className="text-xs text-slate-400">{b.space} &middot; {b.duration}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">{b.time}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "New Booking", href: "/admin/calendar", emoji: "📅" },
                { label: "Add Customer", href: "/admin/customers/new", emoji: "👤" },
                { label: "Create Program", href: "/admin/programs/new", emoji: "📋" },
                { label: "View Reports", href: "/admin/reports", emoji: "📊" },
                { label: "Manage Staff", href: "/admin/staff", emoji: "👥" },
                { label: "Settings", href: "/admin/settings", emoji: "⚙️" },
              ].map((action) => (
                <a
                  key={action.href}
                  href={action.href}
                  className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 transition-all text-sm font-medium text-slate-700 hover:text-emerald-700"
                >
                  <span>{action.emoji}</span>
                  {action.label}
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
