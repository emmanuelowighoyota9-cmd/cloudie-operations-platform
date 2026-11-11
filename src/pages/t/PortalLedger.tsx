import { useMemo, useState } from "react";
import { toast } from "sonner";
import { TenantPortalShell, money, usePortal } from "@/components/tenant/TenantPortalShell";
import { ArrowDownLeft, ArrowUpRight, Download, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const PERIODS = [
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "all", label: "All time" },
] as const;

export default function PortalLedger() {
  return (
    <TenantPortalShell>
      <LedgerBody />
    </TenantPortalShell>
  );
}

type ControlStyle = {
  background: string;
  borderColor: string;
  color: string;
  borderRadius: string;
};

function LedgerBody() {
  const { data, theme } = usePortal();
  const { tenant, ledger } = data;

  const [period, setPeriod] = useState<(typeof PERIODS)[number]["value"]>("30");
  const [kind, setKind] = useState<"all" | "credit" | "debit">("all");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const cutoff = period === "all" ? 0 : Date.now() - Number(period) * 86_400_000;
    const q = query.trim().toLowerCase();
    return ledger.filter((entry) => {
      if (entry.createdAt < cutoff) return false;
      if (kind === "credit" && entry.amount < 0) return false;
      if (kind === "debit" && entry.amount >= 0) return false;
      if (q && !entry.description.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [ledger, period, kind, query]);

  const inflow = rows.filter((r) => r.amount >= 0).reduce((s, r) => s + r.amount, 0);
  const outflow = rows.filter((r) => r.amount < 0).reduce((s, r) => s + Math.abs(r.amount), 0);

  function exportCsv() {
    if (rows.length === 0) {
      toast.error("Nothing to export in this range");
      return;
    }
    const header = ["Date", "Description", "Type", `Amount (${tenant.currency})`];
    const rowsForExport = rows.map((entry) => [
      new Date(entry.createdAt).toISOString(),
      entry.description,
      entry.type,
      (entry.amount / 100).toFixed(2),
    ]);
    const csv = [header, ...rowsForExport]
      .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${tenant.subdomain}-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} entries`);
  }

  const controlStyle: ControlStyle = {
    background: theme.inputBg,
    borderColor: theme.border,
    color: theme.text,
    borderRadius: theme.radius,
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1
            className="text-xl font-semibold tracking-tight"
            style={{ color: "var(--bank-text)" }}
          >
            Ledger
          </h1>
          <p className="mt-0.5 text-xs" style={{ color: theme.muted }}>
            Every movement on your {tenant.currency} accounts at {tenant.displayName}.
          </p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          className="inline-flex items-center gap-1.5 border px-3 py-1.5 text-[11px] font-semibold transition-colors"
          style={{
            borderColor: theme.border,
            color: theme.text,
            background: theme.panel,
            borderRadius: theme.radius,
          }}
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
            style={{ color: theme.muted }}
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search description"
            aria-label="Search ledger"
            className="w-full border py-2 pl-8 pr-2.5 text-xs outline-none"
            style={controlStyle}
          />
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as typeof period)}
          aria-label="Period"
          className="border px-2.5 py-2 text-xs outline-none"
          style={controlStyle}
        >
          {PERIODS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as typeof kind)}
          aria-label="Direction"
          className="border px-2.5 py-2 text-xs outline-none"
          style={controlStyle}
        >
          <option value="all">All entries</option>
          <option value="credit">Money in</option>
          <option value="debit">Money out</option>
        </select>
      </div>

      <div className="flex flex-wrap gap-2 text-[11px]">
        <span
          className="rounded-full border px-2.5 py-1"
          style={{ borderColor: theme.border, background: theme.panel, color: theme.muted }}
        >
          {rows.length} entries
        </span>
        <span
          className="rounded-full px-2.5 py-1"
          style={{ background: `rgba(${hexToRgb(theme.primary)},0.10)`, color: theme.primary }}
        >
          In {money(inflow, tenant.currency)}
        </span>
        <span
          className="rounded-full px-2.5 py-1"
          style={{ background: "rgba(239,68,68,0.10)", color: "#b91c1c" }}
        >
          Out {money(outflow, tenant.currency)}
        </span>
      </div>

      <div
        className="overflow-hidden border"
        style={{ background: theme.panel, borderColor: theme.border, borderRadius: theme.radius }}
      >
        {rows.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="text-sm font-medium" style={{ color: "var(--bank-text)" }}>
              No entries match those filters
            </p>
            <p className="mt-1 text-[11px]" style={{ color: theme.muted }}>
              Try a wider date range or clear the search.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <table className="hidden w-full sm:table">
              <thead>
                <tr
                  className="text-left text-[10px] uppercase tracking-wide"
                  style={{ color: theme.muted }}
                >
                  <th className="px-4 py-2.5 font-medium">Date</th>
                  <th className="px-4 py-2.5 font-medium">Description</th>
                  <th className="px-4 py-2.5 font-medium">Type</th>
                  <th className="px-4 py-2.5 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((entry) => {
                  const positive = entry.amount >= 0;
                  return (
                    <tr
                      key={entry._id}
                      style={{ borderTop: `1px solid ${theme.divider}` }}
                    >
                      <td
                        className="whitespace-nowrap px-4 py-2.5 font-mono text-[11px]"
                        style={{ color: theme.muted }}
                      >
                        {new Date(entry.createdAt).toLocaleDateString(undefined, {
                          day: "2-digit",
                          month: "short",
                          year: "2-digit",
                        })}
                      </td>
                      <td className="max-w-[320px] truncate px-4 py-2.5 text-xs">
                        {entry.description}
                      </td>
                      <td
                        className="px-4 py-2.5 text-[11px] capitalize"
                        style={{ color: theme.muted }}
                      >
                        {entry.type.replace(/_/g, " ")}
                      </td>
                      <td
                        className="whitespace-nowrap px-4 py-2.5 text-right font-mono text-xs font-medium"
                        style={{
                          color: positive ? theme.primary : "#b91c1c",
                        }}
                      >
                        {positive ? "+" : "−"}
                        {money(Math.abs(entry.amount), tenant.currency)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Mobile list */}
            <ul className="sm:hidden">
              {rows.map((entry, index) => {
                const positive = entry.amount >= 0;
                return (
                  <li
                    key={entry._id}
                    className="flex items-center gap-3 px-4 py-3"
                    style={{
                      borderTop:
                        index === 0
                          ? "none"
                          : `1px solid ${theme.divider}`,
                    }}
                  >
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                      style={{
                        background: positive
                          ? `rgba(${hexToRgb(theme.primary)},0.12)`
                          : "rgba(239,68,68,0.10)",
                        color: positive
                          ? theme.primary
                          : "#b91c1c",
                      }}
                    >
                      {positive ? (
                        <ArrowDownLeft className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">
                        {entry.description}
                      </p>
                      <p
                        className="text-[10px]"
                        style={{ color: theme.muted }}
                      >
                        {new Date(entry.createdAt).toLocaleDateString()} · {
                          entry.type.replace(/_/g, " ")
                        }
                      </p>
                    </div>
                    <span
                      className="shrink-0 font-mono text-xs"
                      style={{
                        color: positive
                          ? theme.primary
                          : "#b91c1c",
                      }}
                    >
                      {positive ? "+" : "−"}
                      {money(Math.abs(entry.amount), tenant.currency)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

function hexToRgb(hex: string): string {
  const m = /^#?([a-f\d]{3})$|^#?([a-f\d]{6})$/i.exec(hex);
  if (!m) return "16,185,129";
  const full = m[2] || m[1]!
    .split("")
    .map((c) => c + c)
    .join("");
  const n = parseInt(full, 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255}${n & 255}`;
}

