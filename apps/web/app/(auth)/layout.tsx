export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Next Phase Sports</h1>
          <p className="text-slate-400 mt-2">Your sports facility management platform</p>
        </div>
        {children}
      </div>
    </div>
  );
}
