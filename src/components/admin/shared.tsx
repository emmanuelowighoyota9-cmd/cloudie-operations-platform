import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Inbox, Loader2 } from "lucide-react";
import { useState, type ReactNode } from "react";

export function AdminPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="cloudie-page-header">
      <div className="min-w-0">
        <h1 className="cloudie-page-title">{title}</h1>
        {description && (
          <p className="cloudie-page-sub">{description}</p>
        )}
      </div>
      {actions && (
        <div className="cloudie-page-toolbar">{actions}</div>
      )}
    </div>
  );
}

/**
 * Stat tile tones.
 *
 * Icon tint reinforces the label; it never carries the meaning on its own.
 * The palette is the Cloudie navy/electric fintech set so the whole command
 * center reads as one product instead of four unrelated pages.
 */
const STAT_COLORS = {
  blue: "bg-info/12 text-info",
  green: "bg-success/12 text-success",
  amber: "bg-warning/12 text-warning",
  red: "bg-error/12 text-error",
  purple: "bg-cloudie-muted text-cloudie-muted-foreground",
  indigo: "bg-info/12 text-info",
} as const;

export function StatCard({
  title,
  value,
  icon: Icon,
  color = "blue",
  hint,
}: {
  title: string;
  value: number | string | undefined;
  icon: LucideIcon;
  color?: keyof typeof STAT_COLORS;
  hint?: string;
}) {
  return (
    <div className="cloudie-kpi">
      <span className="cloudie-kpi-label">{title}</span>
      {value === undefined ? (
        <span className="cloudie-skeleton cloudie-skeleton-short" aria-hidden />
      ) : (
        <span className="cloudie-kpi-value">
          {typeof value === "number" ? value.toLocaleString() : value}
        </span>
      )}
      {hint && <span className="cloudie-kpi-delta">{hint}</span>}
      <div className="mt-1.5 flex size-8 shrink-0 items-center justify-center rounded-lg sm:mt-2" style={{ color: "var(--cloudie-chart-1)" }}>
        <Icon className="size-4" />
      </div>
    </div>
  );
}

/**
 * Status tones on the enterprise palette.
 *
 * Four tones carry every record state: settled (green), in progress (amber),
 * blocked (red), moving (blue), and inert (grey). Each is a tinted chip with a
 * hairline of the same hue, so it reads on the black card surface without
 * shouting.
 */
const TONE = {
  settled: "cloudie-badge-success",
  progress: "cloudie-badge-warning",
  blocked: "cloudie-badge-error",
  moving: "cloudie-badge-info",
  inert: "cloudie-badge-muted",
} as const;

const BADGE_STYLES: Record<string, string> = {
  active: TONE.settled,
  approved: TONE.settled,
  verified: TONE.settled,
  completed: TONE.settled,
  delivered: TONE.settled,
  resolved: TONE.settled,
  dismissed: TONE.inert,
  closed: TONE.inert,
  pending: TONE.progress,
  under_review: TONE.progress,
  reviewing: TONE.progress,
  processing: TONE.progress,
  escrow: TONE.progress,
  more_information_required: TONE.progress,
  out_for_delivery: TONE.moving,
  in_transit: TONE.moving,
  picked_up: TONE.moving,
  open: TONE.blocked,
  rejected: TONE.blocked,
  suspended: TONE.blocked,
  refunded: TONE.progress,
  disputed: TONE.blocked,
  failed: TONE.blocked,
  cancelled: TONE.inert,
  draft: TONE.inert,
  // Tracking lifecycle states (shipment timelines, public tracker).
  created: TONE.inert,
  booked: TONE.progress,
  at_origin_facility: TONE.moving,
  departed_origin: TONE.moving,
  arrived_destination_country: TONE.moving,
  customs_clearance: TONE.progress,
  customs_cleared: TONE.progress,
  at_destination_facility: TONE.moving,
  delivery_attempted: TONE.blocked,
  exception: TONE.blocked,
  on_hold: TONE.blocked,
  returned: TONE.blocked,
};

/**
 * A status pill.
 *
 * The status NAME is always printed — colour is never the only signal, so the
 * badge still means something in greyscale, in a screenshot, and to a
 * colour-blind reader.
 */
export function StatusBadge({ status }: { status: string }) {
  const style = BADGE_STYLES[status] ?? TONE.inert;
  return (
    <span className={`cloudie-badge ${style}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

/**
 * Confirmation dialog for destructive admin actions. Requires a typed-free
 * reason (min length configurable) before the action button enables.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  resource,
  actionLabel,
  destructive = true,
  requireReason = true,
  minReasonLength = 5,
  extraField,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void> | void;
  title: string;
  description: string;
  resource?: string;
  actionLabel: string;
  destructive?: boolean;
  requireReason?: boolean;
  minReasonLength?: number;
  extraField?: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string };
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const reasonOk = !requireReason || reason.trim().length >= minReasonLength;

  const handleConfirm = async () => {
    if (!reasonOk || busy) return;
    setBusy(true);
    try {
      await onConfirm(reason.trim());
      setReason("");
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {destructive && <AlertTriangle className="h-5 w-5 text-red-500" />}
            {title}
          </DialogTitle>
          <DialogDescription>
            {description}
            {resource && <span className="mt-1 block font-medium text-slate-700 dark:text-slate-300">{resource}</span>}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {extraField && (
            <div className="space-y-1.5">
              <Label htmlFor="confirm-extra">{extraField.label}</Label>
              <Input
                id="confirm-extra"
                type={extraField.type ?? "text"}
                value={extraField.value}
                onChange={(e) => extraField.onChange(e.target.value)}
                placeholder={extraField.placeholder}
              />
            </div>
          )}
          {requireReason && (
            <div className="space-y-1.5">
              <Label htmlFor="confirm-reason">
                Reason <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="confirm-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why this action is being taken (recorded in the audit log)"
                rows={3}
              />
              <p className="text-[11px] text-slate-400">
                Your identity, the reason, and a timestamp are recorded in the audit log.
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!reasonOk || busy}
            className={destructive ? "bg-red-600 text-white hover:bg-red-700" : ""}
          >
            {busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            {actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AdminEmpty({ message, hint }: { message: string; hint?: string }) {
  return (
    <div className="cloudie-empty">
      <Inbox className="cloudie-empty-icon h-8 w-8" />
      <p className="cloudie-empty-title">{message}</p>
      {hint && <p className="cloudie-empty-desc">{hint}</p>}
    </div>
  );
}

export function AdminSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="cloudie-skeleton-stack">
      {Array.from({ length: rows }).map((_, i) => (
        <span key={i} className="cloudie-skeleton cloudie-skeleton-wide" />
      ))}
    </div>
  );
}

/** Download rows as CSV in the browser. Rows are string[][] with a header row. */
export function downloadCsv(filename: string, rows: (string | number)[][]) {
  if (rows.length === 0) return;
  const escape = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = rows.map((r) => r.map(escape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function fmtDate(ts: number | undefined | null) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
