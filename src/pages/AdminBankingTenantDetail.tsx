import { useParams, Link } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";
import { toast } from "sonner";
import {
  type LucideProps,
  ShieldCheck,
  Activity,
  Users,
  CreditCard,
  Lock,
  Unlock,
  Pause,
  FileText,
  DollarSign,
  Landmark,
  Paintbrush,
  Palette,
  Check,
  MonitorSmartphone,
  LayoutDashboard,
  Sun,
  Moon,
  ExternalLink,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { AdminEmpty, StatusBadge, AdminSkeleton, fmtDate } from "@/components/admin/shared";
import { cn } from "@/lib/utils";
import { SparklineGrid } from "@/components/motion";
import { Settings } from "lucide-react";

function Money({ minor, currency = "USD" }: { minor: number; currency?: string }) {
  const sym =
    currency === "USD"
      ? "$"
      : currency === "GBP"
        ? "£"
        : currency === "EUR"
          ? "€"
          : currency + " ";
  return <>{sym}{(minor / 100).toFixed(2)}</>;
}

/**
 * Declared at module scope on purpose.
 *
 * This used to be defined inside the page component, which makes React see a
 * brand-new component type on every render — each keystroke or refetch tore
 * the five tab buttons down and rebuilt them (losing focus along the way).
 * Hoisted here, the type is stable and the props carry what the closure used
 * to capture.
 */
function TenantNavItem({
  active,
  onClick,
  label,
  icon: Icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ComponentType<LucideProps>;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={
        `inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ` +
        (active
          ? "bg-slate-900 text-white"
          : "text-slate-600 hover:bg-slate-100 dark:text-slate-300")
      }
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

export default function AdminBankingTenantDetail() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const id = tenantId as Id<"tenantSites">;
  const tenant = useQuery(api.bankingTenant.getTenantForAdmin, { tenantId: id });
  const fee = useQuery(api.bankingTenant.getBankingFeeConfig, { tenantId: id });
  const [history, setHistory] = useState<any>(null);
  const hist = useQuery(api.bankingCustomer.adminTenantHistory, tenantId ? { tenantId: id, limit: 50 } : "skip") as any;
  const [tab, setTab] = useState<"overview" | "customers" | "transfers" | "design" | "settings">("overview");
  const [busy, setBusy] = useState(false);
  const setLifecycle = useMutation(api.bankingTenant.setTenantLifecycle);
  const update = useMutation(api.bankingTenant.updateBankingTenant);
  const [reason, setReason] = useState("");

  // Design kits: each template themes both surfaces this tenant gets — the
  // customer banking app and its admin console — so a rebrand is one action.
  const templates = useQuery(api.bankingTenant.listTemplates);
  const applyTemplate = useMutation(api.bankingTenant.applyBankingTemplateToTenant);
  const [applyDefaults, setApplyDefaults] = useState(false);
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);

  const [feeForm, setFeeForm] = useState({ transferFeeMinor: "", withdrawalFeeMinor: "", perTransactionLimitMinor: "", dailyTransferLimitMinor: "", dailyWithdrawalLimitMinor: "", minTransactionMinor: "" });

  if (tenant === undefined) return <div className="p-8"><div className="animate-pulse text-slate-400">Loading…</div></div>;
  if (!tenant) return <div className="p-8 text-sm text-red-600">Tenant not found.</div>;

  const lifecycle = (tenant as any).lifecycleStatus ?? (tenant.isActive ? "active" : "disabled");
  const currency = (tenant as any).currency ?? "USD";

  const transferList: any[] = hist?.transfers ?? [];
  const depositList: any[] = hist?.deposits ?? [];
  const withdrawList: any[] = hist?.withdrawals ?? [];

  const lifecycleBtn: Record<string, { label: string; next: string; hint: string; icon: any; variant: "primary" | "danger" | "muted" }> = {
    active: { label: "Active", next: "suspended", hint: "Suspend — prevent transactions; preserve history", icon: Pause, variant: "primary" },
    suspended: { label: "Suspended", next: "active", hint: "Restore — re-enable transactions on the preserved ledger", icon: Unlock, variant: "primary" },
    disabled: { label: "Disabled", next: "active", hint: "Re-enable the tenant", icon: Unlock, variant: "primary" },
    draft: { label: "Draft", next: "active", hint: "Activate tenant", icon: Unlock, variant: "primary" },
    archived: { label: "Archived", next: "active", hint: "Restore from archive", icon: Unlock, variant: "muted" },
  };
  const lc = lifecycleBtn[lifecycle] ?? lifecycleBtn.active;

  const doLifecycle = async () => {
    if (!reason.trim()) { toast.error("Provide a reason"); return; }
    setBusy(true);
    try {
      await setLifecycle({ tenantId: id, status: lc.next, reason: reason.trim() });
      toast.success(`${tenant.siteName}: ${lifecycle} → ${lc.next}`);
      setReason("");
    } catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };

  const saveFees = async () => {
    setBusy(true);
    try {
      const pick = (s: string, fallback?: number) => s.trim() === "" ? undefined : Number(s);
      await update({
        tenantId: id,
        feeConfig: {
          transferFeeMinor: pick(feeForm.transferFeeMinor),
          withdrawalFeeMinor: pick(feeForm.withdrawalFeeMinor),
          perTransactionLimitMinor: pick(feeForm.perTransactionLimitMinor),
          dailyTransferLimitMinor: pick(feeForm.dailyTransferLimitMinor),
          dailyWithdrawalLimitMinor: pick(feeForm.dailyWithdrawalLimitMinor),
          minTransactionMinor: pick(feeForm.minTransactionMinor),
        } as any,
      });
      toast.success("Fees & limits saved (audited; snapshotted per transaction)");
      setFeeForm({ transferFeeMinor: "", withdrawalFeeMinor: "", perTransactionLimitMinor: "", dailyTransferLimitMinor: "", dailyWithdrawalLimitMinor: "", minTransactionMinor: "" });
    } catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };

  const activeKit: string = (tenant as any)?.branding?.templateSlug ?? "";
  const doApplyTemplate = async (slug: string) => {
    setBusy(true);
    setPendingSlug(slug);
    try {
      const r = await applyTemplate({ tenantId: id, templateSlug: slug, applyOperatingDefaults: applyDefaults });
      toast.success(`${r.template.name} kit applied to ${tenant.siteName}`);
    } catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); setPendingSlug(null); }
  };

  const statusBadge = tenant.isActive ? "active" : "locked";

  const tabItems: Array<{
    value: typeof tab;
    label: string;
    Icon: React.ComponentType<{ className?: string }>;
  }> = [
    { value: "overview", label: "Overview", Icon: Activity },
    { value: "customers", label: "Customers & accounts", Icon: Users },
    { value: "transfers", label: "Transactions", Icon: CreditCard },
    { value: "design", label: "Design kit", Icon: Palette },
    { value: "settings", label: "Settings & fees", Icon: Paintbrush },
  ];

  return (
    <div className="space-y-8">
      <div className="cloudie-page-header">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-navy text-navy-foreground"
            >
              <Landmark className="size-4" />
            </span>
            <h1 className="cloudie-page-title">
              {tenant.siteName}
            </h1>
            <StatusBadge status={statusBadge} />
            {currency && (
              <span className="cloudie-badge cloudie-badge-muted">
                {currency}
              </span>
            )}
          </div>
          <p className="cloudie-page-sub">
            {(tenant as any).displayName ?? tenant.siteName} ·{" "}
            {(tenant as any).subdomain}.g0ki.com ·{" "}
            {(tenant as any).country}
            {(tenant as any).plan ? ` · ${(tenant as any).plan}` : ""}
          </p>
          <p className="text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <DollarSign className="size-3" />
            </span>
            Fee config is snapshotted per transaction; historical transactions
            remain explainable after fee changes.
          </p>
        </div>

        <div className="cloudie-page-toolbar">
          <Link to={`/admin/tenants/${id}/banking/settings`}>
            <Button variant="outline" className="gap-2">
              <Settings className="size-4" />
              Banking settings
            </Button>
          </Link>
          <Link to="/admin/tenants/new">
            <Button variant="ghost">New banking tenant</Button>
          </Link>
        </div>
      </div>

      {/* KPI strip */}
      <div className="cloudie-kpi-grid">
        <div className="cloudie-kpi">
          <div className="flex items-center justify-between">
            <span className="cloudie-kpi-label">Lifecycle</span>
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-lg"
              style={{ color: "var(--cloudie-chart-1)" }}
            >
              <ShieldCheck className="size-4" />
            </span>
          </div>
          <span className="cloudie-kpi-value">{lifecycle}</span>
          <span className="cloudie-kpi-delta">
            {tenant.isActive ? "Live" : "Restricted"}
          </span>
        </div>

        <div className="cloudie-kpi">
          <div className="flex items-center justify-between">
            <span className="cloudie-kpi-label">Recent transfers</span>
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-lg"
              style={{ color: "var(--cloudie-chart-3)" }}
            >
              <CreditCard className="size-4" />
            </span>
          </div>
          <span className="cloudie-kpi-value">
            {transferList.length.toLocaleString()}
          </span>
          <span className="cloudie-kpi-delta">
            last 50 records
          </span>
        </div>

        <div className="cloudie-kpi">
          <div className="flex items-center justify-between">
            <span className="cloudie-kpi-label">Deposits</span>
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-lg"
              style={{ color: "var(--cloudie-chart-2)" }}
            >
              <DollarSign className="size-4" />
            </span>
          </div>
          <span className="cloudie-kpi-value">
            {depositList.length.toLocaleString()}
          </span>
          <span className="cloudie-kpi-delta">
            {depositList.length > 0
              ? `${depositList.filter((d) => (d as any).status === "completed").length} completed`
              : "No records"}
          </span>
        </div>

        <div className="cloudie-kpi">
          <div className="flex items-center justify-between">
            <span className="cloudie-kpi-label">Withdrawals</span>
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-lg"
              style={{ color: "var(--cloudie-chart-5)" }}
            >
              <Lock className="size-4" />
            </span>
          </div>
          <span className="cloudie-kpi-value">
            {withdrawList.length.toLocaleString()}
          </span>
          <span className="cloudie-kpi-delta">
            {withdrawList.length > 0
              ? `${withdrawList.filter((w) => (w as any).status === "completed").length} completed`
              : "No records"}
          </span>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 flex-wrap">
        {tabItems.map((item) => (
          <TenantNavItem
            key={item.value}
            active={tab === item.value}
            onClick={() => setTab(item.value)}
            label={item.label}
            icon={item.Icon}
          />
        ))}
      </div>

      {tab === "overview" && (
        <>
          <Card className="cloudie-table-card overflow-hidden">
            <CardHeader className="border-b border-cloudie-border bg-cloudie-muted/30 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Tenant health</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Current lifecycle, activity snapshot, and fee configuration.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-cloudie-border bg-cloudie-panel p-4">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="mt-1 font-semibold">
                    {lifecycle}
                    {tenant.isActive ? " · active" : " · locked"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {(tenant as any).lifecycleStatus ? (
                      <span className="font-mono">
                        lifecycleStatus={lifecycle}
                      </span>
                    ) : null}
                    {(tenant as any).bankingEnabled ? (
                      <span className="ml-2 font-mono">
                        bankingEnabled
                      </span>
                    ) : null}
                  </p>
                </div>

                <div className="rounded-xl border border-cloudie-border bg-cloudie-panel p-4">
                  <p className="text-xs text-muted-foreground">
                    Transfers / deposits / withdrawals
                  </p>
                  <p className="mt-1 font-mono text-sm">
                    {transferList.length} / {depositList.length} /
                    {withdrawList.length}
                  </p>
                </div>

                <div className="rounded-xl border border-cloudie-border bg-cloudie-panel p-4">
                  <p className="text-xs text-muted-foreground">Fee config</p>
                  <p className="mt-1 text-xs">
                    {fee
                      ? `${fee.transferFeeMinor}c transfer · ${fee.withdrawalFeeMinor}c withdrawal · perTx ${(fee as any).perTransactionLimitMinor ?? "—"}`
                      : "default (0)"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cloudie-table-card overflow-hidden">
            <CardHeader className="border-b border-cloudie-border bg-cloudie-muted/30 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Lifecycle controls</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    When disabled or suspended: transactions are blocked, ledger
                    and audit history are preserved, and existing data is never
                    deleted. Restoration is safe and history stays browseable
                    here.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center gap-2">
                  <Input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Reason (required)"
                    className="flex-1"
                  />
                  <Button
                    disabled={busy || !reason.trim()}
                    variant={lifecycle === "active" ? "destructive" : "default"}
                    className="gap-2"
                    onClick={doLifecycle}
                  >
                    <lc.icon className="size-4" />
                    {lifecycle === "active"
                      ? "Suspend tenant"
                      : lifecycle === "suspended"
                        ? "Restore tenant"
                        : `Set ${lc.next}`}
                  </Button>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ArrowRight className="size-3" />
                  Next: {lc.next} — {lc.hint}
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {tab === "customers" && (
        <div className="space-y-4">
          <Card className="cloudie-table-card overflow-hidden">
            <CardHeader className="border-b border-cloudie-border bg-cloudie-muted/30 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Members</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    First 50 tenant members.
                  </p>
                </div>
                <Users className="size-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <TenantMembers tenantId={id} />
            </CardContent>
          </Card>

          <Card className="cloudie-table-card overflow-hidden">
            <CardHeader className="border-b border-cloudie-border bg-cloudie-muted/30 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">KYC</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Most recent 50 KYC submissions.
                  </p>
                </div>
                <FileText className="size-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <TenantKyc tenantId={id} />
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "transfers" && (
        <Card className="cloudie-table-card overflow-hidden">
          <CardHeader className="border-b border-cloudie-border bg-cloudie-muted/30 p-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Activity</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Deposits, transfers, and withdrawals — last 50 records.
                </p>
              </div>
              <CreditCard className="size-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {!hist ? (
              <div className="rounded-2xl border border-cloudie-border bg-cloudie-muted/30 p-6">
                <div className="cloudie-skeleton-stack">
                  <span className="cloudie-skeleton cloudie-skeleton-wide" />
                  <span className="cloudie-skeleton cloudie-skeleton-medium" />
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">
                    Transfers
                  </p>
                  <div className="mt-2 space-y-1">
                    {transferList.length === 0 ? (
                      <div className="py-6 text-center text-sm text-muted-foreground">
                        No transfers yet
                      </div>
                    ) : (
                      transferList.map((t: any) => (
                        <div
                          key={t._id}
                          className="flex items-center gap-3 py-2.5 border-b border-cloudie-border last:border-0"
                        >
                          <span className="font-mono text-xs rounded-full bg-cloudie-muted px-2 py-1">
                            {t.reference}
                          </span>
                          <StatusBadge
                            status={t.status === "completed"
                              ? "completed"
                              : t.status === "failed"
                                ? "failed"
                              : "pending"}
                          />
                          <span className="flex-1 min-w-0">
                            <Money
                              minor={t.amountMinor}
                              currency={t.currency}
                            />
                            {t.feeMinor ? (
                              <span className="text-xs text-muted-foreground">
                                " + fee "
                                <Money
                                  minor={t.feeMinor}
                                  currency={t.currency}
                                />
                              </span>
                            ) : null}
                          </span>
                          <span className="text-xs text-muted-foreground hidden sm:block">
                            {fmtDate(t.createdAt)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">
                      Deposits
                    </p>
                    <div className="mt-2 space-y-1">
                      {depositList.length === 0 ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                          —
                        </div>
                      ) : (
                        depositList.map((d: any) => (
                          <div
                            key={d._id}
                            className="flex items-center gap-2 py-2 border-b border-cloudie-border last:border-0 text-sm font-mono"
                          >
                            <span>{d.reference}</span>
                            <StatusBadge
                              status={d.status === "completed"
                                ? "completed"
                                : "pending"}
                            />
                            <span className="ml-auto">
                              <Money
                                minor={d.amountMinor}
                                currency={d.currency}
                              />
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">
                      Withdrawals
                    </p>
                    <div className="mt-2 space-y-1">
                      {withdrawList.length === 0 ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                          —
                        </div>
                      ) : (
                        withdrawList.map((w: any) => (
                          <div
                            key={w._id}
                            className="flex items-center gap-2 py-2 border-b border-cloudie-border last:border-0 text-sm font-mono"
                          >
                            <span>{w.reference}</span>
                            <StatusBadge
                              status={w.status === "completed"
                                ? "completed"
                                : "pending"}
                            />
                            <span className="ml-auto">
                              <Money
                                minor={w.amountMinor}
                                currency={w.currency}
                              />
                              {w.feeMinor ? (
                                <>
                                  " + "
                                  <Money
                                    minor={w.feeMinor}
                                    currency={w.currency}
                                  />
                                </>
                              ) : null}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "design" && (
        <div className="space-y-4">
          <Card className="cloudie-table-card overflow-hidden">
            <CardHeader className="border-b border-cloudie-border bg-cloudie-muted/30 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Palette className="size-4 text-electric" />
                    Banking design kit
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    A kit themes both surfaces this tenant gets — the customer
                    banking app and its admin console — and can pull the template’s
                    operating defaults (plan, region, support contacts).
                    Applied changes are audited.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    to={`/site/${id}/banking`}
                    className="inline-flex items-center gap-1 text-xs rounded-full border border-cloudie-border px-3 py-1.5 text-muted-foreground hover:bg-cloudie-muted/40"
                  >
                    <MonitorSmartphone className="size-3.5" />
                    Preview customer app
                  </Link>
                  <Link
                    to={`/site/${id}/admin`}
                    className="inline-flex items-center gap-1 text-xs rounded-full border border-cloudie-border px-3 py-1.5 text-muted-foreground hover:bg-cloudie-muted/40"
                  >
                    <LayoutDashboard className="size-3.5" />
                    Preview console
                  </Link>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <label className="inline-flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={applyDefaults}
                  onChange={(e) => setApplyDefaults(e.target.checked)}
                />
                Also apply the template’s operating defaults (plan, country,
                timezone, support email)
              </label>
            </CardContent>
          </Card>

          {templates === undefined ? (
            <Card className="cloudie-table-card overflow-hidden">
              <CardContent className="p-6">
                <div className="cloudie-skeleton-stack">
                  <span className="cloudie-skeleton cloudie-skeleton-wide" />
                  <span className="cloudie-skeleton cloudie-skeleton-medium" />
                </div>
              </CardContent>
            </Card>
          ) : templates.length === 0 ? (
            <Card className="cloudie-table-card overflow-hidden">
              <CardContent className="p-6">
                <AdminEmpty
                  message="No design kits loaded yet."
                  hint="Load them from New banking tenant."
                />
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {templates.map((tpl: any) => {
                const applied = activeKit === tpl.slug;
                const isDark = tpl.themeMode === "dark";
                return (
                  <Card
                    key={tpl._id}
                    className={cn(
                      "cloudie-table-card overflow-hidden transition border",
                      applied
                        ? "border-cloudie-ring"
                        : "border-cloudie-border",
                    )}
                  >
                    <div className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold truncate">
                              {tpl.name}
                            </span>
                            {applied && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-success/10 border border-success/30 px-2 py-0.5 text-[10px] font-semibold text-success">
                                <Check className="size-3" />
                                Applied
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">
                            {tpl.description}
                          </p>
                        </div>
                        <span className="shrink-0 inline-flex items-center gap-1 rounded-full border border-cloudie-border bg-cloudie-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                          {isDark ? (
                            <Moon className="size-3" />
                          ) : (
                            <Sun className="size-3" />
                          )}{" "}
                          {isDark ? "Dark" : "Light"}
                        </span>
                      </div>

                      <div className="grid gap-2 text-[11px] sm:grid-cols-2">
                        <div className="rounded-xl bg-cloudie-muted/40 p-2.5">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Customer app
                          </p>
                          <p className="mt-0.5 text-sm">
                            {tpl.customerAppStyle}
                          </p>
                        </div>
                        <div className="rounded-xl bg-cloudie-muted/40 p-2.5">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Admin console
                          </p>
                          <p className="mt-0.5 text-sm">
                            {tpl.adminConsoleStyle}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {[tpl.primaryColor, tpl.accentColor, tpl.surfaceColor]
                          .filter(Boolean)
                          .map((c: string, i: number) => (
                            <span
                              key={i}
                              className="h-4 w-4 rounded-full border border-border"
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        <span className="text-[10px] text-muted-foreground">
                          {tpl.currency} · radius {tpl.radius}
                        </span>
                        <Button
                          disabled={busy || applied}
                          size="sm"
                          className="ml-auto gap-1.5"
                          onClick={() => doApplyTemplate(tpl.slug)}
                        >
                          {pendingSlug === tpl.slug ? (
                            "Applying…"
                          ) : applied ? (
                            "Applied"
                          ) : (
                            "Apply kit"
                          )}
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <ExternalLink className="size-3" />
            Applying a kit never deletes tenant data — it restyles both
            surfaces and is recorded in the audit log.
          </p>
        </div>
      )}

      {tab === "settings" && (
        <Card className="cloudie-table-card overflow-hidden">
          <CardHeader className="border-b border-cloudie-border bg-cloudie-muted/30 p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="size-4 text-electric" />
              <CardTitle className="text-base">Fees, limits & branding</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1.5 text-sm">
                  <span className="font-medium">Transfer fee (cents/minor)</span>
                  <Input
                    type="number"
                    value={feeForm.transferFeeMinor}
                    onChange={(e) =>
                      setFeeForm({
                        ...feeForm,
                        transferFeeMinor: e.target.value,
                      })
                    }
                    placeholder={fee ? String(fee.transferFeeMinor) : "0"}
                  />
                </label>
                <label className="space-y-1.5 text-sm">
                  <span className="font-medium">Withdrawal fee (minor)</span>
                  <Input
                    type="number"
                    value={feeForm.withdrawalFeeMinor}
                    onChange={(e) =>
                      setFeeForm({
                        ...feeForm,
                        withdrawalFeeMinor: e.target.value,
                      })
                    }
                    placeholder={fee ? String(fee.withdrawalFeeMinor) : "0"}
                  />
                </label>
                <label className="space-y-1.5 text-sm">
                  <span className="font-medium">Per-transaction max (minor)</span>
                  <Input
                    type="number"
                    value={feeForm.perTransactionLimitMinor}
                    onChange={(e) =>
                      setFeeForm({
                        ...feeForm,
                        perTransactionLimitMinor: e.target.value,
                      })
                    }
                    placeholder={(fee as any)?.perTransactionLimitMinor ?? ""}
                  />
                </label>
                <label className="space-y-1.5 text-sm">
                  <span className="font-medium">Min transaction (minor)</span>
                  <Input
                    type="number"
                    value={feeForm.minTransactionMinor}
                    onChange={(e) =>
                      setFeeForm({
                        ...feeForm,
                        minTransactionMinor: e.target.value,
                      })
                    }
                  />
                </label>
                <label className="space-y-1.5 text-sm">
                  <span className="font-medium">Daily transfer limit (minor)</span>
                  <Input
                    type="number"
                    value={feeForm.dailyTransferLimitMinor}
                    onChange={(e) =>
                      setFeeForm({
                        ...feeForm,
                        dailyTransferLimitMinor: e.target.value,
                      })
                    }
                  />
                </label>
                <label className="space-y-1.5 text-sm">
                  <span className="font-medium">Daily withdrawal limit (minor)</span>
                  <Input
                    type="number"
                    value={feeForm.dailyWithdrawalLimitMinor}
                    onChange={(e) =>
                      setFeeForm({
                        ...feeForm,
                        dailyWithdrawalLimitMinor: e.target.value,
                      })
                    }
                  />
                </label>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  disabled={busy}
                  variant="default"
                  className="gap-2"
                  onClick={saveFees}
                >
                  Save fees & limits (audited)
                </Button>
                <p className="text-xs text-muted-foreground">
                  Current: transfer {fee?.transferFeeMinor ?? 0}c · withdrawal{" "}
                  {fee?.withdrawalFeeMinor ?? 0}c · perTx{" "}
                  {(fee as any)?.perTransactionLimitMinor ?? "∅"} · dailyTx{" "}
                  {(fee as any)?.dailyTransferLimitMinor ?? "∅"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TenantMembers({ tenantId }: { tenantId: Id<"tenantSites"> }) {
  const members = useQuery(api.tenants.listTenantUsers, { tenantId });
  if (members === undefined) return <div className="text-sm text-slate-400 animate-pulse">Loading…</div>;
  if (!members?.length) return <div className="text-sm text-slate-400">No members yet.</div>;
  return <ul className="divide-y divide-slate-100 dark:divide-slate-800">
    {members.slice(0, 50).map((m: any) => (
      <li key={m._id} className="py-2 flex items-center gap-3 text-sm"><span className="font-medium">{m.name ?? m.email ?? m.userId.slice(0, 8)}</span><span className="text-slate-500">{m.email}</span><span className="ml-auto text-xs rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5">{m.role}</span></li>
    ))}
  </ul>;
}

function TenantKyc({ tenantId }: { tenantId: Id<"tenantSites"> }) {
  const rows = useQuery(api.tenants.listKyc, { tenantId });
  if (rows === undefined) return <div className="text-sm text-slate-400 animate-pulse">Loading…</div>;
  if (!rows?.length) return <div className="text-sm text-slate-400">No KYC submissions.</div>;
  return <ul className="divide-y divide-slate-100 dark:divide-slate-800">
    {rows.slice(0, 50).map((r: any) => (
      <li key={r._id} className="py-2 flex items-center gap-3 text-sm"><span className="font-medium">{r.fullName}</span><span className={`text-xs rounded-full px-2 py-0.5 ${r.status === "approved" ? "bg-emerald-50 text-emerald-700" : r.status === "rejected" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>{r.status}</span><span className="ml-auto text-xs text-slate-500">{fmtDate(r.createdAt)}</span></li>
    ))}
  </ul>;
}
