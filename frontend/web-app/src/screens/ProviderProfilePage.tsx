// Copilot: Implement the Provider Profile Page for OccasionXplore.
// This is the PUBLIC view when a user clicks "View Details" on search results.
// Tech: React + TypeScript + React Router v6 + TailwindCSS.
// Route: /provider/:id

import React, { useEffect, useMemo, useState } from 'react';
import { useToast, useConfirm } from "@/context/NotificationContext";
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/apiClient';

export interface ProviderProfile {
  id: number;
  businessName: string;
  description?: string;
  rating: number;
  ratingCount: number;
  locationLabel: string;
  categories: { id: number; name: string; subcategories: string[] }[];
  amenities: string[];
  startingPrice: number;
  offers: { id: number; title: string; description?: string }[];
  gallery: { id: number; url: string; type: 'IMAGE' | 'VIDEO' }[];
}

const ProviderProfilePage: React.FC<{ title?: string }> = ({ title }) => {
  const toast = useToast();
  const confirmDialog = useConfirm();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProviderProfile | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get<{ success: boolean; data?: ProviderProfile; message?: string }>(`/providers/${id}/profile`);
        if (!res.data?.success || !res.data?.data) {
          setError(res.data?.message || 'Provider not found');
          setProfile(null);
        } else {
          setProfile(res.data.data);
        }
      } catch (e: any) {
        if (e?.response?.status === 404) setError('Provider not found'); else setError('Failed to load provider');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchProfile();
  }, [id]);

  const heroImage = useMemo(() => {
    const img = profile?.gallery?.find((g) => g.type === 'IMAGE');
    return img?.url || '';
  }, [profile]);

  const onBook = () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      toast.error('Login required');
      return;
    }
    navigate(`/book/${id}`);
  };

  const onViewAllReviews = () => navigate(`/provider/${id}/reviews`);

  if (loading) return <div className="ox-section">Loading...</div>;
  if (error) return <div className="ox-section">{error}</div>;
  if (!profile) return <div className="ox-section">Provider not found</div>;

  return (
    <div>
      {/* Hero Section */}
      <section className="relative h-56 md:h-72 w-full overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: heroImage ? `url('${heroImage}')` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(8px)',
            transform: 'scale(1.1)',
            opacity: 0.5,
          }}
        />
        <div className="relative z-10 h-full flex items-center justify-center">
          <div className="ox-glass px-6 py-4">
            <h1 className="text-2xl md:text-3xl font-bold">{profile.businessName}</h1>
            <p className="ox-meta">⭐ {profile.rating.toFixed(1)} ({profile.ratingCount}) · {profile.locationLabel}</p>
            <p className="ox-meta">From ₹{profile.startingPrice.toLocaleString('en-IN')}</p>
            <div className="mt-3 flex items-center gap-3">
              <button className="ox-search-btn" onClick={onBook}>Book Service</button>
              <button className="ox-link-btn" onClick={() => toast.error('Contact placeholder')}>Call / Contact</button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Sections */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* About */}
        <section className="ox-glass p-4">
          <h2 className="text-xl font-semibold mb-2">About</h2>
          <p className="opacity-90">{profile.description || 'No description provided.'}</p>
        </section>

        {/* Categories & Specializations */}
        <section className="ox-glass p-4">
          <h2 className="text-xl font-semibold mb-2">Categories & Specializations</h2>
          <div className="space-y-2">
            {profile.categories?.map((c) => (
              <div key={c.id}>
                <div className="font-medium">{c.name}</div>
                <div className="flex flex-wrap gap-2 mt-1">
                  {c.subcategories?.map((s) => (
                    <span key={s} className="px-2 py-1 rounded bg-white/10 border border-white/20 text-sm">{s}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Amenities */}
        <section className="ox-glass p-4">
          <h2 className="text-xl font-semibold mb-2">Amenities</h2>
          <div className="flex flex-wrap gap-2">
            {profile.amenities?.length ? (
              profile.amenities.map((a) => (
                <span key={a} className="px-2 py-1 rounded bg-white/10 border border-white/20 text-sm">{a}</span>
              ))
            ) : (
              <div className="ox-meta">No amenities listed.</div>
            )}
          </div>
        </section>

        {/* Active Offers */}
        <section className="ox-glass p-4">
          <h2 className="text-xl font-semibold mb-2">Offers</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {profile.offers?.length ? (
              profile.offers.map((o) => (
                <div key={o.id} className="ox-glass p-3">
                  <div className="font-medium">{o.title}</div>
                  <div className="ox-meta">{o.description || 'Limited time offer.'}</div>
                </div>
              ))
            ) : (
              <div className="ox-meta">No active offers.</div>
            )}
          </div>
        </section>

        {/* Gallery */}
        <section className="ox-glass p-4">
          <h2 className="text-xl font-semibold mb-2">Gallery</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {profile.gallery?.length ? (
              profile.gallery.map((g) => (
                <div key={g.id} className="relative w-full h-24 md:h-32 bg-white/10 rounded overflow-hidden">
                  {g.type === 'IMAGE' ? (
                    <img src={g.url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">VIDEO</div>
                  )}
                </div>
              ))
            ) : (
              <div className="ox-meta">No gallery items.</div>
            )}
          </div>
        </section>

        {/* Reviews preview */}
        <section className="ox-glass p-4">
          <h2 className="text-xl font-semibold mb-2">Reviews</h2>
          <div className="ox-meta">Average rating: {profile.rating.toFixed(1)} ({profile.ratingCount})</div>
          <div className="mt-3">
            <button className="ox-link-btn" onClick={onViewAllReviews}>View All Reviews</button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default ProviderProfilePage;
