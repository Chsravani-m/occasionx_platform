import { api } from "@/core/api/client";

export interface Category {
  id: string;
  name: string;
  description?: string | null;
}

export interface Subcategory {
  id: string;
  category_id: string;
  name: string;
  description?: string | null;
}

export const getCategories = async (): Promise<Category[]> => {
  const res = await api.get("/catalog/categories");
  return res.data;
};

export const getSubcategories = async (categoryId: string): Promise<Subcategory[]> => {
  const res = await api.get(`/catalog/categories/${categoryId}/subcategories`);
  return res.data;
};

export interface FullCatalog {
  event_types: { id: string; name: string }[];
  categories: Category[];
  subcategories: Subcategory[];
}

// Every category + subcategory in one call - used to build the search
// bar's suggestion list (AppHeader.tsx) without firing a request per
// keystroke. Small enough (a few hundred rows at most) to fetch once
// and filter client-side.
export const getFullCatalog = async (): Promise<FullCatalog> => {
  const res = await api.get("/catalog/full");
  return res.data;
};
