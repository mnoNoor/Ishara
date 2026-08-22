import type {
  LoginCredentials,
  RegisterCredentials,
  AuthResponse,
} from "../types/auth.types";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8080/api";

interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

async function apiRequest<T>(
  endpoint: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { body, headers, ...rest } = options;

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...rest,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.message || "An error occurred while processing the request",
    );
  }

  return data as T;
}

export const authApi = {
  login: (credentials: LoginCredentials) =>
    apiRequest<AuthResponse>("/auth/login", {
      method: "POST",
      body: credentials,
    }),

  register: (credentials: RegisterCredentials) =>
    apiRequest<AuthResponse>("/auth/register", {
      method: "POST",
      body: credentials,
    }),

  logout: () => apiRequest<AuthResponse>("/auth/logout", { method: "POST" }),

  getCurrentUser: () => apiRequest<AuthResponse>("/auth/me", { method: "GET" }),

  refreshToken: () =>
    apiRequest<AuthResponse>("/auth/refresh-token", { method: "POST" }),
};
