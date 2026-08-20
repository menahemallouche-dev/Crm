import axios from "axios";
import { usePortalAuthStore } from "@/store/portal-auth-store";

/** Dedicated axios instance for the client portal — deliberately not shared with
 *  apiClient (staff app): a portal token must never be sent to a staff endpoint. */
export const portalApiClient = axios.create({
  baseURL: "/api/portal",
  headers: { "Content-Type": "application/json" },
});

portalApiClient.interceptors.request.use((config) => {
  const token = usePortalAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

portalApiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) usePortalAuthStore.getState().logout();
    return Promise.reject(error);
  },
);
