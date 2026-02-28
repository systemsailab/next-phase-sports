import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white">
      <nav className="border-b border-white/10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <span className="text-2xl font-bold text-blue-400">Next Phase Sports</span>
          <div className="flex items-center gap-4">
            <Link href="/sign-in" className="text-sm text-slate-300 hover:text-white">Log in</Link>
            <Link href="/sign-up" className="text-sm bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg font-medium">Get Started</Link>
          </div>
        </div>
      </nav>

      <section className="max-w-7xl mx-auto px-6 py-32 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 text-sm text-blue-300 mb-8">
          <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
          AI-Powered Sports Facility Management
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
          Run your facility{" "}
          <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            autonomously
          </span>
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-12">
          Bookings, memberships, leagues, tournaments, waivers, and payments — all managed by AI. No manual work required.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/sign-up" className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-colors">
            Start Free Trial
          </Link>
          <Link href="#features" className="border border-white/20 hover:border-white/40 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-colors">
            Learn More
          </Link>
        </div>
      </section>

      <section id="features" className="max-w-7xl mx-auto px-6 py-24 grid md:grid-cols-3 gap-8">
        {[
          { icon: "🤖", title: "AI Booking Assistant", desc: "Customers book by texting your facility number. AI handles everything 24/7." },
          { icon: "📅", title: "Smart Scheduling", desc: "Automated conflict detection, waitlists, reminders, and cancellation handling." },
          { icon: "💳", title: "Stripe Connect Payments", desc: "Memberships, packages, credit systems, and automated payment recovery." },
          { icon: "🏆", title: "Leagues & Tournaments", desc: "Full automation: scheduling, standings, brackets, and public pages." },
          { icon: "🔐", title: "Smart Lock Access", desc: "QR codes and time-limited access codes for unmanned facility operations." },
          { icon: "📊", title: "Business Analytics", desc: "Revenue, utilization, membership churn, and AI-generated daily summaries." },
        ].map((feat) => (
          <div key={feat.title} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/8 transition-colors">
            <div className="text-4xl mb-4">{feat.icon}</div>
            <h3 className="text-lg font-semibold mb-2">{feat.title}</h3>
            <p className="text-slate-400 text-sm leading-relaxed">{feat.desc}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-white/10 px-6 py-8 text-center text-sm text-slate-500">
        © 2026 Next Phase Sports. Built by SystemsAI Lab.
      </footer>
    </main>
  );
}
