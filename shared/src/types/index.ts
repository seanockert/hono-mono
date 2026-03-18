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

export type ItemStatus = 'draft' | 'published' | 'archived';

export interface Item {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  status: ItemStatus;
  authorId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ItemListParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: ItemStatus;
  sortBy?: 'createdAt' | 'updatedAt' | 'title';
  sortOrder?: 'asc' | 'desc';
};

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};
