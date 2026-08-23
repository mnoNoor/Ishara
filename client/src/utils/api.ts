import type {
  LoginCredentials,
  RegisterCredentials,
  AuthResponse,
} from "../types/auth.types";

export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8080/api";

interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
      method: "POST",
      credentials: "include",
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options: ApiRequestOptions = {},
  retryOnUnauthorized = true,
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

  if (
    response.status === 401 &&
    retryOnUnauthorized &&
    !endpoint.startsWith("/auth/")
  ) {
    if (!refreshPromise) {
      refreshPromise = tryRefreshToken().finally(() => {
        refreshPromise = null;
      });
    }
    const refreshed = await refreshPromise;
    if (refreshed) {
      return apiRequest<T>(endpoint, options, false);
    }
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.message || data?.error || "An error occurred while processing the request",
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
