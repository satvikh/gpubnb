import Link from "next/link";
import { Wordmark, ThemeNav } from "@/app/_components/chrome";

const navItems = [
  { href: "/dashboard", label: "Overview" },
  { href: "/providers", label: "Machines" },
  { href: "/jobs", label: "Jobs" },
  { href: "/jobs/new", label: "Submit" }
];

export function MarketplaceShell({
  page,
  children,
  rightRail
}: {
  page: "dashboard" | "landing" | "login";
  children: React.ReactNode;
  rightRail?: React.ReactNode;
}) {
  return (
    <div
      className="gpu-root"
      style={{
        width: "100%",
        maxWidth: 1440,
        minHeight: "100vh",
        margin: "0 auto",
        background: "var(--paper)"
      }}
    >
      <div
        style={{
          padding: "10px 24px",
          borderBottom: "1px solid var(--rule)",
          display: "flex",
          alignItems: "center",
          gap: 24,
          background: "var(--paper)"
        }}
      >
        <Link href="/">
          <Wordmark size={18} />
        </Link>
        <div style={{ width: 1, height: 20, background: "var(--rule-soft)" }} />
        <div
          style={{
            display: "flex",
            gap: 2,
            fontSize: 12,
            fontFamily: "var(--font-mono)"
          }}
        >
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                padding: "6px 12px",
                borderRadius: 2,
                color: "var(--ink-2)"
              }}
            >
              {item.label}
            </Link>
          ))}
        </div>
        <div
          style={{
            marginLeft: 16,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "5px 10px",
            border: "1px solid var(--rule-soft)",
            borderRadius: 2,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--ink-3)",
            width: 280
          }}
        >
          <span>⌕</span>
          <span>Demo session · press Ctrl+K</span>
          <span className="kbd" style={{ marginLeft: "auto" }}>
            ⌘K
          </span>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
          {rightRail}
        </div>
      </div>
      {children}
      <ThemeNav page={page} />
    </div>
  );
}
