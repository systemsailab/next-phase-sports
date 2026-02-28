import Link from "next/link";
import {
  CalendarDays,
  CreditCard,
  Users,
  BarChart3,
  Clock,
  Shield,
  Zap,
  ArrowRight,
  CheckCircle2,
  Star,
  ChevronRight,
} from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-hero text-white overflow-hidden">
      {/* ─── NAV ─── */}
      <nav className="relative z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-10 h-10 bg-gradient-brand rounded-xl flex items-center justify-center font-black text-white text-lg shadow-lg shadow-emerald-500/25 group-hover:shadow-emerald-500/40 transition-shadow">
              NP
            </div>
            <span className="text-xl font-bold tracking-tight">Next Phase</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/sign-in"
              className="hidden sm:inline-flex text-sm text-slate-300 hover:text-white transition-colors px-4 py-2"
            >
              Log in
            </Link>
            <Link
              href="/sign-up"
              className="bg-white/10 hover:bg-white/15 border border-white/10 backdrop-blur-sm text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:border-white/20"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="relative max-w-7xl mx-auto px-6 pt-20 pb-32 text-center">
        {/* Background glow effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-emerald-500/8 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-20 left-1/4 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-full px-5 py-2 text-sm text-emerald-300 mb-10 backdrop-blur-sm animate-fade-in">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
            </span>
            AI-Powered Facility Management
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-8xl font-extrabold tracking-tight mb-8 animate-fade-in-up leading-[0.9]">
            Run your facility
            <br />
            <span className="text-gradient">the right way</span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-14 animate-fade-in-up leading-relaxed" style={{ animationDelay: "0.15s" }}>
            Bookings, payments, scheduling, and analytics — everything your sports facility needs, beautifully managed from one platform.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
            <Link
              href="/sign-up"
              className="group bg-gradient-brand hover:opacity-90 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/30 flex items-center gap-2"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href="/admin/dashboard"
              className="group border border-white/15 hover:border-white/30 text-white px-8 py-4 rounded-2xl font-semibold text-lg transition-all backdrop-blur-sm bg-white/5 hover:bg-white/10 flex items-center gap-2"
            >
              View Live Demo
              <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── STATS BAR ─── */}
      <section className="relative border-y border-white/5 bg-white/[0.02] backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: "99.9%", label: "Uptime" },
            { value: "< 2s", label: "Booking Time" },
            { value: "24/7", label: "AI Support" },
            { value: "0%", label: "Transaction Fees*" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl md:text-4xl font-extrabold text-gradient">{stat.value}</p>
              <p className="text-sm text-slate-500 mt-1.5 uppercase tracking-wider">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section id="features" className="relative max-w-7xl mx-auto px-6 py-28">
        <div className="text-center mb-16">
          <p className="text-emerald-400 text-sm font-semibold uppercase tracking-widest mb-4">Everything you need</p>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">
            Built for modern sports facilities
          </h2>
          <p className="text-slate-400 text-lg mt-4 max-w-2xl mx-auto">
            From court reservations to payments, manage it all from one beautiful dashboard.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            {
              icon: CalendarDays,
              title: "Smart Scheduling",
              desc: "Automated conflict detection, buffer times, and intelligent slot management. Never double-book again.",
              accent: "from-emerald-500/20 to-emerald-500/0",
              iconBg: "bg-emerald-500/10 text-emerald-400",
            },
            {
              icon: CreditCard,
              title: "Stripe Payments",
              desc: "Secure checkout, automatic invoicing, refunds, and real-time revenue tracking — all built in.",
              accent: "from-blue-500/20 to-blue-500/0",
              iconBg: "bg-blue-500/10 text-blue-400",
            },
            {
              icon: Users,
              title: "Customer Management",
              desc: "Track bookings, manage memberships, automate reminders, and build lasting relationships.",
              accent: "from-purple-500/20 to-purple-500/0",
              iconBg: "bg-purple-500/10 text-purple-400",
            },
            {
              icon: Clock,
              title: "Waitlists & Reminders",
              desc: "Automatic waitlist notifications when slots open. Email reminders reduce no-shows by 60%.",
              accent: "from-amber-500/20 to-amber-500/0",
              iconBg: "bg-amber-500/10 text-amber-400",
            },
            {
              icon: BarChart3,
              title: "Revenue Analytics",
              desc: "Real-time dashboards for revenue, utilization rates, and booking trends. Make data-driven decisions.",
              accent: "from-pink-500/20 to-pink-500/0",
              iconBg: "bg-pink-500/10 text-pink-400",
            },
            {
              icon: Shield,
              title: "Recurring Bookings",
              desc: "Weekly recurring sessions with automatic payment collection. Perfect for teams and leagues.",
              accent: "from-cyan-500/20 to-cyan-500/0",
              iconBg: "bg-cyan-500/10 text-cyan-400",
            },
          ].map((feat) => (
            <div
              key={feat.title}
              className="group relative bg-white/[0.03] border border-white/[0.06] rounded-2xl p-7 hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-300"
            >
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-b ${feat.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
              <div className="relative z-10">
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${feat.iconBg} mb-5`}>
                  <feat.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold mb-2.5 text-white">{feat.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{feat.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="relative max-w-5xl mx-auto px-6 py-28">
        <div className="text-center mb-16">
          <p className="text-emerald-400 text-sm font-semibold uppercase tracking-widest mb-4">Get started in minutes</p>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">Three simple steps</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              step: "01",
              title: "Set up your facility",
              desc: "Add your spaces, set pricing and hours. Takes less than 5 minutes.",
              icon: Zap,
            },
            {
              step: "02",
              title: "Share your booking page",
              desc: "Send customers your link. They pick a space, choose a time, and pay instantly.",
              icon: Users,
            },
            {
              step: "03",
              title: "Watch revenue grow",
              desc: "Track bookings, revenue, and analytics in real-time from your dashboard.",
              icon: BarChart3,
            },
          ].map((item, i) => (
            <div key={item.step} className="relative text-center group">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-brand text-white font-extrabold text-xl mb-6 shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/30 transition-shadow">
                {item.step}
              </div>
              <h3 className="text-xl font-bold mb-3">{item.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
              {i < 2 && (
                <div className="hidden md:block absolute top-8 right-0 translate-x-1/2 w-8 h-px bg-white/10" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ─── SOCIAL PROOF ─── */}
      <section className="relative border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <blockquote className="text-xl md:text-2xl font-medium text-slate-200 max-w-3xl mx-auto leading-relaxed">
              &ldquo;Next Phase Sports completely transformed how we run our facility. Bookings are up 40%, no-shows are down, and we finally have real visibility into our business.&rdquo;
            </blockquote>
            <div className="mt-6">
              <p className="font-semibold text-white">Sarah Mitchell</p>
              <p className="text-sm text-slate-500">Operations Director, Elite Sports Complex</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="relative max-w-4xl mx-auto px-6 py-28 text-center">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="relative z-10">
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-6">
            Ready to take your facility<br />to the next phase?
          </h2>
          <p className="text-lg text-slate-400 max-w-xl mx-auto mb-10">
            Join facility owners who are saving hours every week and growing their revenue with Next Phase Sports.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/sign-up"
              className="group bg-gradient-brand hover:opacity-90 text-white px-10 py-5 rounded-2xl font-bold text-lg transition-all shadow-xl shadow-emerald-500/20 flex items-center gap-2"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
          <p className="text-xs text-slate-600 mt-6">No credit card required. Set up in under 5 minutes.</p>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-white/5 px-6 py-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-brand rounded-lg flex items-center justify-center font-bold text-white text-xs">
              NP
            </div>
            <span className="text-sm text-slate-500">© 2026 Next Phase Sports</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-slate-500">
            <Link href="#features" className="hover:text-slate-300 transition-colors">Features</Link>
            <Link href="/book" className="hover:text-slate-300 transition-colors">Book a Space</Link>
            <Link href="/sign-in" className="hover:text-slate-300 transition-colors">Log In</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
