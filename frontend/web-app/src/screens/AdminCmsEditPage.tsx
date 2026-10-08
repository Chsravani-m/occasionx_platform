import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "@/context/NotificationContext";

interface CmsSection {
  slug: string;
  title: string;
  content: string;
}

export const AdminCmsEditPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { slug } = useParams<{ slug: string }>();
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [section, setSection] = useState<CmsSection | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [saving, setSaving] = useState(false);

  // Role protection (mock)
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const role = localStorage.getItem("role") || "USER";
    if (!token || role !== "ADMIN") {
      setAccessDenied(true);
      setLoading(false);
    }
  }, []);

  // Mock load
  useEffect(() => {
    if (accessDenied) return;
    setLoading(true);
    const t = setTimeout(() => {
      const defaultContent =
        "<h2>Heading</h2>\n<p>This is a mock CMS content area for the section. Replace with your policy or info.</p>";
      const s: CmsSection = {
        slug: slug || "about-us",
        title: slug === "terms" ? "Terms & Conditions" : slug === "privacy" ? "Privacy Policy" : slug === "refund" ? "Refund Policy" : "About Us",
        content: defaultContent,
      };
      setSection(s);
      setDraftTitle(s.title);
      setDraftContent(s.content);
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [accessDenied, slug]);

  const onSave = async () => {
    try {
      setSaving(true);
      // In future: await api.put(`/admin/cms/${slug}`, { title: draftTitle, content: draftContent });
      await new Promise((res) => setTimeout(res, 400));
      toast.success("CMS section saved (mock)");
      navigate("/admin/dashboard");
    } catch (e: any) {
      toast.error(e?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (accessDenied) {
    return (
      <main className="ox-main ox-dashboard-admin p-6 text-white">
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-4">Access denied. Admins only.</div>
      </main>
    );
  }

  if (loading || !section) {
    return <main className="ox-main ox-dashboard-admin p-6 text-white">Loading CMS section…</main>;
  }

  return (
    <main className="ox-main ox-dashboard-admin mx-auto max-w-5xl px-4 py-6 text-white">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Edit CMS: {section.slug}</h1>
        <div className="flex gap-2">
          <button
            className="rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-white hover:bg-white/20"
            onClick={() => navigate("/admin/dashboard")}
          >
            Cancel
          </button>
          <button
            className="rounded-lg bg-indigo-500 px-4 py-2 font-medium text-white hover:bg-indigo-600 disabled:opacity-60"
            disabled={saving}
            onClick={onSave}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur-xl">
        <div className="mb-4">
          <label className="mb-1 block text-sm text-white/80">Title</label>
          <input
            type="text"
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            className="w-full rounded-md border border-white/20 bg-black/20 p-2 text-white focus:border-white/40 focus:outline-none"
            placeholder="Section title"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-white/80">Content (rich text)</label>
          <textarea
            rows={12}
            value={draftContent}
            onChange={(e) => setDraftContent(e.target.value)}
            className="w-full rounded-md border border-white/20 bg-black/20 p-2 font-mono text-white focus:border-white/40 focus:outline-none"
            placeholder="Write HTML or markdown (mock)"
          />
          <p className="mt-2 text-xs text-white/60">Tip: Paste HTML/Markdown. A rich text editor will be integrated later.</p>
        </div>
      </div>
    </main>
  );
};

export default AdminCmsEditPage;
