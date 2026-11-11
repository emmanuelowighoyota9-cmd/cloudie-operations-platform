import { useEffect, useRef, useState } from "react";
import { motion, type SerializedPersonaFooter } from "@/components/motion";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
  Outlet,
} from "react-router";
import {
  AlertTriangle,
  BarChart2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  HelpCircle,
  LayoutDashboard,
  LineChart,
  Loader2,
  LogOut,
  Settings,
  Shield,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";

export const ROBOTS_TXT =
  "User-agent: *\nAllow: /\nSitemap: https://cloudie.dev/sitemap.xml";

export function injectRobots() {
  const existing = document.getElementById("cloudie-robots");
  if (existing) return;
  const el = document.createElement("meta");
  el.id = "cloudie-robots";
  el.name = "robots";
  el.content = "index, follow";
  document.head.appendChild(el);
}

export function RobotsMeta({
  robots = "index, follow",
}: { robots?: string }) {
  const ref = useRef<HTMLMetaElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Keep this in sync with sitemap generation only if the team adds path-level
    // rules later. For now the platform ships a single public policy.
    if (el.content !== robots) el.content = robots;
  }, [robots]);
  return <meta ref={ref} name="robots" content={robots} />;
}

export function PathTitle({
  title,
  base = "Cloudie",
}: {
  title: string;
  base?: string;
}) {
  const ref = useRef<HTMLTitleElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const full = title === base ? base : `${title} · ${base}`;
    if (document.title !== full) document.title = full;
  }, [title, base]);
  return <title ref={ref}>{title === base ? base : `${title} · ${base}`}</title>;
}

function urldate(d: string) {
  const n = Date.parse(d);
  if (isNaN(n)) return undefined;
  const y = new Date(n).getUTCFullYear();
  return y >= 2026 ? `https://cloudie.dev/sitemap.xml?updated=${y}` : undefined;
}

function listEntry(
  loc: string,
  lastmod?: string,
  changefreq = "monthly",
  priority = 0.7,
  image?: { loc: string; title: string; caption?: string } | null,
) {
  const entry: Record<string, unknown> = { loc: loc.startsWith("/") ? `https://cloudie.dev${loc}` : loc };
  if (lastmod) entry.lastmod = lastmod;
  if (changefreq) entry.changefreq = changefreq;
  if (priority != null && priority !== 0.7) entry.priority = priority;
  if (image && image.loc) {
    entry.image = [image.loc];
    if (image.title) entry["image:title"] = image.title;
    if (image.caption) entry["image:caption"] = image.caption;
  }
  return entry;
}

function buildSitemap(siteName: string | undefined) {
  const feed = siteName ?? "Cloudie";
  const currentYear = new Date().getUTCFullYear().toString();
  const published =
    siteName && siteName.length > 0
      ? siteName
      : undefined;

  const entries: Array<Record<string, unknown>> = [
    // Marketing shell
    listEntry("/", currentYear, "daily", 1, {
      loc: "https://cloudie.dev/og.png",
      title: feed,
      caption: "Cloudie operations platform",
    }),
    listEntry("/features", currentYear, "monthly", 0.85),
    listEntry("/pricing", currentYear, "monthly", 0.85),
    listEntry("/security", currentYear, "monthly", 0.85),
    listEntry("/deploy", currentYear, "monthly", 0.85),
    listEntry("/changelog", currentYear, "weekly", 0.6),
    listEntry("/demo", currentYear, "monthly", 0.7),
    listEntry("/pricing/compare", currentYear, "monthly", 0.7),
    listEntry("/pricing/teams", currentYear, "monthly", 0.7),
    listEntry("/pricing/admin", currentYear, "monthly", 0.7),
    listEntry("/privacy", currentYear, "yearly", 0.5),
    listEntry("/terms", currentYear, "yearly", 0.5),
    listEntry("/security/policies", currentYear, "yearly", 0.5),
    listEntry("/security/overview", currentYear, "monthly", 0.6),
    listEntry("/security/compliance", currentYear, "yearly", 0.5),
    listEntry("/security/investors", currentYear, "yearly", 0.5),
    listEntry("/open-source", currentYear, "yearly", 0.5),
    listEntry("/feedback", currentYear, "monthly", 0.6),
    listEntry("/roadmap", currentYear, "monthly", 0.6),
    listEntry("/about", currentYear, "yearly", 0.5),
    listEntry("/contact", currentYear, "monthly", 0.6),
    listEntry("/admin/login", currentYear, "monthly", 0.5),
    listEntry("/admin/forgot-password", currentYear, "monthly", 0.5),
    listEntry("/admin/reset-password", currentYear, "monthly", 0.5),
    listEntry("/admin", currentYear, "daily", 0.95, {
      loc: "https://cloudie.dev/admin-preview.png",
      title: "Super admin dashboard",
      caption: "Platform overview",
    }),
    listEntry("/admin/tenants", currentYear, "daily", 0.9, {
      loc: "https://cloudie.dev/tenants-preview.png",
      title: "Tenant management",
      caption: "Tenant listing and moderation",
    }),
    listEntry("/admin/banking", currentYear, "daily", 0.9),
    listEntry("/admin/banking/:id", currentYear, "daily", 0.9, {
      loc: "https://cloudie.dev/banking-preview.png",
      title: "Tenant banking administration",
      caption: "Banking tenant detail",
    }),
    listEntry("/admin/help", currentYear, "monthly", 0.5),
    listEntry("/admin/settings", currentYear, "monthly", 0.5),
    listEntry("/admin/settings/notifications", currentYear, "monthly", 0.5),
    listEntry("/admin/settings/profile", currentYear, "monthly", 0.5),
    listEntry("/admin/settings/billing", currentYear, "monthly", 0.5),
    listEntry("/admin/settings/team", currentYear, "monthly", 0.5),
    listEntry("/admin/settings/i18n", currentYear, "monthly", 0.5),
    listEntry("/admin/settings/secrets", currentYear, "monthly", 0.5),
    listEntry("/admin/settings/customers", currentYear, "monthly", 0.5),
    listEntry("/admin/settings/integrations", currentYear, "monthly", 0.5),
    listEntry("/admin/settings/branding", currentYear, "monthly", 0.5),
    listEntry(
      "/admin/settings/branding/:id",
      currentYear,
      "monthly",
      0.5,
      {
        loc: "https://cloudie.dev/branding-preview.png",
        title: "Branding editor",
        caption: "Site branding configuration",
      },
    ),
    listEntry("/admin/customize", currentYear, "monthly", 0.5),
    listEntry("/admin/launch", currentYear, "monthly", 0.5),
    listEntry("/admin/launch/payments", currentYear, "monthly", 0.5),
    listEntry("/admin/launch/team", currentYear, "monthly", 0.5),
    listEntry("/admin/launch/customers", currentYear, "monthly", 0.5),
    listEntry("/admin/launch/launch", currentYear, "monthly", 0.5),
    listEntry("/admin/settings/metrics", currentYear, "monthly", 0.5),
    listEntry("/admin/metrics", currentYear, "weekly", 0.7, {
      loc: "https://cloudie.dev/metrics-preview.png",
      title: "Platform metrics overview",
      caption: "Super admin metrics",
    }),
    listEntry("/admin/customers", currentYear, "daily", 0.85),
    listEntry("/admin/sitemap", currentYear, "weekly", 0.5),
    listEntry("/admin/teams", currentYear, "daily", 0.8),
    listEntry("/admin/all-teams", currentYear, "daily", 0.8),
    listEntry("/admin/team/new", currentYear, "daily", 0.7),
    listEntry("/admin/team/:id", currentYear, "daily", 0.85),
    listEntry("/admin/team/:id/members", currentYear, "daily", 0.85),
    listEntry("/admin/team/:id/members/new", currentYear, "daily", 0.7),
    listEntry("/admin/team/:id/invitations", currentYear, "daily", 0.7),
    listEntry("/admin/organizations", currentYear, "daily", 0.8),
    listEntry("/admin/organizations/new", currentYear, "daily", 0.7),
    listEntry("/admin/organization/:id", currentYear, "daily", 0.85),
    listEntry("/admin/organization/:id/members", currentYear, "daily", 0.85),
    listEntry("/admin/organization/:id/members/new", currentYear, "daily", 0.7),
    listEntry("/admin/organization/:id/invitations", currentYear, "daily", 0.7),
    listEntry("/admin/customers/new", currentYear, "daily", 0.7),
    listEntry("/admin/customer/:id", currentYear, "daily", 0.85),
    listEntry("/admin/tickets", currentYear, "daily", 0.85),
    listEntry("/admin/tickets/new", currentYear, "daily", 0.7),
    listEntry("/admin/ticket/:id", currentYear, "daily", 0.85),
    listEntry("/admin/billing", currentYear, "weekly", 0.7),
    listEntry("/admin/billing/events", currentYear, "weekly", 0.7),
    listEntry("/admin/billing/invoices", currentYear, "weekly", 0.7),
    listEntry("/admin/billing/usage", currentYear, "weekly", 0.7),
    listEntry("/help", currentYear, "monthly", 0.7),
    listEntry("/help/zendesk", currentYear, "monthly", 0.7),
    listEntry("/help/orientation", currentYear, "monthly", 0.7),
    listEntry("/help/billing", currentYear, "monthly", 0.7),
    listEntry(
      "/help/zendesk/tickets/:id",
      currentYear,
      "monthly",
      0.5,
      { loc: "https://cloudie.dev/ticket-preview.png", title: "Support ticket", caption: "" },
    ),
    listEntry("/help/orientation/getting-started", currentYear, "monthly", 0.7),
    listEntry("/help/orientation/quickstart", currentYear, "monthly", 0.7),
    listEntry("/help/orientation/integrations", currentYear, "monthly", 0.7),
    listEntry(
      "/help/billing/plans",
      currentYear,
      "monthly",
      0.7,
      { loc: "https://cloudie.dev/plans-preview.png", title: "Plans", caption: "" },
    ),
    listEntry("/help/billing/usage", currentYear, "monthly", 0.7),
    listEntry(
      "/help/billing/invoices/:id",
      currentYear,
      "monthly",
      0.5,
      { loc: "https://cloudie.dev/invoice-preview.png", title: "Invoices", caption: "" },
    ),
    // Tenant marketplace / embeds
    listEntry("/sitemap.xml", currentYear, "weekly", 0.5),
  ];

  // Dynamic tenant marketplace pages
  return { entries, published };
}

export function SitemapAdminShell() {
  return null;
}

export default function SitemapPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "sitemap" | "robots">(
    "overview",
  );

  const tenant = useQuery(
    api.tenantPortal.myPortal,
    params.subdomain ? { subdomain: params.subdomain } : {},
  );

  useEffect(() => {
    injectRobots();
  }, []);

  const onCopy = async () => {
    const text = `${ROBOTS_TXT}\n\n${tenant?.tenant?.subdomain ? `# ${tenant.tenant.displayName}\n${tenant.tenant.subdomain}.${window.location.hostname}` : ""}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
    setTimeout(() => setCopied(false), 1800);
  };

  const sitemap = buildSitemap(
    tenant?.tenant?.siteName ?? tenant?.tenant?.displayName,
  );

  const path =
    activeTab === "sitemap"
      ? "/admin/sitemap"
      : activeTab === "robots"
        ? "/admin/robots"
        : "/admin/sitemap";

  return (
    <PathTitle title="Sitemap" />
  );
}
