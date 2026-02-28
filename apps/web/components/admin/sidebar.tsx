"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  BookOpen,
  Trophy,
  Settings,
  BarChart3,
  CreditCard,
  UserCog,
  Zap,
} from "lucide-react";

const navItems = [
  { title: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { title: "Calendar", href: "/admin/calendar", icon: CalendarDays },
  { title: "Customers", href: "/admin/customers", icon: Users },
  { title: "Programs", href: "/admin/programs", icon: BookOpen },
  { title: "Leagues", href: "/admin/leagues", icon: Trophy },
  { title: "Staff", href: "/admin/staff", icon: UserCog },
  { title: "Reports", href: "/admin/reports", icon: BarChart3 },
  { title: "Billing", href: "/admin/billing", icon: CreditCard },
  { title: "AI Assistant", href: "/admin/ai", icon: Zap },
  { title: "Settings", href: "/admin/settings", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-slate-900 text-white flex flex-col z-50">
      <div className="p-6 border-b border-slate-700">
        <Link href="/admin/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center font-bold text-sm">
            NP
          </div>
          <div>
            <p className="font-semibold text-sm">Next Phase</p>
            <p className="text-xs text-slate-400">Sports Platform</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                    isActive
                      ? "bg-emerald-500 text-white"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  )}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  {item.title}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-xs font-medium">
            A
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">Admin</p>
            <p className="text-xs text-slate-400 truncate">Facility Admin</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
