export type ApiResponse = {
  message: string;
  success: true;
}

export type ApiErrorResponse = {
  error: string;
  message?: string;
}

export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  name?: string;
  email: string;
  emailVerified?: boolean;
  image?: string | null;
  role?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
