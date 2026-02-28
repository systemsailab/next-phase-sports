"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
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
  Menu,
  X,
  LogOut,
} from "lucide-react";

const navGroups = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
      { title: "Calendar", href: "/admin/calendar", icon: CalendarDays },
    ],
  },
  {
    label: "Manage",
    items: [
      { title: "Customers", href: "/admin/customers", icon: Users },
      { title: "Programs", href: "/admin/programs", icon: BookOpen },
      { title: "Leagues", href: "/admin/leagues", icon: Trophy },
      { title: "Staff", href: "/admin/staff", icon: UserCog },
    ],
  },
  {
    label: "Finance",
    items: [
      { title: "Reports", href: "/admin/reports", icon: BarChart3 },
      { title: "Billing", href: "/admin/billing", icon: CreditCard },
    ],
  },
  {
    label: "Tools",
    items: [
      { title: "AI Assistant", href: "/admin/ai", icon: Zap },
      { title: "Settings", href: "/admin/settings", icon: Settings },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Close sidebar on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2.5 rounded-xl bg-white/90 backdrop-blur-sm shadow-lg border border-gray-200/60 text-gray-700 hover:bg-white transition-colors"
        aria-label="Open sidebar"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-screen w-[272px] flex flex-col z-50 transition-transform duration-300 ease-out",
          "bg-[#0b1120] border-r border-white/[0.06]",
          // Mobile: slide in/out
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          // Desktop: always visible
          "lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="p-5 flex items-center justify-between">
          <Link href="/admin/dashboard" className="flex items-center gap-3 group">
            <div className="w-9 h-9 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center font-extrabold text-white text-sm shadow-lg shadow-emerald-500/25 group-hover:shadow-emerald-500/40 transition-shadow">
              NP
            </div>
            <div>
              <p className="font-bold text-sm text-white tracking-tight">Next Phase</p>
              <p className="text-[11px] text-slate-500">Sports Platform</p>
            </div>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 pb-4 overflow-y-auto scrollbar-thin">
          {navGroups.map((group) => (
            <div key={group.label} className="mt-6 first:mt-2">
              <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-600">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive =
                    pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200",
                          isActive
                            ? "bg-emerald-500/15 text-emerald-400 shadow-sm shadow-emerald-500/5"
                            : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-200"
                        )}
                      >
                        <item.icon className={cn("w-[18px] h-[18px] shrink-0", isActive && "text-emerald-400")} />
                        {item.title}
                        {isActive && (
                          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* User section */}
        <div className="p-3 border-t border-white/[0.06]">
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/[0.05] transition-colors cursor-pointer group">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-xs font-bold text-white shadow-sm">
              A
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">Admin</p>
              <p className="text-[11px] text-slate-500 truncate">Facility Manager</p>
            </div>
            <LogOut className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors shrink-0" />
          </div>
        </div>
      </aside>
    </>
  );
}
