export type ApiResponse = {
  message: string;
};

export type ApiErrorResponse = {
  error: string;
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

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export * from './item';
