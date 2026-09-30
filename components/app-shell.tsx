import Link from "next/link";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/creators", label: "Creators" },
  { href: "/import", label: "Import" },
  { href: "/settings", label: "Settings" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-violet-600">Vesure</p>
            <h1 className="text-lg font-semibold">Creator Tracker</h1>
          </div>
          <nav className="hidden gap-6 md:flex">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="text-sm font-medium text-slate-600 hover:text-slate-900">
                {item.label}
              </Link>
            ))}
          </nav>
          <Link href="/login" className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium">
            Login
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}
