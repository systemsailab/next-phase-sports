"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { CalendarDays, BookOpen, User, Menu, X } from "lucide-react";

const navItems = [
  { title: "Book a Space", href: "/book", icon: CalendarDays },
  { title: "My Schedule", href: "/schedule", icon: BookOpen },
  { title: "My Account", href: "/account", icon: User },
];

export function CustomerHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center font-extrabold text-xs text-white shadow-sm shadow-emerald-500/20 group-hover:shadow-emerald-500/30 transition-shadow">
            NP
          </div>
          <span className="font-bold text-slate-900 tracking-tight">Next Phase</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-100/70 rounded-xl p-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-white text-emerald-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                )}
              >
                <item.icon className={cn("w-4 h-4", isActive ? "text-emerald-500" : "")} />
                {item.title}
              </Link>
            );
          })}
        </nav>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-2">
          <Link
            href="/sign-in"
            className="text-sm text-slate-500 hover:text-slate-900 font-medium px-3 py-2 transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/sign-up"
            className="text-sm bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 rounded-xl transition-colors shadow-sm shadow-emerald-600/20"
          >
            Get Started
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white/95 backdrop-blur-xl">
          <nav className="px-4 py-3 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                    isActive
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <item.icon className={cn("w-4 h-4", isActive ? "text-emerald-500" : "text-slate-400")} />
                  {item.title}
                </Link>
              );
            })}
          </nav>
          <div className="px-4 py-3 border-t border-slate-100 flex gap-2">
            <Link
              href="/sign-in"
              onClick={() => setMobileOpen(false)}
              className="flex-1 text-center text-sm font-medium text-slate-700 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              onClick={() => setMobileOpen(false)}
              className="flex-1 text-center text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 py-2.5 rounded-xl transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
