import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

type BookingStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "AUTO_REFUNDED";

interface AdminBookingRow {
  id: number;
  userName: string;
  providerName: string;
  date: string; // ISO
  status: BookingStatus;
}

interface AdminProviderSummary {
  id: number;
  providerName: string;
  rating: number;
  totalBookings: number;
  status: "ACTIVE" | "SUSPENDED" | "PENDING";
}

interface CmsSectionItem {
  slug: string;
  title: string;
}

const StatusBadge: React.FC<{ status: BookingStatus }> = ({ status }) => {
  const color =
    status === "CONFIRMED"
      ? "bg-[#465A9C]/20 text-[#929EC4]"
      : status === "PENDING"
      ? "bg-yellow-500/20 text-yellow-300"
      : status === "COMPLETED"
      ? "bg-sky-500/20 text-sky-300"
      : status === "AUTO_REFUNDED"
      ? "bg-indigo-500/20 text-indigo-300"
      : "bg-rose-500/20 text-rose-300";
  return <span className={`rounded-md px-2 py-1 text-xs ${color}`}>{status}</span>;
};

const ProviderStatusBadge: React.FC<{ status: AdminProviderSummary["status"] }> = ({ status }) => {
  const color =
    status === "ACTIVE"
      ? "bg-[#465A9C]/20 text-[#929EC4]"
      : status === "PENDING"
      ? "bg-yellow-500/20 text-yellow-300"
      : "bg-rose-500/20 text-rose-300";
  return <span className={`rounded-md px-2 py-1 text-xs ${color}`}>{status}</span>;
};

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [period, setPeriod] = useState<"TODAY" | "7D" | "30D">("7D");

  // Stats
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProviders: 0,
    totalBookings30d: 0,
    totalRevenueInr: 0,
  });

  const [recentBookings, setRecentBookings] = useState<AdminBookingRow[]>([]);
  const [topProviders, setTopProviders] = useState<AdminProviderSummary[]>([]);
  const [cmsSections, setCmsSections] = useState<CmsSectionItem[]>([]);

  // Role protection (mock)
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const role = localStorage.getItem("role") || "USER";
    if (!token || role !== "ADMIN") {
      setAccessDenied(true);
      setLoading(false);
    }
  }, []);

  // Mock fetch
  useEffect(() => {
    if (accessDenied) return;
    setLoading(true);
    const t = setTimeout(() => {
      setStats({
        totalUsers: 12560,
        totalProviders: 842,
        totalBookings30d: 3164,
        totalRevenueInr: 48750000,
      });
      setRecentBookings([
        {
          id: 10021,
          userName: "Priya S",
          providerName: "Lumina Photography",
          date: new Date().toISOString(),
          status: "CONFIRMED",
        },
        {
          id: 10018,
          userName: "Rahul M",
          providerName: "Aria Events & Decor",
          date: new Date(Date.now() - 86400000).toISOString(),
          status: "PENDING",
        },
        {
          id: 10012,
          userName: "Aegis Corp",
          providerName: "VenueCraft",
          date: new Date(Date.now() - 2 * 86400000).toISOString(),
          status: "COMPLETED",
        },
        {
          id: 10005,
          userName: "Neha S",
          providerName: "SoundWave DJs",
          date: new Date(Date.now() - 3 * 86400000).toISOString(),
          status: "CANCELLED",
        },
        {
          id: 9999,
          userName: "Rohan M",
          providerName: "Bloom Florals",
          date: new Date(Date.now() - 4 * 86400000).toISOString(),
          status: "AUTO_REFUNDED",
        },
      ]);
      setTopProviders([
        { id: 201, providerName: "Lumina Photography", rating: 4.9, totalBookings: 1260, status: "ACTIVE" },
        { id: 145, providerName: "Aria Events & Decor", rating: 4.8, totalBookings: 980, status: "ACTIVE" },
        { id: 320, providerName: "VenueCraft", rating: 4.7, totalBookings: 860, status: "PENDING" },
        { id: 412, providerName: "SoundWave DJs", rating: 4.6, totalBookings: 720, status: "ACTIVE" },
      ]);
      setCmsSections([
        { slug: "about-us", title: "About Us" },
        { slug: "terms", title: "Terms & Conditions" },
        { slug: "privacy", title: "Privacy Policy" },
        { slug: "refund", title: "Refund Policy" },
      ]);
      setLoading(false);
    }, 400);
    return () => clearTimeout(t);
  }, [accessDenied]);

  const revenueDisplay = useMemo(() => `₹ ${stats.totalRevenueInr.toLocaleString()}`, [stats.totalRevenueInr]);

  if (accessDenied) {
    return (
      <main className="ox-main ox-dashboard-admin p-6 text-white">
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-4">
          Access denied. Please log in as admin.
        </div>
      </main>
    );
  }

  if (loading) {
    return <main className="ox-main ox-dashboard-admin p-6 text-white">Loading admin dashboard…</main>;
  }

  return (
    <main className="ox-main ox-dashboard-admin mx-auto max-w-7xl px-4 py-6">
      {/* Top row */}
      <div className="mb-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <h1 className="text-2xl font-semibold text-white">Admin Dashboard</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm text-white/80">Period:</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as any)}
            className="rounded-md border border-white/20 bg-black/20 p-2 text-white focus:border-white/40 focus:outline-none"
          >
            <option value="TODAY" className="bg-gray-900">Today</option>
            <option value="7D" className="bg-gray-900">7 days</option>
            <option value="30D" className="bg-gray-900">30 days</option>
          </select>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-white/20 bg-white/10 p-4 text-white backdrop-blur-xl">
          <div className="text-xs uppercase tracking-wide text-white/70">Total Users</div>
          <div className="mt-2 text-2xl font-semibold">{stats.totalUsers}</div>
        </div>
        <div className="rounded-xl border border-white/20 bg-white/10 p-4 text-white backdrop-blur-xl">
          <div className="text-xs uppercase tracking-wide text-white/70">Total Providers</div>
          <div className="mt-2 text-2xl font-semibold">{stats.totalProviders}</div>
        </div>
        <div className="rounded-xl border border-white/20 bg-white/10 p-4 text-white backdrop-blur-xl">
          <div className="text-xs uppercase tracking-wide text-white/70">Total Bookings (30d)</div>
          <div className="mt-2 text-2xl font-semibold">{stats.totalBookings30d}</div>
        </div>
        <div className="rounded-xl border border-white/20 bg-white/10 p-4 text-white backdrop-blur-xl">
          <div className="text-xs uppercase tracking-wide text-white/70">Total Revenue</div>
          <div className="mt-2 text-2xl font-semibold text-[#929EC4]">{revenueDisplay}</div>
        </div>
      </div>

      {/* Two-column section */}
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Left: Recent Bookings */}
        <div className="rounded-xl border border-white/20 bg-white/10 p-4 text-white backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Bookings</h2>
            <button
              className="text-sm text-indigo-300 hover:text-indigo-200"
              onClick={() => navigate("/admin/bookings")}
            >
              View All Bookings
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="text-white/70">
                  <th className="px-2 py-1">ID</th>
                  <th className="px-2 py-1">User</th>
                  <th className="px-2 py-1">Provider</th>
                  <th className="px-2 py-1">Date</th>
                  <th className="px-2 py-1">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentBookings.map((b) => (
                  <tr key={b.id} className="border-t border-white/10">
                    <td className="px-2 py-2">{b.id}</td>
                    <td className="px-2 py-2">{b.userName}</td>
                    <td className="px-2 py-2">{b.providerName}</td>
                    <td className="px-2 py-2">{new Date(b.date).toLocaleString()}</td>
                    <td className="px-2 py-2"><StatusBadge status={b.status} /></td>
                  </tr>
                ))}
                {!recentBookings.length && (
                  <tr>
                    <td className="px-2 py-2 text-white/70" colSpan={5}>No recent bookings.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Top Providers */}
        <div className="rounded-xl border border-white/20 bg-white/10 p-4 text-white backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Top Providers</h2>
            <button
              className="text-sm text-indigo-300 hover:text-indigo-200"
              onClick={() => navigate("/admin/providers")}
            >
              Manage Providers
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {topProviders.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border border-white/15 bg-black/20 p-3">
                <div>
                  <div className="font-medium">{p.providerName}</div>
                  <div className="text-xs text-white/70">⭐ {p.rating} • {p.totalBookings} bookings</div>
                </div>
                <ProviderStatusBadge status={p.status} />
              </div>
            ))}
            {!topProviders.length && (
              <div className="rounded-lg border border-white/15 bg-black/20 p-3 text-white/70">No providers found.</div>
            )}
          </div>
        </div>
      </div>

      {/* CMS Section Summary */}
      <div className="mt-6 rounded-xl border border-white/20 bg-white/10 p-4 text-white backdrop-blur-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">CMS Sections</h2>
          <button
            className="text-sm text-indigo-300 hover:text-indigo-200"
            onClick={() => navigate("/admin/users")}
          >
            Manage Users
          </button>
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {cmsSections.map((s) => (
            <div key={s.slug} className="flex items-center justify-between rounded-lg border border-white/15 bg-black/20 p-3">
              <div className="font-medium">{s.title}</div>
              <button
                className="rounded-lg border border-white/30 bg-white/10 px-3 py-1 text-sm text-white hover:bg-white/20"
                onClick={() => navigate(`/admin/cms/${s.slug}`)}
              >
                Edit
              </button>
            </div>
          ))}
          {!cmsSections.length && (
            <div className="rounded-lg border border-white/15 bg-black/20 p-3 text-white/70">No CMS sections.</div>
          )}
        </div>
      </div>
    </main>
  );
};

export default AdminDashboardPage;

