"use client";

import { useEffect, useState } from "react";
import { useToast, useConfirm } from "@/context/NotificationContext";
import Link from "next/link";
import axios from "axios";

import {
  getCategories,
  getSubcategories,
  createCategory,
  updateCategory,
  deleteCategory,
  createSubcategory,
  updateSubcategory,
  deleteSubcategory,
  type Category,
  type Subcategory,
} from "@/services/catalogApi";

interface FormState {
  name: string;
  description: string;
}

const emptyForm: FormState = { name: "", description: "" };

function getErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err) && err.response?.data?.detail) {
    return err.response.data.detail;
  }

  return fallback;
}

export function AdminCategoriesPage() {
  const toast = useToast();
  const confirmDialog = useConfirm();
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategoriesByCategory, setSubcategoriesByCategory] = useState<
    Record<string, Subcategory[]>
  >({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [panelMode, setPanelMode] = useState<
    "category" | "subcategory" | null
  >(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [parentCategoryId, setParentCategoryId] = useState<string | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);

  const loadCategories = async () => {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const toggleExpand = async (categoryId: string) => {
    if (expandedId === categoryId) {
      setExpandedId(null);
      return;
    }

    setExpandedId(categoryId);

    if (!subcategoriesByCategory[categoryId]) {
      try {
        const subs = await getSubcategories(categoryId);

        setSubcategoriesByCategory((prev) => ({
          ...prev,
          [categoryId]: subs,
        }));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const refreshSubcategories = async (categoryId: string) => {
    const subs = await getSubcategories(categoryId);

    setSubcategoriesByCategory((prev) => ({
      ...prev,
      [categoryId]: subs,
    }));
  };

  const openCreateCategory = () => {
    setPanelMode("category");
    setEditingId(null);
    setParentCategoryId(null);
    setForm(emptyForm);
  };

  const openEditCategory = (category: Category) => {
    setPanelMode("category");
    setEditingId(category.id);
    setParentCategoryId(null);
    setForm({
      name: category.name,
      description: category.description || "",
    });
  };

  const openCreateSubcategory = (categoryId: string) => {
    setPanelMode("subcategory");
    setEditingId(null);
    setParentCategoryId(categoryId);
    setForm(emptyForm);
  };

  const openEditSubcategory = (categoryId: string, sub: Subcategory) => {
    setPanelMode("subcategory");
    setEditingId(sub.id);
    setParentCategoryId(categoryId);
    setForm({
      name: sub.name,
      description: sub.description || "",
    });
  };

  const closePanel = () => {
    setPanelMode(null);
    setEditingId(null);
    setParentCategoryId(null);
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
    };

    try {
      if (panelMode === "category") {
        if (editingId) {
          await updateCategory(editingId, payload);
        } else {
          await createCategory(payload);
        }

        await loadCategories();
      } else if (panelMode === "subcategory" && parentCategoryId) {
        if (editingId) {
          await updateSubcategory(editingId, payload);
        } else {
          await createSubcategory(parentCategoryId, payload);
        }

        await refreshSubcategories(parentCategoryId);
      }

      closePanel();
    } catch (err) {
      console.error(err);
      toast.error(getErrorMessage(err, "Something went wrong"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCategory = async (category: Category) => {
    if (
      !(await confirmDialog({
        message: `Delete "${category.name}"? This can't be undone.`,
        danger: true,
      }))
    ) {
      return;
    }

    try {
      await deleteCategory(category.id);
      await loadCategories();
    } catch (err) {
      console.error(err);
      toast.error(getErrorMessage(err, "Could not delete category"));
    }
  };

  const handleDeleteSubcategory = async (
    categoryId: string,
    sub: Subcategory
  ) => {
    if (!(await confirmDialog({ message: `Delete "${sub.name}"?`, danger: true }))) return;

    try {
      await deleteSubcategory(sub.id);
      await refreshSubcategories(categoryId);
    } catch (err) {
      console.error(err);
      toast.error(getErrorMessage(err, "Could not delete subcategory"));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F6F2] p-8">
        Loading categories...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F6F2] p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#1F2937]">
              Categories
            </h1>

            <p className="text-gray-500 mt-1">
              Manage categories and their subcategories.
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
              onClick={openCreateCategory}
              className="bg-[#1E3A8A] hover:bg-[#182E6E] text-white px-5 py-2.5 rounded-xl font-medium whitespace-nowrap"
            >
              + Add Category
            </button>
          </div>
        </div>

        <div className="mt-8 space-y-3">
          {categories.length === 0 && (
            <div className="rounded-3xl border border-dashed bg-white p-12 text-center text-gray-500">
              No categories yet.
            </div>
          )}

          {categories.map((category) => {
            const isExpanded = expandedId === category.id;
            const subs = subcategoriesByCategory[category.id] || [];

            return (
              <div
                key={category.id}
                className="bg-white rounded-2xl border shadow-sm overflow-hidden"
              >
                <div className="flex items-center justify-between px-5 py-4">
                  <button
                    type="button"
                    onClick={() => toggleExpand(category.id)}
                    className="flex items-center gap-3 text-left flex-1"
                  >
                    <span
                      className={`inline-block transition-transform ${
                        isExpanded ? "rotate-90" : ""
                      }`}
                    >
                      ▶
                    </span>

                    <div>
                      <p className="font-semibold text-[#1F2937]">
                        {category.name}
                      </p>

                      {category.description && (
                        <p className="text-sm text-gray-500">
                          {category.description}
                        </p>
                      )}
                    </div>
                  </button>

                  <div className="flex items-center gap-4 text-sm shrink-0">
                    <button
                      type="button"
                      onClick={() => openCreateSubcategory(category.id)}
                      className="text-[#5B756D] hover:underline font-medium"
                    >
                      + Subcategory
                    </button>

                    <button
                      type="button"
                      onClick={() => openEditCategory(category)}
                      className="text-gray-500 hover:text-[#5B756D]"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(category)}
                      className="text-gray-500 hover:text-red-500"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t bg-[#FAF8F4] px-5 py-3">
                    {subs.length === 0 ? (
                      <p className="text-sm text-gray-400 py-2">
                        No subcategories yet.
                      </p>
                    ) : (
                      <div className="divide-y">
                        {subs.map((sub) => (
                          <div
                            key={sub.id}
                            className="flex items-center justify-between py-2"
                          >
                            <div>
                              <p className="text-sm font-medium text-[#1F2937]">
                                {sub.name}
                              </p>

                              {sub.description && (
                                <p className="text-xs text-gray-500">
                                  {sub.description}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-3 text-xs shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  openEditSubcategory(category.id, sub)
                                }
                                className="text-gray-500 hover:text-[#5B756D]"
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteSubcategory(category.id, sub)
                                }
                                className="text-gray-500 hover:text-red-500"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {panelMode && (
        <div
          className="fixed inset-0 bg-black/30 z-50 flex justify-end"
          onClick={closePanel}
        >
          <div
            className="w-[420px] bg-white h-full overflow-y-auto shadow-2xl p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-[#1F2937]">
              {editingId ? "Edit" : "Add"}{" "}
              {panelMode === "category" ? "Category" : "Subcategory"}
            </h2>

            <div className="mt-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Name
                </label>

                <input
                  className="mt-1 w-full border rounded-lg px-3 py-2 outline-none focus:border-[#5B756D]"
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
                  className="mt-1 w-full border rounded-lg px-3 py-2 outline-none focus:border-[#5B756D]"
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </div>
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
