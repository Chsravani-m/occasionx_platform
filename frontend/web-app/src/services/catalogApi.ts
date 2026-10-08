// src/services/catalogApi.ts

import { api } from "@/lib/apiClient";

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

export interface EventType {
  id: string;
  name: string;
  description?: string | null;
  is_inbuilt?: boolean;
}

export const getCategories = async (): Promise<Category[]> => {
  const res = await api.get(
    "/catalog/categories"
  );

  return res.data;
};

export const getSubcategories = async (
  categoryId: string
): Promise<Subcategory[]> => {
  const res = await api.get(
    `/catalog/categories/${categoryId}/subcategories`
  );

  return res.data;
};

export interface CategoryTreeNode {
  id: string;
  name: string;
  subcategories: { id: string; name: string }[];
}

// Every category with its subcategories nested in one call - used by the
// header's search suggestions so typing works before a category has been
// picked (see Header.tsx's allSubcategories state), instead of only after
// getSubcategories(categoryId) above has something to filter.
export const getCategoryTree = async (): Promise<CategoryTreeNode[]> => {
  const res = await api.get(
    "/catalog/categories/with-subcategories"
  );

  return res.data;
};

export const getEventTypes = async (): Promise<EventType[]> => {
  const res = await api.get(
    "/catalog/event-types"
  );

  return res.data;
};

export const getEventTypeCategories = async (
  eventTypeId: string
): Promise<Category[]> => {
  const res = await api.get(
    `/catalog/event-types/${eventTypeId}/categories`
  );

  return res.data;
};

export interface CategoryPayload {
  name: string;
  description?: string | null;
}

export const createCategory = async (
  payload: CategoryPayload
): Promise<Category> => {
  const res = await api.post(
    "/catalog/categories",
    payload
  );

  return res.data;
};

export const updateCategory = async (
  categoryId: string,
  payload: Partial<CategoryPayload>
): Promise<Category> => {
  const res = await api.put(
    `/catalog/categories/${categoryId}`,
    payload
  );

  return res.data;
};

export const deleteCategory = async (
  categoryId: string
): Promise<void> => {
  await api.delete(
    `/catalog/categories/${categoryId}`
  );
};

export interface SubcategoryPayload {
  name: string;
  description?: string | null;
}

export const createSubcategory = async (
  categoryId: string,
  payload: SubcategoryPayload
): Promise<Subcategory> => {
  const res = await api.post(
    `/catalog/categories/${categoryId}/subcategories`,
    payload
  );

  return res.data;
};

export const updateSubcategory = async (
  subcategoryId: string,
  payload: Partial<SubcategoryPayload>
): Promise<Subcategory> => {
  const res = await api.put(
    `/catalog/categories/subcategories/${subcategoryId}`,
    payload
  );

  return res.data;
};

export const deleteSubcategory = async (
  subcategoryId: string
): Promise<void> => {
  await api.delete(
    `/catalog/categories/subcategories/${subcategoryId}`
  );
};

export interface EventTypePayload {
  name: string;
  description?: string | null;
  is_inbuilt?: boolean;
}

export const createEventType = async (
  payload: EventTypePayload
): Promise<EventType> => {
  const res = await api.post(
    "/catalog/event-types",
    payload
  );

  return res.data;
};

export const updateEventType = async (
  eventTypeId: string,
  payload: Partial<EventTypePayload>
): Promise<EventType> => {
  const res = await api.put(
    `/catalog/event-types/${eventTypeId}`,
    payload
  );

  return res.data;
};

export const deleteEventType = async (
  eventTypeId: string
): Promise<void> => {
  await api.delete(
    `/catalog/event-types/${eventTypeId}`
  );
};