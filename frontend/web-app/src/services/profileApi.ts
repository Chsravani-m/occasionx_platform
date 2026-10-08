import { api } from "@/lib/apiClient";

export const getProfile = async () => {
    const token = localStorage.getItem("accessToken");

    const res = await api.get(
        "/users/profile",
        {
        headers: {
            Authorization: `Bearer ${token}`,
        },
        }
    );

    return res.data;
    };

    export const updateProfile = async (
    data: unknown
    ) => {
    const token = localStorage.getItem("accessToken");

    const res = await api.put(
        "/users/profile",
        data,
        {
        headers: {
            Authorization: `Bearer ${token}`,
        },
        }
    );

    return res.data;
};