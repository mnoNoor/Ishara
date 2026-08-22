export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  dominantHand: DominantHand | "";
}

export type UserRole = "admin" | "teacher" | "user";
export type DominantHand = "right" | "left";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  dominantHand?: DominantHand | null;
  profileImage?: string | null;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: User;
}
