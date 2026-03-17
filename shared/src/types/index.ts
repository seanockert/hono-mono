export type ApiResponse = {
  message: string;
  success: true;
};

export type ApiErrorResponse = {
  error: string;
  success: false;
  message?: string;
};

export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  name?: string;
  email: string;
  emailVerified?: boolean;
  image?: string | null;
  role?: UserRole;
  createdAt?: Date;
  updatedAt?: Date;
}
