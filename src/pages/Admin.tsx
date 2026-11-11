import { user } from "dockerode";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { motion } from "@/components/motion";
import { useRouter } from "next/router";
import Link from "next/link";
import Image from "next/image";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/convex/auth/react";

import {
  Users as UsersIcon,
  CreditCard as CreditCardIcon,
  Globe,
  Zap,
  BarChart2 as BarChartIcon,
  FileText,
  Settings,
  Activity,
  TrendingUp,
  Shield,
  HelpCircle,
  ArrowRight,
  ExternalLink,
  Loader2,
  CheckCircle,
  Circle,
  Clock,
  AlertCircle,
  Filter,
  Table,
  Download,
  ChevronRight,
} from "lucide-react";

export default function Admin() {
  const router = useRouter();
  const { data: session } = useAuth();
  const [showAdmins, setShowAdmins] = useState(true);
  const [filters, setFilters] = useState({
    search: "",
    role: "all",
    team: "all",
    createdAt: "all",
  });
  const [expandedAdmin, setExpandedAdmin] = useState<string | null>(null);
  const [sort, setSort] = useState<"status" | "name" | "createdAt" | "lastSeen">("status");
  const admins = useQuery(api.admin.listAdmins, {
    sort,
    role: filters.role === "all" ? undefined : filters.role,
    team: filters.team === "all" ? undefined : filters.team,
    search: filters.search || undefined,
  });
  const lastSync = useQuery(api.admin.getSettings, { field: "lastSync" });

  const workflows = useQuery(api.admin.getWorkflows, { status: "published" });
  const drafts = useQuery(api.admin.getWorkflows, { status: "draft" });

  const values = useQuery(api.admin.getFeatureFlags);
  const newsLetter = useQuery(api.admin.getNewsletter);
  const changelog = useQuery(api.admin.getChangelog);
  const tickets = useQuery(api.admin.getTickets);
  const organizations = useQuery(api.admin.listOrganizations);
  const plans = useQuery(api.admin.getPlans);
  const stats = useQuery(api.admin.getStats);
  const teams = useQuery(api.admin.getTeams);
  const product = useQuery(api.admin.getProduct);

  const [showFilters, setShowFilters] = useState(false);

  const handleOrganizationRoleChange = async (adminId: string, role: "admin" | "member") => {
    await api.admin.updateOrganizationRole.mutate({ adminId, role });
  };

  const organizationUsers = useQuery(api.admin.getOrganizationUsers, {
    organization: filters.team === "all" ? undefined : filters.team,
  });

  const ticketsByType = useMemo(() => {
    const map = { open: [], pending: [], resolved: [], closed: [] };
    (tickets ?? []).forEach((t) => map[t.status]?.push(t));
    return map;
  }, [tickets]);

  const pendingCount = ticketsByType.pending.length;
  const recentTickets = (tickets ?? []).slice(0, 6);

  const recentActivity = useQuery(
    api.admin.getRecentActivity,
    lastSync ? { since: lastSync } : {},
  );

  const ticketsByType display label map {
    open: "Open",
    pending: "Pending",
    resolved: "Resolved",
    closed: "Closed",
  };

  return (<div className="page-content">
    <Suspense fallback={<AdminLoading />}>
      <AdminDash
        organizationUsers={organizationUsers ?? []}
        workflows={workflows ?? []}
        drafts={drafts ?? []}
        values={values ?? {}}
        newsLetter={newsLetter ?? {}}
        changelogEntries={changelog ?? []}
        ticketsByStatus={ticketsByType}
        recentTickets={recentTickets}
        recentActivity={recentActivity ?? []}
        organizations={organizations ?? []}
        plans={plans ?? []}
        stats={stats ?? {}}
        teams={teams ?? []}
        showAdmins={showAdmins}
        setShowAdmins={setShowAdmins}
        filters={filters}
        setFilters={setFilters}
        showFilters={showFilters}
        setShowFilters={setShowFilters}
        expandedAdmin={expandedAdmin}
        setExpandedAdmin={setExpandedAdmin}
        sort={sort}
        setSort={setSort}
        admins={admins ?? []}
        handleOrganizationRoleChange={handleOrganizationRoleChange}
        product={product ?? {}}
        pendingCount={pendingCount}
      />
    </Suspense>
  </div>);
}

function AdminLoading() {
  return null;
}

function AdminDash({
  organizationUsers,
  workflows,
  drafts,
  values,
  newsLetter,
  changelogEntries,
  ticketsByStatus,
  recentTickets,
  recentActivity,
  organizations,
  plans,
  stats,
  teams,
  showAdmins,
  setShowAdmins,
  filters,
  setFilters,
  showFilters,
  setShowFilters,
  expandedAdmin,
  setExpandedAdmin,
  sort,
  setSort,
  admins,
  handleOrganizationRoleChange,
  product,
  pendingCount,
}: {
  organizationUsers: OrganizationUser[];
  workflows: Workflow[];
  drafts: Workflow[];
  values: Record<string, boolean>;
  newsLetter: { enabled: boolean; lastSent: string | null };
  changelogEntries: ChangelogEntry[];
  ticketsByStatus: Record<string, Ticket[]>;
  recentTickets: Ticket[];
  recentActivity: RecentActivityItem[];
  organizations: Organization[];
  plans: Plan[];
  stats: DashboardStats;
  teams: Team[];
  showAdmins: boolean;
  setShowAdmins: (v: boolean) => void;
  filters: FilterState;
  setFilters: (f: FilterState) => void;
  showFilters: boolean;
  setShowFilters: (v: boolean) => void;
  expandedAdmin: string | null;
  setExpandedAdmin: (id: string | null) => void;
  sort: string;
  setSort: (v: string) => void;
  admins: AdminUser[];
  handleOrganizationRoleChange: (adminId: string, role: "admin" | "member") => void;
  product: Product;
  pendingCount: number;
}) {
  const title = product?.name ?? "Cloudie";
  const totalUsers = stats?.users ?? 0;
  const totalRevenue = stats?.monthlyRevenue ?? 0;
  const activeTeams = stats?.activeTeams ?? 0;
  const totalPosts = stats?.posts ?? 0;
  const totalTickets = stats?.tickets ?? 0;

  const anyOrgStats =
    (organizations ?? []).length > 0 ||
    (organizationUsers ?? []).length > 0 ||
    stats?.avgTeamMembers != null ||
    stats?.teamsWithUsers != null;

  const totalOrders = stats?.orders ?? 0;
  const totalRevenueDisplay = totalRevenue.toLocaleString(undefined, { style: "currency", currency: "USD", minimumFractionDigits: 0 });

  const recentActivityList = [...(recentActivity ?? [])].slice(0, 6);
  const emptyActivity = recentActivityList.length === 0;

  const topOrganizationUsers = useMemo(
    () =>
      [...(organizationUsers ?? [])]
        .sort((a, b) => b.lastActiveAt - a.lastActiveAt)
        .slice(0, 5),
    [organizationUsers],
  );

  const activeFilters = useMemo(() => {
    const list: string[] = [];
    if (filters.search) list.push("Search: " + filters.search);
    if (filters.role !== "all") list.push(roleLabel(filters.role));
    if (filters.team !== "all") list.push("Team: " + teamLabel(filters.team));
    if (filters.createdAt !== "all") list.push("Created: " + filters.createdAt);
    return list;
  }, [filters]);

  return (
    <>
      <div className="page">
        <PageHeader
          title="Super Admin"
          description={`Manage ${title}'s users, teams, organizations, billing, support, and launch flow.`}
          action={<a href="/admin/settings" className="link-subtle">Go to Settings <span style={{ display: "inline-flex" }}><ArrowRight size={14} /></span></a>}
        />

        <div className="page-content dashboard">
          <div className="dashboard-grid">
            <StatCard
              label="Total users"
              value={totalUsers}
              sub="All time"
              icon={<UsersIcon />}
              iconColor="var(--color-brand)"
            />
            <StatCard
              label="Revenue"
              value={totalRevenueDisplay}
              sub="MRR"
              icon={<CreditCardIcon />}
              iconColor="var(--color-accent)"
            />
            <StatCard
              label="Active teams"
              value={activeTeams}
              sub={`${totalPosts} posts total`}
              icon={<Zap />}
              iconColor="var(--color-success)"
            />
            <StatCard
              label="Avg team members"
              value={stats?.avgTeamMembers ?? 0}
              sub={`${stats?.teamsWithUsers ?? 0} teams with users`}
              icon={<Activity />}
              iconColor="var(--color-muted)"
            />
          </div>

          <div className="dashboard-grid">
            <div className="dashboard-card">
              <div className="dashboard-card-section-header">
                <div>
                  <h3 className="dashboard-card-title">Recent activity</h3>
                  <p className="dashboard-card-subtitle">Across the platform</p>
                </div>
                <div className="empty-state">
                  {emptyActivity ? (
                    <span className="text-muted">No activity yet</span>
                  ) : (
                    <span className="text-muted">{recentActivityList.length} events</span>
                  )}
                </div>
              </div>
              <div className="dashboard-card-content">
                {emptyActivity ? (
                  <div className="activity-empty">
                    <Clock size={18} />
                    <span>Nothing has happened yet — launch something to see activity.</span>
                  </div>
                ) : (
                  <ul className="activity-list">
                    <AdminActivityList items={recentActivityList} />
                  </ul>
                )}
              </div>
            </div>

            <div className="dashboard-card">
              <div className="dashboard-card-section-header">
                <div>
                  <h3 className="dashboard-card-title">Support</h3>
                  <p className="dashboard-card-subtitle">Help desk overview</p>
                </div>
                <div className="badge status pending">{pendingCount} pending</div>
              </div>
              <div className="dashboard-card-content">
                <div className="support-overview">
                  <div className="support-summary">
                    <div className="support-stat">
                      <span className="support-stat-value">{ticketsByStatus.open.length}</span>
                      <span className="support-stat-label">Open</span>
                    </div>
                    <div className="support-stat">
                      <span className="support-stat-value">{ticketsByStatus.pending.length}</span>
                      <span className="support-stat-label">Pending</span>
                    </div>
                    <div className="support-stat">
                      <span className="support-stat-value">{ticketsByStatus.resolved.length}</span>
                      <span className="support-stat-label">Resolved</span>
                    </div>
                    <div className="support-stat">
                      <span className="support-stat-value">{ticketsByStatus.closed.length}</span>
                      <span className="support-stat-label">Closed</span>
                    </div>
                  </div>
                  <div className="support-tickets">
                    <div className="support-table">
                      <div className="support-table-row support-table-header">
                        <span className="support-table-cell">Subject</span>
                        <span className="support-table-cell support-table-cell--secondary">Status</span>
                        <span className="support-table-cell support-table-cell--secondary">Created</span>
                      </div>
                      {recentTickets.map((ticket) => (
                        <div className="support-table-row" key={ticket.id}>
                          <span className="support-table-cell">
                            <span className="truncate">{ticket.subject}</span>
                          </span>
                          <span className="support-table-cell support-table-cell--secondary">
                            <StatusBadge status={ticket.status} />
                          </span>
                          <span className="support-table-cell support-table-cell--secondary">
                            {formatDate(ticket.createdAt)}
                          </span>
                        </div>
                      ))}
                    </div>
                    {recentTickets.length === 0 && (
                      <div className="support-empty">
                        <span>No tickets yet</span>
                      </div>
                    )}
                  </div>
                </div>
                {recentTickets.length > 0 && (
                  <div className="support-link">
                    <Link to="/admin/tickets" className="link-subtle">
                      View all tickets <ArrowRight size={14} />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="dashboard-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div className="dashboard-card">
              <div className="dashboard-card-section-header">
                <div>
                  <h3 className="dashboard-card-title">Organizations</h3>
                  <p className="dashboard-card-subtitle">{organizations.length} organizations</p>
                </div>
                <Link to="/admin/organizations" className="link-subtle">
                  Manage <ArrowRight size={14} />
                </Link>
              </div>
              <div className="dashboard-card-content">
                {organizations.length === 0 ? (
                  <div className="activity-empty">
                    <Globe size={18} />
                    <span>No organizations yet</span>
                  </div>
                ) : (
                  <div className="organizations-list">
                    {(organizations ?? []).slice(0, 6).map((org) => (
                      <div className="organization-row" key={org.id}>
                        <div className="organization-name">{org.name}</div>
                        <div className="organization-meta">
                          <span>{org.usersCount ?? 0} users</span>
                          <span>·</span>
                          <span>{org.teamsCount ?? 0} teams</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="dashboard-card">
              <div className="dashboard-card-section-header">
                <div>
                  <h3 className="dashboard-card-title">Featured plans</h3>
                  <p className="dashboard-card-subtitle">Managed from settings</p>
                </div>
                <Link to="/admin/billing/plans" className="link-subtle">
                  Manage <ArrowRight size={14} />
                </Link>
              </div>
              <div className="dashboard-card-content">
                {plans.length === 0 ? (
                  <div className="activity-empty">
                    <CreditCardIcon size={18} />
                    <span>No plans configured</span>
                  </div>
                ) : (
                  <div className="plans-list">
                    {(plans ?? []).slice(0, 3).map((plan) => (
                      <PlanRow key={plan.id} plan={plan} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="dashboard-grid">
            <div className="dashboard-card">
              <div className="dashboard-card-section-header">
                <div>
                  <h3 className="dashboard-card-title">Workflows</h3>
                  <p className="dashboard-card-subtitle">
                    {workflows.length} published · {drafts.length} drafts
                  </p>
                </div>
                <Link to="/admin/workflows" className="link-subtle">
                  Manage <ArrowRight size={14} />
                </Link>
              </div>
              <div className="dashboard-card-content workflow-list">
                {workflows.length === 0 && drafts.length === 0 ? (
                  <div className="activity-empty">
                    <Zap size={18} />
                    <span>No workflows yet</span>
                  </div>
                ) : (
                  <ul className="workflow-items">
                    {(workflows ?? []).concat(drafts ?? []).map((item) => (
                      <li key={item.id} className="workflow-item">
                        <Zap size={14} className="workflow-icon" />
                        <div className="workflow-meta">
                          <span className="workflow-name">{item.name}</span>
                          <span className="workflow-sub">{item.actionType}</span>
                        </div>
                        <span className="workflow-status">
                          {item.status === "published" ? (
                            <span className="badge status live">Live</span>
                          ) : (
                            <span className="badge status draft">Draft</span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="dashboard-card">
              <div className="dashboard-card-section-header">
                <div>
                  <h3 className="dashboard-card-title">Feature flags</h3>
                  <p className="dashboard-card-subtitle">Product toggles</p>
                </div>
                <Link to="/admin/settings/feature-flags" className="link-subtle">
                  Manage <ArrowRight size={14} />
                </Link>
              </div>
              <div className="dashboard-card-content">
                {Object.keys(values).length === 0 ? (
                  <div className="activity-empty">
                    <ToggleSwitch size={18} />
                    <span>No feature flags configured</span>
                  </div>
                ) : (
                  <ul className="flag-list">
                    {Object.entries(values).map(([key, enabled]) => (
                      <li key={key} className="flag-row">
                        <span className="flag-key">{key}</span>
                        <ToggleSwitch
                          enabled={enabled}
                          onChange={() => {
                            // handled by settings page
                          }}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <div className="dashboard-grid">
            <div className="dashboard-card">
              <div className="dashboard-card-section-header">
                <div>
                  <h3 className="dashboard-card-title">Changelog</h3>
                  <p className="dashboard-card-subtitle">
                    Product updates and notes
                  </p>
                </div>
                <Link to="/admin/changelog" className="link-subtle">
                  Manage <ArrowRight size={14} />
                </Link>
              </div>
              <div className="dashboard-card-content">
                {changelogEntries.length === 0 ? (
                  <div className="activity-empty">
                    <FileText size={18} />
                    <span>No changelog entries yet</span>
                  </div>
                ) : (
                  <ul className="changelog-list">
                    {changelogEntries.slice(0, 5).map((entry) => (
                      <ChangelogRow key={entry.id} entry={entry} />
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="dashboard-card">
              <div className="dashboard-card-section-header">
                <div>
                  <h3 className="dashboard-card-title">Newsletter</h3>
                  <p className="dashboard-card-subtitle">
                    {newsLetter.enabled ? "Enabled" : "Disabled"}
                    {newsLetter.lastSent ? ` · last sent ${formatDate(newsLetter.lastSent)}` : ""}
                  </p>
                </div>
                <Link to="/admin/settings/newsletter" className="link-subtle">
                  Manage <ArrowRight size={14} />
                </Link>
              </div>
              <div className="dashboard-card-content">
                <div className="newsletter-panel">
                  <div className="newsletter-status">
                    <span className="newsletter-label">Newsletter</span>
                    <span className={newsLetter.enabled ? "badge status live" : "badge status disabled"}>
                      {newsLetter.enabled ? "Active" : "Off"}
                    </span>
                  </div>
                  {newsLetter.lastSent && (
                    <div className="newsletter-meta">
                      <span className="newsletter-meta-label">Last sent</span>
                      <span className="newsletter-meta-value">{formatDate(newsLetter.lastSent)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="dashboard-card wide">
            <div className="dashboard-card-section-header">
              <div>
                <h3 className="dashboard-card-title">
                  {showAdmins ? "Admins" : "Organization members"}
                  {anyOrgStats ? "" : ""}
                </h3>
                <p className="dashboard-card-subtitle">
                  {showAdmins
                    ? "Platform administrators and teams"
                    : "Members across organizations"}
                </p>
              </div>
              <div className="dashboard-card-header-actions">
                <button
                  type="button"
                  className={`chip ${showAdmins ? "chip-selected" : ""}`}
                  onClick={() => {
                    setShowAdmins(true);
                    setFilters((p) => ({ ...p, role: "all", team: "all" }));
                  }}
                >
                  Admins
                </button>
                <button
                  type="button"
                  className={`chip ${!showAdmins ? "chip-selected" : ""}`}
                  onClick={() => {
                    setShowAdmins(false);
                    setFilters((p) => ({ ...p, role: "all", team: "all" }));
                  }}
                >
                  Organizations
                </button>
                <div className="dashboard-card-header-right">
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => setShowFilters(!showFilters)}
                    aria-label="Toggle filters"
                  >
                    <Filter size={16} />
                  </button>
                </div>
              </div>
            </div>

            {showFilters && (
              <div className="dashboard-card-filters">
                <div className="filters-row">
                  <Input
                    type="text"
                    label="Search"
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    placeholder="Name, email, or team..."
                  />
                  <Select
                    label="Role"
                    value={filters.role}
                    options={[
                      { value: "all", label: "All roles" },
                      { value: "owner", label: "Owner" },
                      { value: "admin", label: "Admin" },
                      { value: "member", label: "Member" },
                    ]}
                    onChange={(v) => setFilters({ ...filters, role: v })}
                  />
                  <Select
                    label="Team"
                    value={filters.team}
                    options={[
                      { value: "all", label: "All teams" },
                      ...((teams ?? []).map((t) => ({ value: t.id, label: t.name })) as any),
                    ]}
                    onChange={(v) => setFilters({ ...filters, team: v })}
                  />
                  <Select
                    label="Created"
                    value={filters.createdAt}
                    options={[
                      { value: "all", label: "Any time" },
                      { value: "today", label: "Today" },
                      { value: "week", label: "This week" },
                      { value: "month", label: "This month" },
                      { value: "year", label: "This year" },
                    ]}
                    onChange={(v) => setFilters({ ...filters, createdAt: v })}
                  />
                  {(filters.search || filters.role !== "all" || filters.team !== "all" || filters.createdAt !== "all") && (
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() =>
                        setFilters({ search: "", role: "all", team: "all", createdAt: "all" })
                      }
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="dashboard-card-content">
              {activeFilters.length > 0 && (
                <div className="active-filters">
                  {activeFilters.map((f, i) => (
                    <span key={i} className="filter-tag">
                      {f}
                    </span>
                  ))}
                </div>
              )}

              {showAdmins ? (
                <AdminsTable
                  admins={admins}
                  expandedAdmin={expandedAdmin}
                  setExpandedAdmin={setExpandedAdmin}
                  sort={sort}
                  setSort={setSort}
                  handleOrganizationRoleChange={handleOrganizationRoleChange}
                />
              ) : (
                <OrganizationMembersTable
                  organizationUsers={organizationUsers}
                  teams={teams}
                />
              )}
            </div>
          </div>

          <div className="dashboard-grid" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
            <div className="dashboard-card nav-card">
              <div className="dashboard-card-section-header">
                <h3 className="dashboard-card-title">Platform</h3>
              </div>
              <div className="nav-list">
                <NavLink href="/admin">Overview</NavLink>
                <NavLink href="/admin/tenants">Tenants</NavLink>
                <NavLink href="/admin/banking">Banking</NavLink>
                <NavLink href="/admin/teams">Teams</NavLink>
                <NavLink href="/admin/organizations">Organizations</NavLink>
              </div>
            </div>

            <div className="dashboard-card nav-card">
              <div className="dashboard-card-section-header">
                <h3 className="dashboard-card-title">Support</h3>
              </div>
              <div className="nav-list">
                <NavLink href="/admin/tickets">Tickets</NavLink>
                <NavLink href="/admin/billing">Billing</NavLink>
                <NavLink href="/admin/billing/events">Billing events</NavLink>
                <NavLink href="/admin/billing/invoices">Invoices</NavLink>
                <NavLink href="/admin/billing/usage">Usage</NavLink>
              </div>
            </div>

            <div className="dashboard-card nav-card">
              <div className="dashboard-card-section-header">
                <h3 className="dashboard-card-title">Settings</h3>
              </div>
              <div className="nav-list">
                <NavLink href="/admin/settings/profile">Profile</NavLink>
                <NavLink href="/admin/settings/notifications">Notifications</NavLink>
                <NavLink href="/admin/settings/billing">Billing</NavLink>
                <NavLink href="/admin/settings/team">Team</NavLink>
                <NavLink href="/admin/settings/i18n">Localization</NavLink>
                <NavLink href="/admin/settings/secrets">Secrets</NavLink>
                <NavLink href="/admin/settings/customers">Customers</NavLink>
                <NavLink href="/admin/settings/integrations">Integrations</NavLink>
                <NavLink href="/admin/settings/branding">Branding</NavLink>
                <NavLink href="/admin/settings/metrics">Metrics</NavLink>
                <NavLink href="/admin/settings/feature-flags">Feature flags</NavLink>
                <NavLink href="/admin/settings/newsletter">Newsletter</NavLink>
              </div>
            </div>

            <div className="dashboard-card nav-card">
              <div className="dashboard-card-section-header">
                <h3 className="dashboard-card-title">Launch</h3>
              </div>
              <div className="nav-list">
                <NavLink href="/admin/launch/payments">Payments</NavLink>
                <NavLink href="/admin/launch/team">Team</NavLink>
                <NavLink href="/admin/launch/customers">Customers</NavLink>
                <NavLink href="/admin/launch/launch">Review and launch</NavLink>
              </div>
            </div>
          </div>

          <div className="dashboard-card wide">
            <div className="dashboard-card-section-header">
              <div>
                <h3 className="dashboard-card-title">Help & resources</h3>
                <p className="dashboard-card-subtitle">Support center, orientation, and billing docs</p>
              </div>
            </div>
            <div className="dashboard-card-content">
              <div className="help-grid">
                <div className="help-section">
                  <h4 className="help-section-title">Support center</h4>
                  <ul className="help-links">
                    <li><Link to="/help">Help home</Link></li>
                    <li><Link to="/help/zendesk">Zendesk console</Link></li>
                    <li><Link to="/help/orientation">Orientation</Link></li>
                    <li><Link to="/help/billing">Billing help</Link></li>
                  </ul>
                </div>
                <div className="help-section">
                  <h4 className="help-section-title">Orientation</h4>
                  <ul className="help-links">
                    <li><Link to="/help/orientation/getting-started">Getting started</Link></li>
                    <li><Link to="/help/orientation/quickstart">Quickstart</Link></li>
                    <li><Link to="/help/orientation/integrations">Integrations</Link></li>
                  </ul>
                </div>
                <div className="help-section">
                  <h4 className="help-section-title">Billing docs</h4>
                  <ul className="help-links">
                    <li><Link to="/help/billing/plans">Plans</Link></li>
                    <li><Link to="/help/billing/usage">Usage</Link></li>
                    <li><Link to="/help/billing/invoices/123">Invoice example</Link></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="dashboard-card wide">
            <div className="dashboard-card-section-header">
              <div>
                <h3 className="dashboard-card-title">Tenant portal examples</h3>
                <p className="dashboard-card-subtitle">White-label tenant experiences published on the platform</p>
              </div>
              <Link to="/admin/tenants" className="link-subtle">
                Manage tenants <ArrowRight size={14} />
              </Link>
            </div>
            <div className="dashboard-card-content">
              <div className="tenant-preview-grid">
                {tenantPortalPreviews.map((preview) => (
                  <a key={preview.href} href={preview.href} target="_blank" rel="noreferrer" className="tenant-preview-card">
                    <div className="tenant-preview-thumb">
                      {preview.thumb ? (
                        <Image
                          src={preview.thumb}
                          alt={preview.name}
                          width={280}
                          height={158}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <div className="tenant-preview-placeholder">
                          <Globe size={28} />
                        </div>
                      )}
                    </div>
                    <div className="tenant-preview-meta">
                      <span className="tenant-preview-name">{preview.name}</span>
                      <span className="tenant-preview-href">{preview.href}</span>
                    </div>
                    <div className="tenant-preview-action">
                      <ExternalLink size={12} />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function ChangelogRow({ entry }: { entry: ChangelogEntry }) {
  return (
    <li className="changelog-row">
      <div className="changelog-dot" />
      <div className="changelog-meta">
        <span className="changelog-date">{formatDate(entry.date)}</span>
        <span className="changelog-summary">{entry.summary}</span>
      </div>
    </li>
  );
}

function PlanRow({ plan }: { plan: Plan }) {
  const isCurrentPlan = true;
  return (
    <div className="plan-row">
      <div className="plan-name">
        <span className="plan-badge">{plan.name}</span>
        {isCurrentPlan && <span className="plan-current">Current</span>}
      </div>
      <div className="plan-meta">
        <span>{plan.formattedPrice}</span>
        <span>·</span>
        <span>{plan.interval}</span>
      </div>
    </div>
  );
}

function AdminActivityList({ items }: { items: RecentActivityItem[] }) {
  return items.map((item, i) => (
    <li key={i} className="activity-row">
      <Avatar name={item.actorName} size={28} />
      <div className="activity-content">
        <div>
          <span className="activity-text">
            <strong>{item.actorName}</strong>
            {" "}
            {item.actionLabel}
          </span>
          <div className="activity-time">{item.timeLabel}</div>
        </div>
        {item.target ? (
          <Link to={item.target} className="activity-target">
            <ArrowRight size={12} />
            {item.targetLabel}
          </Link>
        ) : null}
      </div>
    </li>
  ));
}

function OrganizationMembersTable({
  organizationUsers,
  teams,
}: {
  organizationUsers: OrganizationUser[];
  teams: Team[];
}) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  return (
    <div className="members-table-wrap">
      <div className="members-table">
        <div className="members-table-header">
          <span className="members-table-cell">Name</span>
          <span className="members-table-cell">Email</span>
          <span className="members-table-cell">Organization</span>
          <span className="members-table-cell">Team</span>
          <span className="members-table-cell">Last active</span>
          <span className="members-table-cell">Status</span>
        </div>
        {topOrganizationUsers.length === 0 ? (
          <div className="members-empty">
            <UsersIcon size={16} />
            <span>No members across organizations</span>
          </div>
        ) : (
          topOrganizationUsers.map((user) => (
            <div key={user.id} className="members-table-row" onClick={() => setExpandedRow(expandedRow === user.id ? null : user.id)}>
              <div className="members-table-cell members-cell-primary">
                <Avatar name={user.name} size={24} />
                <div className="members-cell-info">
                  <span className="members-cell-name">{user.name}</span>
                  <span className="members-cell-sub">{user.role}</span>
                </div>
              </div>
              <div className="members-table-cell">{user.email}</div>
              <div className="members-table-cell">{user.organizationName}</div>
              <div className="members-table-cell">
                <Select
                  value={user.teamId ?? "none"}
                  options={[
                    { value: "none", label: "—" },
                    ...((teams ?? []).map((t) => ({ value: t.id, label: t.name })) as any),
                  ]}
                  onChange={() => {}}
                  className="inline-select"
                />
              </div>
              <div className="members-table-cell">{user.lastSeen ?? "—"}</div>
              <div className="members-table-cell">
                <StatusBadge status={user.status} />
              </div>
            </div>
          ))
        )}
      </div>
      {expandedRow && (
        <div className="members-expanded">
          <div className="expanded-header">
            <button type="button" className="link-subtle" onClick={() => setExpandedRow(null)}>
              <ArrowRight size={14} style={{ transform: "rotate(180deg)" }} />
              Hide details
            </button>
          </div>
          <div className="expanded-content">
            <AdminOrgMemberRow user={topOrganizationUsers.find((u) => u.id === expandedRow)!} />
          </div>
        </div>
      )}
    </div>
  );
}

function AdminOrgMemberRow({ user }: { user: OrganizationUser }) {
  return (
    <div className="org-member-row">
      <div className="org-member-header">
        <Avatar name={user.name} size={32} />
        <div>
          <div className="org-member-name">{user.name}</div>
          <div className="org-member-email">{user.email}</div>
        </div>
        <div className="org-member-actions">
          <StatusBadge status={user.status} />
          <button type="button" className="link-subtle">Edit</button>
        </div>
      </div>
      <dl className="org-member-details">
        <div>
          <dt>Name</dt>
          <dd>{user.name}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>{user.email}</dd>
        </div>
        <div>
          <dt>Organization</dt>
          <dd>{user.organizationName}</dd>
        </div>
        <div>
          <dt>Team</dt>
          <dd>{user.teamName ?? "—"}</dd>
        </div>
        <div>
          <dt>Role</dt>
          <dd>{user.role}</dd>
        </div>
        <div>
          <dt>Last active</dt>
          <dd>{user.lastActiveAt != null ? formatDate(user.lastActiveAt) : "—"}</dd>
        </div>
        <div>
          <dt>Joined</dt>
          <dd>{formatDate(user.createdAt)}</dd>
        </div>
      </dl>
    </div>
  );
}

function AdminsTable({
  admins,
  expandedAdmin,
  setExpandedAdmin,
  sort,
  setSort,
  handleOrganizationRoleChange,
}: {
  admins: AdminUser[];
  expandedAdmin: string | null;
  setExpandedAdmin: (id: string | null) => void;
  sort: string;
  setSort: (v: string) => void;
  handleOrganizationRoleChange: (adminId: string, role: "admin" | "member") => void;
}) {
  const sorted = useMemo(() => {
    const list = [...admins];
    if (sort === "status") {
      list.sort((a, b) => {
        const rank = (s: string) => (s === "active" ? 0 : s === "pending" ? 1 : 2);
        return rank(a.status) - rank(b.status);
      });
    } else if (sort === "name") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === "createdAt") {
      list.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    } else if (sort === "lastSeen") {
      list.sort((a, b) => (b.lastSeenAt ?? 0) - (a.lastSeenAt ?? 0));
    }
    return list;
  }, [admins, sort]);

  return (
    <div className="admins-table-wrap">
      <div className="admins-table">
        <div className="admins-table-header">
          <span className="admins-table-cell">
            Admin
            <ArrowRight size={12} style={{ transform: "rotate(0deg)", marginLeft: 4 }} />
          </span>
          <span className="admins-table-cell">Role</span>
          <span className="admins-table-cell">Organization</span>
          <span className="admins-table-cell">Created</span>
          <span className="admins-table-cell">Last seen</span>
          <span className="admins-table-cell">Status</span>
          <span className="admins-table-cell">Actions</span>
        </div>
        {sorted.length === 0 ? (
          <div className="admins-empty">
            <UsersIcon size={16} />
            <span>No admins found</span>
          </div>
        ) : (
          sorted.map((admin) => (
            <div key={admin.id} className="admins-table-row">
              <div className="admins-table-cell admins-cell-primary">
                <Avatar name={admin.name} size={24} />
                <div>
                  <div className="admin-cell-name">{admin.name}</div>
                  <div className="admin-cell-email">{admin.email}</div>
                </div>
              </div>
              <div className="admins-table-cell">
                <RoleSelect
                  role={admin.role}
                  onChange={(role) => handleOrganizationRoleChange(admin.id, role)}
                />
              </div>
              <div className="admins-table-cell">{admin.organizationName ?? "—"}</div>
              <div className="admins-table-cell">{formatDate(admin.createdAt)}</div>
              <div className="admins-table-cell">
                {admin.lastSeenAt ? formatDate(admin.lastSeenAt) : "—"}
              </div>
              <div className="admins-table-cell">
                <StatusBadge status={admin.status} />
              </div>
              <div className="admins-table-cell">
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => setExpandedAdmin(expandedAdmin === admin.id ? null : admin.id)}
                  aria-label="Details"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      {expandedAdmin && (
        <div className="expanded-row">
          {(() => {
            const admin = admins.find((a) => a.id === expandedAdmin);
            if (!admin) return null;
            return (
              <AdminAdminRow
                admin={admin}
                onRoleChange={(role) => handleOrganizationRoleChange(admin.id, role)}
              />
            );
          })()}
        </div>
      )}
    </div>
  );
}

function AdminAdminRow({
  admin,
  onRoleChange,
}: {
  admin: AdminUser;
  onRoleChange: (role: "admin" | "member") => void;
}) {
  return (
    <div className="admin-expanded">
      <div className="admin-expanded-header">
        <Avatar name={admin.name} size={36} />
        <div>
          <div className="admin-expanded-name">{admin.name}</div>
          <div className="admin-expanded-email">{admin.email}</div>
        </div>
        <StatusBadge status={admin.status} />
      </div>
      <dl className="admin-expanded-details">
        <div>
          <dt>ID</dt>
          <dd>{admin.id}</dd>
        </div>
        <div>
          <dt>Name</dt>
          <dd>{admin.name}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>{admin.email}</dd>
        </div>
        <div>
          <dt>Role</dt>
          <dd>
            <select
              value={admin.role}
              onChange={(e) => onRoleChange(e.target.value as "admin" | "member")}
              className="select-sm"
            >
              <option value="admin">Admin</option>
              <option value="member">Member</option>
            </select>
          </dd>
        </div>
        <div>
          <dt>Organization</dt>
          <dd>{admin.organizationName ?? "—"}</dd>
        </div>
        <div>
          <dt>Created</dt>
          <dd>{formatDate(admin.createdAt)}</dd>
        </div>
        <div>
          <dt>Last seen</dt>
          <dd>{admin.lastSeenAt ? formatDate(admin.lastSeenAt) : "—"}</dd>
        </div>
        <div>
          <dt>Locale</dt>
          <dd>{admin.locale ?? "—"}</dd>
        </div>
      </dl>
    </div>
  );
}

function RoleSelect({
  role,
  onChange,
}: {
  role: "admin" | "member";
  onChange: (role: "admin" | "member") => void;
}) {
  return (
    <select
      value={role}
      onChange={(e) => onChange(e.target.value as "admin" | "member")}
      className="select-sm"
    >
      <option value="admin">Admin</option>
      <option value="member">Member</option>
    </select>
  );
}

function Avatar({ name, size = 20 }: { name: string; size?: number }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";
  const hue = (name.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0) * 9973) % 360;
  return (
    <div
      className="avatar"
      style={{
        width: size,
        height: size,
        backgroundColor: `hsl(${hue}, 55%, 55%)`,
      }}
    >
      <span style={{ color: "#fff", fontSize: size * 0.4, fontWeight: 600, lineHeight: 1 }}>
        {initials}
      </span>
    </div>
  );
}

function NavLink({ href }: { href: string }) {
  return (
    <a href={href} className="nav-link">
      {href.replace(/\/admin\/?/, "").replace(/^\//, "") || "Overview"}
      <ArrowRight size={12} />
    </a>
  );
}

function ToggleSwitch({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      className={`toggle ${enabled ? "toggle-on" : "toggle-off"}`}
      onClick={onChange}
    >
      <span className="toggle-track" />
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    active: { label: "Active", className: "badge status active" },
    pending: { label: "Pending", className: "badge status pending" },
    suspended: { label: "Suspended", className: "badge status disabled" },
    onboarded: { label: "Onboarded", className: "badge status active" },
    invited: { label: "Invited", className: "badge status pending" },
    requested: { label: "Requested", className: "badge status pending" },
  };
  const info = map[status] ?? { label: status, className: "badge status default" };
  return <span className={info.className}>{info.label}</span>;
}

function formatDate(date: string | number | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "number" ? new Date(date) : new Date(date);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function roleLabel(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function teamLabel(teamId: string) {
  return "Team " + teamId.slice(0, 4);
}
