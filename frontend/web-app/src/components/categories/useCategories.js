import { useState, useEffect } from "react";
import axios from "axios";

const API = "http://localhost:8080";

export function useCategories() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoading(true);

        const response = await axios.get(
          `${API}/api/categories`
        );

        setData(response.data);
      } catch (err) {
        setError("Failed to load categories");
      } finally {
        setLoading(false);
      }
    };

    loadCategories();
  }, []);

  return { data, loading, error };
}

export function useSubCategories(categoryId) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!categoryId) {
      setData([]);
      return;
    }

    const loadSubCategories = async () => {
      try {
        setLoading(true);

        const response = await axios.get(
          `${API}/api/categories/${categoryId}/subcategories`
        );

        setData(response.data);
      } catch (err) {
        setError("Failed to load subcategories");
      } finally {
        setLoading(false);
      }
    };

    loadSubCategories();
  }, [categoryId]);

  return { data, loading, error };
}