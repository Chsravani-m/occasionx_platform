import React, { useMemo, useState } from 'react';
import { useToast } from '@/context/NotificationContext';

interface SupportTicket {
  id: number;
  subject: string;
  category: 'BOOKING' | 'PAYMENT' | 'ACCOUNT' | 'OTHER';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  createdAt: string;
}

const CATEGORY_OPTIONS: SupportTicket['category'][] = ['BOOKING', 'PAYMENT', 'ACCOUNT', 'OTHER'];

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

export const SupportPage: React.FC = () => {
  const toast = useToast();
  const isLoggedIn = !!localStorage.getItem('accessToken');

  const [tickets, setTickets] = useState<SupportTicket[]>([
    {
      id: 1,
      subject: 'Issue with booking confirmation',
      category: 'BOOKING',
      status: 'RESOLVED',
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    },
    {
      id: 2,
      subject: 'Payment not reflecting',
      category: 'PAYMENT',
      status: 'IN_PROGRESS',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
  ]);

  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<SupportTicket['category']>('BOOKING');
  const [message, setMessage] = useState('');

  const nextId = useMemo(() => (tickets.length ? Math.max(...tickets.map((t) => t.id)) + 1 : 1), [tickets]);

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString();
    } catch {
      return iso;
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      toast.error('Subject and message are required');
      return;
    }
    const newTicket: SupportTicket = {
      id: nextId,
      subject: subject.trim(),
      category,
      status: 'OPEN',
      createdAt: new Date().toISOString(),
    };
    setTickets((prev) => [newTicket, ...prev]);
    setSubject('');
    setMessage('');
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold mb-4">Support & Help</h1>

      {!isLoggedIn ? (
        <div className="ox-section ox-card p-6">Please login to access support.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="ox-section ox-card p-6">
            <h2 className="text-lg font-medium mb-4">Create New Ticket</h2>
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block text-sm mb-1">Subject</label>
                <input
                  type="text"
                  className="ox-input w-full"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Briefly describe your issue"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Category</label>
                <select
                  className="ox-input w-full"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as SupportTicket['category'])}
                >
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">Message</label>
                <textarea
                  className="ox-input w-full h-32"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Provide details to help us assist you"
                />
              </div>
              <div>
                <button type="submit" className="ox-btn">
                  Submit Ticket
                </button>
              </div>
            </form>
          </div>

          <div className="ox-section ox-card p-6">
            <h2 className="text-lg font-medium mb-4">My Tickets</h2>
            {tickets.length === 0 ? (
              <div className="text-sm">No tickets yet.</div>
            ) : (
              <ul className="space-y-3">
                {tickets.map((t) => (
                  <li key={t.id} className="border border-white/10 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{t.subject}</div>
                      <div className="text-xs opacity-80">Category: {t.category} • Created: {formatDate(t.createdAt)}</div>
                    </div>
                    <span className={statusClass(t.status)}>{t.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
