import React, { useEffect, useMemo, useState } from 'react';
import { useToast, useConfirm } from "@/context/NotificationContext";
import { useNavigate } from 'react-router-dom';

interface SupportTicket {
  id: number;
  subject: string;
  category: 'BOOKING' | 'PAYMENT' | 'ACCOUNT' | 'OTHER';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  createdAt: string;
}

interface AdminSupportTicket extends SupportTicket {
  assignedTo?: string; // admin username/id
  requesterName: string;
}

const STATUS_OPTIONS: SupportTicket['status'][] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

const statusClass = (status: SupportTicket['status']) => {
  switch (status) {
    case 'OPEN':
      return 'ox-tag ox-tag-status--pending';
    case 'IN_PROGRESS':
      return 'ox-tag ox-tag-status--confirmed';
    case 'RESOLVED':
      return 'ox-tag ox-tag-status--completed';
    case 'CLOSED':
      return 'ox-tag ox-tag-status--cancelled';
    default:
      return 'ox-tag';
  }
};

const mockTickets: AdminSupportTicket[] = [
  {
    id: 501,
    subject: 'Cannot see booking details',
    category: 'BOOKING',
    status: 'OPEN',
    createdAt: new Date().toISOString(),
    requesterName: 'Alice Johnson',
  },
  {
    id: 502,
    subject: 'Refund not received',
    category: 'PAYMENT',
    status: 'IN_PROGRESS',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    requesterName: 'Bob Smith',
    assignedTo: 'admin.sara',
  },
  {
    id: 503,
    subject: 'Change account email',
    category: 'ACCOUNT',
    status: 'RESOLVED',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    requesterName: 'Carol Lee',
    assignedTo: 'admin.sam',
  },
];

export const AdminSupportPage: React.FC = () => {
  const toast = useToast();
  const confirmDialog = useConfirm();
  const navigate = useNavigate();

  const [tickets, setTickets] = useState<AdminSupportTicket[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<SupportTicket['status'] | ''>('');
  const [search, setSearch] = useState<string>('');

  // Access control: admin only
  useEffect(() => {
    const role = localStorage.getItem('role');
    const token = localStorage.getItem('accessToken');
    if (role !== 'ADMIN' || !token) {
      navigate('/admin/login');
    }
  }, [navigate]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        // Replace with GET /admin/support/tickets later
        setTickets(mockTickets);
      } catch (e: any) {
        setError(e?.message || 'Failed to fetch tickets');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    return tickets.filter((t) => {
      if (statusFilter && t.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const line = `${t.subject} ${t.requesterName} ${t.assignedTo ?? ''}`.toLowerCase();
        if (!line.includes(q)) return false;
      }
      return true;
    });
  }, [tickets, statusFilter, search]);

  const setStatus = async (row: AdminSupportTicket, next: SupportTicket['status']) => {
    // Transition rules are loose for admin
    const ok = await confirmDialog(`Set ticket #${row.id} status to ${next}?`);
    if (!ok) return;
    // Replace with PATCH /admin/support/tickets/:id/status
    setTickets((prev) => prev.map((t) => (t.id === row.id ? { ...t, status: next } : t)));
  };

  const assignToMe = async (row: AdminSupportTicket) => {
    const adminUser = localStorage.getItem('adminUser') || 'admin.me';
    const ok = await confirmDialog(`Assign ticket #${row.id} to ${adminUser}?`);
    if (!ok) return;
    // Replace with PATCH /admin/support/tickets/:id/assign
    setTickets((prev) => prev.map((t) => (t.id === row.id ? { ...t, assignedTo: adminUser } : t)));
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString();
    } catch {
      return iso;
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="ox-section ox-card mb-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">Support Tickets</h1>
          <div className="flex items-center gap-2">
            <input
              type="text"
              className="ox-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by subject/requester/assignee"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as SupportTicket['status'] | '')}
              className="ox-input"
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="ox-section ox-card">
        {loading ? (
          <div className="py-8 text-center">Loading tickets…</div>
        ) : error ? (
          <div className="py-8 text-center text-red-500">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center">No tickets found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left">
                <tr className="border-b border-white/20">
                  <th className="py-3 px-2">ID</th>
                  <th className="py-3 px-2">Subject</th>
                  <th className="py-3 px-2">Category</th>
                  <th className="py-3 px-2">Requester</th>
                  <th className="py-3 px-2">Assignee</th>
                  <th className="py-3 px-2">Status</th>
                  <th className="py-3 px-2">Created</th>
                  <th className="py-3 px-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} className="border-b border-white/10 hover:bg-white/5">
                    <td className="py-3 px-2">#{t.id}</td>
                    <td className="py-3 px-2">{t.subject}</td>
                    <td className="py-3 px-2">{t.category}</td>
                    <td className="py-3 px-2">{t.requesterName}</td>
                    <td className="py-3 px-2">{t.assignedTo ?? '-'}
                      {t.assignedTo ? null : (
                        <button className="ox-link-btn-sm ml-2" onClick={() => assignToMe(t)}>
                          Assign to me
                        </button>
                      )}
                    </td>
                    <td className="py-3 px-2"><span className={statusClass(t.status)}>{t.status}</span></td>
                    <td className="py-3 px-2">{formatDate(t.createdAt)}</td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <button className="ox-btn-sm" onClick={() => setStatus(t, 'IN_PROGRESS')}>Mark In Progress</button>
                        <button className="ox-btn-sm" onClick={() => setStatus(t, 'RESOLVED')}>Resolve</button>
                        <button className="ox-link-btn-sm text-red-400" onClick={() => setStatus(t, 'CLOSED')}>Close</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
