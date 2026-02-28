import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CalendarDays,
  DollarSign,
  Users,
  TrendingUp,
  Clock,
  AlertCircle,
  ArrowUpRight,
  ArrowRight,
  Plus,
  BarChart3,
  UserPlus,
  Settings,
  FileText,
  UsersRound,
} from "lucide-react";

const stats = [
  {
    title: "Today's Bookings",
    value: "0",
    change: "No bookings yet",
    icon: CalendarDays,
    gradient: "from-blue-500 to-blue-600",
    lightBg: "bg-blue-50",
    lightText: "text-blue-600",
  },
  {
    title: "Revenue Today",
    value: "$0.00",
    change: "No revenue yet",
    icon: DollarSign,
    gradient: "from-emerald-500 to-emerald-600",
    lightBg: "bg-emerald-50",
    lightText: "text-emerald-600",
  },
  {
    title: "Active Members",
    value: "0",
    change: "No members yet",
    icon: Users,
    gradient: "from-violet-500 to-violet-600",
    lightBg: "bg-violet-50",
    lightText: "text-violet-600",
  },
  {
    title: "Utilization Rate",
    value: "0%",
    change: "No data yet",
    icon: TrendingUp,
    gradient: "from-amber-500 to-orange-500",
    lightBg: "bg-amber-50",
    lightText: "text-amber-600",
  },
];

const quickActions = [
  { label: "New Booking", href: "/admin/calendar", icon: Plus, color: "text-emerald-600 bg-emerald-50 border-emerald-100 hover:bg-emerald-100" },
  { label: "Add Customer", href: "/admin/customers/new", icon: UserPlus, color: "text-blue-600 bg-blue-50 border-blue-100 hover:bg-blue-100" },
  { label: "Create Program", href: "/admin/programs/new", icon: FileText, color: "text-violet-600 bg-violet-50 border-violet-100 hover:bg-violet-100" },
  { label: "View Reports", href: "/admin/reports", icon: BarChart3, color: "text-pink-600 bg-pink-50 border-pink-100 hover:bg-pink-100" },
  { label: "Manage Staff", href: "/admin/staff", icon: UsersRound, color: "text-amber-600 bg-amber-50 border-amber-100 hover:bg-amber-100" },
  { label: "Settings", href: "/admin/settings", icon: Settings, color: "text-slate-600 bg-slate-50 border-slate-200 hover:bg-slate-100" },
];

type Booking = { time: string; customer: string; space: string; duration: string };
const upcomingBookings: Booking[] = [];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Welcome back! Here&apos;s what&apos;s happening at your facility.
          </p>
        </div>
        <Link
          href="/admin/calendar"
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-emerald-600/20"
        >
          <Plus className="w-4 h-4" />
          New Booking
        </Link>
      </div>

      {/* Setup banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 p-5">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-200/20 rounded-full blur-2xl" />
        <div className="relative flex items-start gap-3.5">
          <div className="p-2 bg-amber-100 rounded-xl shrink-0">
            <AlertCircle className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-amber-900">Finish setting up your facility</p>
            <p className="text-sm text-amber-700/80 mt-0.5">
              Add your spaces, configure pricing, and invite staff to get started.
            </p>
            <Link
              href="/admin/settings"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 hover:text-amber-900 mt-3 transition-colors"
            >
              Configure Facility
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{stat.title}</p>
                  <p className="text-3xl font-extrabold text-slate-900 tracking-tight">{stat.value}</p>
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    {stat.change}
                  </p>
                </div>
                <div className={`p-2.5 rounded-xl bg-gradient-to-br ${stat.gradient} shadow-sm`}>
                  <stat.icon className="w-5 h-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Upcoming Bookings - takes 3 cols */}
        <Card className="xl:col-span-3 border-0 shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-700">
              <Clock className="w-4 h-4 text-slate-400" />
              Upcoming Bookings
            </CardTitle>
            <Link href="/admin/calendar" className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1">
              View all <ArrowUpRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {upcomingBookings.length === 0 ? (
              <div className="text-center py-14 text-slate-400">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <CalendarDays className="w-7 h-7 text-slate-300" />
                </div>
                <p className="text-sm font-medium text-slate-500">No upcoming bookings</p>
                <p className="text-xs mt-1 text-slate-400">Bookings will appear here once customers start booking.</p>
                <Link
                  href="/admin/calendar"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 mt-4 transition-colors"
                >
                  Create a booking
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <ul className="space-y-1">
                {upcomingBookings.map((b, i) => (
                  <li key={i} className="flex items-center justify-between py-3 px-3 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-700">
                        {b.customer.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{b.customer}</p>
                        <p className="text-xs text-slate-400">{b.space} &middot; {b.duration}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs font-medium">{b.time}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions - takes 2 cols */}
        <Card className="xl:col-span-2 border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2.5">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className={`flex flex-col items-center gap-2.5 p-4 rounded-xl border transition-all duration-200 text-center group ${action.color}`}
                >
                  <action.icon className="w-5 h-5" />
                  <span className="text-xs font-semibold">{action.label}</span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
