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
