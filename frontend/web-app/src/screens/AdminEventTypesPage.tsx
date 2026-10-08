"use client";

import { useEffect, useState } from "react";
import { useToast, useConfirm } from "@/context/NotificationContext";
import Link from "next/link";
import axios from "axios";

import {
  getEventTypes,
  createEventType,
  updateEventType,
  deleteEventType,
  type EventType,
} from "@/services/catalogApi";

interface FormState {
  name: string;
  description: string;
  is_inbuilt: boolean;
}

const emptyForm: FormState = {
  name: "",
  description: "",
  is_inbuilt: false,
};

function getErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err) && err.response?.data?.detail) {
    return err.response.data.detail;
  }

  return fallback;
}

export function AdminEventTypesPage() {
  const toast = useToast();
  const confirmDialog = useConfirm();
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);

  const [showPanel, setShowPanel] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadEventTypes = async () => {
    try {
      const data = await getEventTypes();
      setEventTypes(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEventTypes();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowPanel(true);
  };

  const openEdit = (eventType: EventType) => {
    setEditingId(eventType.id);
    setForm({
      name: eventType.name,
      description: eventType.description || "",
      is_inbuilt: eventType.is_inbuilt || false,
    });
    setShowPanel(true);
  };

  const closePanel = () => {
    setShowPanel(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }

    setSubmitting(true);

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      is_inbuilt: form.is_inbuilt,
    };

    try {
      if (editingId) {
        await updateEventType(editingId, payload);
      } else {
        await createEventType(payload);
      }

      await loadEventTypes();
      closePanel();
    } catch (err) {
      console.error(err);
      toast.error(getErrorMessage(err, "Something went wrong"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (eventType: EventType) => {
    if (
      !(await confirmDialog({
        message: `Delete "${eventType.name}"? This can't be undone.`,
        danger: true,
      }))
    ) {
      return;
    }

    try {
      await deleteEventType(eventType.id);
      await loadEventTypes();
    } catch (err) {
      console.error(err);
      toast.error(getErrorMessage(err, "Could not delete event type"));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F6F2] p-8">
        Loading event types...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F6F2] p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#1F2937]">
              Event Types
            </h1>

            <p className="text-gray-500 mt-1">
              Configure the event types customers can plan for.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/admin/dashboard"
              className="border border-[#1E3A8A] text-[#1E3A8A] hover:bg-white px-5 py-2.5 rounded-xl font-semibold transition whitespace-nowrap"
            >
              Go to Dashboard
            </Link>

            <button
              type="button"
              onClick={openCreate}
              className="bg-[#1E3A8A] hover:bg-[#182E6E] text-white px-5 py-2.5 rounded-xl font-medium whitespace-nowrap"
            >
              + Add Event Type
            </button>
          </div>
        </div>

        <div className="mt-8 space-y-3">
          {eventTypes.length === 0 && (
            <div className="rounded-3xl border border-dashed bg-white p-12 text-center text-gray-500">
              No event types yet.
            </div>
          )}

          {eventTypes.map((eventType) => (
            <div
              key={eventType.id}
              className="bg-white rounded-2xl border shadow-sm flex items-center justify-between px-5 py-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-[#1F2937]">
                    {eventType.name}
                  </p>

                  {eventType.is_inbuilt && (
                    <span className="bg-[#C89B3C]/10 text-[#C89B3C] text-xs font-semibold px-2 py-0.5 rounded-full">
                      OX In-Built
                    </span>
                  )}
                </div>

                {eventType.description && (
                  <p className="text-sm text-gray-500">
                    {eventType.description}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-4 text-sm shrink-0">
                <button
                  type="button"
                  onClick={() => openEdit(eventType)}
                  className="text-gray-500 hover:text-[#1E3A8A]"
                >
                  Edit
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(eventType)}
                  className="text-gray-500 hover:text-red-500"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showPanel && (
        <div
          className="fixed inset-0 bg-black/30 z-50 flex justify-end"
          onClick={closePanel}
        >
          <div
            className="w-[420px] bg-white h-full overflow-y-auto shadow-2xl p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-[#1F2937]">
              {editingId ? "Edit" : "Add"} Event Type
            </h2>

            <div className="mt-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Name
                </label>

                <input
                  className="mt-1 w-full border rounded-lg px-3 py-2 outline-none focus:border-[#1E3A8A]"
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">
                  Description
                </label>

                <textarea
                  className="mt-1 w-full border rounded-lg px-3 py-2 outline-none focus:border-[#1E3A8A]"
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </div>

              <label className="flex items-center gap-2 text-sm font-medium text-gray-600">
                <input
                  type="checkbox"
                  checked={form.is_inbuilt}
                  onChange={(e) =>
                    setForm({ ...form, is_inbuilt: e.target.checked })
                  }
                  className="h-4 w-4 accent-[#1E3A8A]"
                />
                OX In-Built Package
              </label>
            </div>

            <div className="mt-8 flex gap-3">
              <button
                type="button"
                onClick={closePanel}
                className="flex-1 border rounded-xl py-2.5 font-medium text-gray-600"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={submitting}
                className="flex-1 bg-[#1E3A8A] hover:bg-[#182E6E] text-white rounded-xl py-2.5 font-medium disabled:opacity-60"
              >
                {submitting ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
