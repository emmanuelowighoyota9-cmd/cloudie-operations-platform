import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Ban,
  Flag,
  Lock,
  LockOpen,
  Search,
  ShieldAlert,
  AlertTriangle,
  Eye,
  Check,
  MoreHorizontal,
  EyeOff,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  AdminPageHeader,
  StatusBadge,
  AdminEmpty,
  AdminSkeleton,
  ConfirmDialog,
  fmtDate,
} from "@/components/admin/shared";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SparklineGrid } from "@/components/motion";

export default function AdminTenants() {
  const tenants = useQuery(api.tenants.adminList, { limit: 300 });
  const flags = useQuery(api.adminApi.listModerationFlags, { limit: 100 });
  const lockdown = useMutation(api.tenants.adminLockdown);
  const unlock = useMutation(api.adminApi.unlockTenant);
  const createFlag = useMutation(api.adminApi.createModerationFlag);
  const reviewFlag = useMutation(api.adminApi.reviewModerationFlag);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [locking, setLocking] = useState<null | { id: string; name: string }>(null);
  const [unlocking, setUnlocking] = useState<null | { id: string; name: string }>(null);
  const [flagging, setFlagging] = useState<null | { id: string; name: string }>(null);
  const [flagRule, setFlagRule] = useState("");
  const [flagSeverity, setFlagSeverity] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [flagDetails, setFlagDetails] = useState("");
  const [reviewingFlag, setReviewingFlag] = useState<null | { id: string; rule: string }>(null);
  const [reviewStatus, setReviewStatus] = useState<"resolved" | "dismissed">("resolved");
  const [reviewNotes, setReviewNotes] = useState("");

  const tenantName = (id: string) => (tenants ?? []).find((t) => t._id === id)?.siteName ?? "Tenant";

  const filtered = useMemo(() => {
    if (!tenants) return undefined;
    let list = [...tenants];
    if (statusFilter === "active") list = list.filter((t) => t.isActive);
    if (statusFilter === "locked") list = list.filter((t) => !t.isActive);
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.siteName.toLowerCase().includes(s) ||
          t.subdomain.toLowerCase().includes(s),
      );
    }
    return list;
  }, [tenants, search, statusFilter]);

  const submitFlag = async () => {
    if (!flagging || !flagRule.trim()) {
      toast.error("Rule name is required");
      return;
    }
    try {
      await createFlag({
        tenantId: flagging.id as never,
        rule: flagRule.trim(),
        severity: flagSeverity,
        details: flagDetails || undefined,
      });
      toast.success("Flag created");
      setFlagging(null);
      setFlagRule("");
      setFlagDetails("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Operation failed");
    }
  };

  const submitFlagReview = async () => {
    if (!reviewingFlag || reviewNotes.trim().length < 5) {
      toast.error("Review notes of at least 5 characters are required");
      return;
    }
    try {
      await reviewFlag({
        flagId: reviewingFlag.id as never,
        status: reviewStatus,
        reviewNotes: reviewNotes.trim(),
      });
      toast.success(`Flag ${reviewStatus}`);
      setReviewingFlag(null);
      setReviewNotes("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Operation failed");
    }
  };

  const activeCount = useMemo(
    () => (tenants ?? []).filter((t) => t.isActive).length,
    [tenants],
  );
  const lockedCount = useMemo(
    () => (tenants ?? []).filter((t) => !t.isActive).length,
    [tenants],
  );
  const flagCount = useMemo(
    () => (flags ?? []).filter((f) => f.status === "open").length,
    [flags],
  );

  const kpiSeries = (base: number) => {
    const v = base || 0;
    return [[v], [v], [v]];
  };

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Business tenant management"
        description="Global tenant oversight, moderation, and lockdown controls."
      />

      {/* KPI strip */}
      <div className="cloudie-kpi-grid">
        <div className="cloudie-kpi">
          <span className="cloudie-kpi-label">Total tenants</span>
          <span className="cloudie-kpi-value">
            {(tenants ?? []).length.toLocaleString()}
          </span>
          <span className="cloudie-kpi-delta">
            <span className="size-1.5 rounded-full bg-current opacity-60" />
            {(tenants ?? []).length.toLocaleString()} registered
          </span>
        </div>
        <div className="cloudie-kpi">
          <div className="flex items-center justify-between">
            <span className="cloudie-kpi-label">Active tenants</span>
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-lg"
              style={{ color: "var(--cloudie-chart-2)" }}
            >
              <Check className="size-4" />
            </span>
          </div>
          <span className="cloudie-kpi-value">{activeCount.toLocaleString()}</span>
          <span className="cloudie-kpi-delta">
            <span className="size-1.5 rounded-full bg-current opacity-60" />
            {(tenants ?? []).length > 0
              ? Math.round((activeCount / (tenants ?? []).length) * 100)
              : 0}{"% active"}
          </span>
        </div>
        <div className="cloudie-kpi">
          <div className="flex items-center justify-between">
            <span className="cloudie-kpi-label">Locked tenants</span>
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-lg"
              style={{ color: "var(--cloudie-chart-5)" }}
            >
              <EyeOff className="size-4" />
            </span>
          </div>
          <span className="cloudie-kpi-value">{lockedCount.toLocaleString()}</span>
          {lockedCount > 0 && (
            <span className="cloudie-badge cloudie-badge-warning">
              Requires review
            </span>
          )}
        </div>
        <div className="cloudie-kpi">
          <div className="flex items-center justify-between">
            <span className="cloudie-kpi-label">Open flags</span>
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-lg"
              style={{ color: "var(--cloudie-chart-4)" }}
            >
              <AlertTriangle className="size-4" />
            </span>
          </div>
          <span className="cloudie-kpi-value">{flagCount.toLocaleString()}</span>
          {flagCount > 0 ? (
            <span className="cloudie-badge cloudie-badge-warning">Pending review</span>
          ) : (
            <span className="cloudie-badge cloudie-badge-muted">None open</span>
          )}
        </div>
      </div>

      {/* Moderation flags */}
      <Card className="cloudie-table-card overflow-hidden">
        <CardHeader className="border-b border-cloudie-border bg-cloudie-muted/30 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-base">Moderation flags</CardTitle>
              <p className="text-xs text-muted-foreground">
                Rule-based flags on tenant sites. Automated rules assist review
                but are not guaranteed to detect all fraud or malicious activity.
              </p>
            </div>
            {flagCount > 0 && (
              <Badge variant="secondary" className="border-0 bg-warning text-warning">
                {flagCount} open
              </Badge>
            )}
          </div
        >
        </CardHeader>
        <CardContent className="p-4">
          {flags === undefined ? (
            <div className="cloudie-skeleton-stack">
              <span className="cloudie-skeleton cloudie-skeleton-wide" />
              <span className="cloudie-skeleton cloudie-skeleton-medium" />
            </div>
          ) : flags.length === 0 ? (
            <AdminEmpty
              message="No moderation flags open."
              hint="Flagged tenant sites will appear here for review."
            />
          ) : (
            <div className="space-y-2">
              {flags.map((f) => {
                const open = f.status === "open";
                return (
                  <div
                    key={f._id}
                    className={cn(
                      "flex flex-wrap items-center gap-3 rounded-xl border p-4 transition hover:border-cloudie-ring hover:bg-cloudie-muted/40",
                      open
                        ? "border-warning/40 bg-warning/5"
                        : "border-cloudie-border bg-cloudie-panel",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {tenantName(f.tenantId)} — {f.rule}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Severity: {f.severity}
                        {f.details ? ` · ${f.details}` : " · no details"}
                        {fmtDate(f.createdAt) != null && ` · ${fmtDate(f.createdAt)}`}
                      </p>
                    </div>
                    <StatusBadge status={f.status} />
                    {open && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setReviewingFlag({ id: f._id, rule: f.rule })
                        }
                      >
                        Review
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tenants by name or subdomain…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tenants</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="locked">Locked</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tenant table */}
      {filtered === undefined ? (
        <div className="cloudie-table-card overflow-hidden">
          <CardContent className="p-4">
            <div className="cloudie-skeleton-stack">
              {Array.from({ length: 6 }).map((_, i) => (
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
        </div>
      ) : filtered.length === 0 ? (
        <Card className="cloudie-table-card overflow-hidden">
          <CardContent className="p-6">
            <AdminEmpty
              message="No tenants match your filters."
              hint="Try clearing the search or changing the status filter."
            />
          </CardContent>
        </Card>
      ) : (
        <Card className="cloudie-table-card overflow-hidden">
          <div className="cloudie-table-scroll">
            <table className="cloudie-table">
              <thead>
                <tr>
                  <th className="w-[35%]">Tenant</th>
                  <th className="w-[18%]">Type</th>
                  <th className="w-[14%]">Status</th>
                  <th className="w-[14%]">Renews</th>
                  <th className="w-[19%]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t._id}>
                    <td>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {t.siteName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {t.subdomain}
                        </p>
                      </div>
                    </td>
                    <td className="text-sm text-muted-foreground">
                      {t.siteType}
                    </td>
                    <td>
                      <StatusBadge
                        status={t.isActive ? "active" : "locked"}
                      />
                    </td>
                    <td className="text-sm text-muted-foreground">
                      {fmtDate(t.renewalDate)}
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Actions for ${t.siteName}`}
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent align="end" className="w-48">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="w-full">
                                  <MoreHorizontal className="size-4" />
                                  Actions
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start" className="w-48">
                                {t.isActive ? (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => setLocking({ id: t._id, name: t.siteName })}
                                      className="text-red-600 focus:text-red-600"
                                    >
                                      <Lock className="mr-2 size-4" />
                                      Lock tenant
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => setFlagging({ id: t._id, name: t.siteName })}
                                    >
                                      <Flag className="mr-2 size-4 text-warning" />
                                      Flag for review
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem>
                                      <Eye className="mr-2 size-4" />
                                      View tenant
                                    </DropdownMenuItem>
                                  </>
                                ) : (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => setUnlocking({ id: t._id, name: t.siteName })}
                                      className="text-emerald-600 focus:text-emerald-600"
                                    >
                                      <LockOpen className="mr-2 size-4" />
                                      Unlock tenant
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem>
                                      <Eye className="mr-2 size-4" />
                                      View tenant
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Lock confirmation */}
      {locking && (
        <ConfirmDialog
          open
          onClose={() => setLocking(null)}
          onConfirm={async (reason) => {
            try {
              await lockdown({
                tenantId: locking.id as never,
                reason,
              });
              toast.success("Tenant locked down");
            } catch (e) {
              toast.error(
                e instanceof Error ? e.message : "Operation failed",
              );
              throw e;
            }
          }}
          title="One-click tenant lockdown"
          description="The public tenant site shows a maintenance page, tenant users cannot perform restricted operations, and existing data is preserved. Fully reversible via Unlock."
          resource={locking.name}
          actionLabel="Lock tenant"
        />
      )}

      {unlocking && (
        <ConfirmDialog
          open
          onClose={() => setUnlocking(null)}
          onConfirm={async (reason) => {
            try {
              await unlock({
                tenantId: unlocking.id as never,
                reason,
              });
              toast.success("Tenant unlocked");
            } catch (e) {
              toast.error(
                e instanceof Error ? e.message : "Operation failed",
              );
              throw e;
            }
          }}
          title="Unlock tenant"
          description="Restores public access and tenant operations."
          resource={unlocking.name}
          actionLabel="Unlock"
          destructive={false}
        />
      )}

      {/* Flag creation */}
      <Dialog
        open={!!flagging}
        onOpenChange={(o) => !o && setFlagging(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Flag tenant — {flagging?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="flag-rule">Rule / indicator</Label>
              <Input
                id="flag-rule"
                value={flagRule}
                onChange={(e) => setFlagRule(e.target.value)}
                placeholder="e.g. suspicious_content, domain_misuse"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Severity</Label>
              <Select
                value={flagSeverity}
                onValueChange={(v) =>
                  setFlagSeverity(v as typeof flagSeverity)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="flag-details">Details</Label>
              <Textarea
                id="flag-details"
                value={flagDetails}
                onChange={(e) => setFlagDetails(e.target.value)}
                rows={3}
                placeholder="What did you observe?"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFlagging(null)}>
              Cancel
            </Button>
            <Button onClick={submitFlag}>
              <Flag className="mr-1 h-4 w-4" />
              Create flag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Flag review */}
      <Dialog
        open={!!reviewingFlag}
        onOpenChange={(o) => !o && setReviewingFlag(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review flag — {reviewingFlag?.rule}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Outcome</Label>
              <Select
                value={reviewStatus}
                onValueChange={(v) =>
                  setReviewStatus(v as typeof reviewStatus)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="resolved">
                    Resolved (action taken)
                  </SelectItem>
                  <SelectItem value="dismissed">
                    Dismissed (false positive)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="review-notes">
                Review notes (required)
              </Label>
              <Textarea
                id="review-notes"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewingFlag(null)}>
              Cancel
            </Button>
            <Button onClick={submitFlagReview}>
              <Ban className="mr-1 h-4 w-4" />
              Submit review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
