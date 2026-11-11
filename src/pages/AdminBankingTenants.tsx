import { Link } from "react-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Landmark, Plus, Search, Building2, Check, X, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdminPageHeader, StatusBadge, AdminEmpty, AdminSkeleton } from "@/components/admin/shared";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SparklineGrid } from "@/components/motion";

export default function AdminBankingTenants() {
  const [lifecycle, setLifecycle] = useState<string>("");
  const [search, setSearch] = useState("");
  const rows = useQuery(api.bankingTenant.listBankingTenants, {
    limit: 200,
    lifecycle: lifecycle || undefined,
    search: search || undefined,
  });

  const activeCount = rows?.filter((r) => (r as any).isActive !== false).length ?? 0;
  const draftCount = rows?.filter((r) => (r as any).lifecycleStatus === "draft").length ?? 0;
  const archivedCount = rows?.filter((r) => (r as any).lifecycleStatus === "archived").length ?? 0;

  const lifecycleLabel = (r: any) =>
    (r as any).lifecycleStatus ??
    (r.isActive ? "active" : "disabled");

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Banking tenants"
        description="Ledger-backed tenants with accounts, transfers, deposits, withdrawals, KYC and statements."
        actions={
          <Link to="/admin/tenants/new">
            <Button className="gap-2">
              <Plus className="size-4" />
              New banking tenant
            </Button>
          </Link>
        }
      />

      {/* KPI strip */}
      <div className="cloudie-kpi-grid">
        <div className="cloudie-kpi">
          <div className="flex items-center justify-between">
            <span className="cloudie-kpi-label">Total banking tenants</span>
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-lg"
              style={{ color: "var(--cloudie-chart-1)" }}
            >
              <Building2 className="size-4" />
            </span>
          </div>
          <span className="cloudie-kpi-value">
            {rows?.length.toLocaleString() ?? "—"}
          </span>
          <span className="cloudie-kpi-delta">
            {(rows ?? []).length.toLocaleString()} provisioned
          </span>
        </div>

        <div className="cloudie-kpi">
          <div className="flex items-center justify-between">
            <span className="cloudie-kpi-label">Active</span>
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-lg"
              style={{ color: "var(--cloudie-chart-2)" }}
            >
              <Check className="size-4" />
            </span>
          </div>
          <span className="cloudie-kpi-value">{activeCount.toLocaleString()}</span>
          <span className="cloudie-kpi-delta">
            {(rows?.length ?? 0) > 0
              ? Math.round((activeCount / (rows?.length ?? 1)) * 100)
              : 0}{"% active"}
          </span>
        </div>

        <div className="cloudie-kpi">
          <div className="flex items-center justify-between">
            <span className="cloudie-kpi-label">Draft</span>
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-lg"
              style={{ color: "var(--cloudie-chart-4)" }}
            >
              <AlertTriangle className="size-4" />
            </span>
          </div>
          <span className="cloudie-kpi-value">{draftCount.toLocaleString()}</span>
          {draftCount > 0 && (
            <span className="cloudie-badge cloudie-badge-warning">
              Pending activation
            </span>
          )}
        </div>

        <div className="cloudie-kpi">
          <div className="flex items-center justify-between">
            <span className="cloudie-kpi-label">Archived</span>
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-lg"
              style={{ color: "var(--cloudie-chart-5)" }}
            >
              <X className="size-4" />
            </span>
          </div>
          <span className="cloudie-kpi-value">{archivedCount.toLocaleString()}</span>
          {archivedCount > 0 && (
            <span className="cloudie-badge cloudie-badge-muted">
              Standby
            </span>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, subdomain or display name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={lifecycle} onValueChange={setLifecycle}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="All lifecycles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All lifecycles</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="disabled">Disabled</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {rows === undefined ? (
        <Card className="cloudie-table-card overflow-hidden">
          <CardContent className="p-4">
            <div className="cloudie-skeleton-stack">
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "cloudie-skeleton",
                    i % 2 === 0 ? "cloudie-skeleton-wide" : "cloudie-skeleton-medium",
                  )}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : rows.length === 0 ? (
        <Card className="cloudie-table-card overflow-hidden">
          <CardContent className="p-6">
            <AdminEmpty
              message="No banking tenants yet."
              hint="Create the first one to start provisioning ledger-backed tenants."
            />
          </CardContent>
        </Card>
      ) : (
        <Card className="cloudie-table-card overflow-hidden">
          <div className="cloudie-table-scroll">
            <table className="cloudie-table">
              <thead>
                <tr>
                  <th className="w-[30%]">Tenant</th>
                  <th className="w-[16%]">Lifecycle</th>
                  <th className="w-[12%]">Currency</th>
                  <th className="w-[16%]">Plan</th>
                  <th className="w-[26%]">Domain</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any) => {
                  const label = lifecycleLabel(r);
                  return (
                    <tr key={r._id}>
                      <td>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            {r.siteName}
                          </p>
                          {(r as any).displayName &&
                            r.displayName !== r.siteName && (
                              <p className="truncate text-xs text-muted-foreground">
                                {(r as any).displayName}
                              </p>
                            )}
                        </div>
                      </td>
                      <td>
                        <StatusBadge status={label} />
                      </td>
                      <td className="text-sm text-muted-foreground">
                        {(r as any).currency ?? "USD"}
                      </td>
                      <td className="text-sm text-muted-foreground">
                        {(r as any).plan ??
                          (label === "active"
                            ? "—"
                            : "—")}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono text-muted-foreground">
                            {r.subdomain}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            .g0ki.com
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
