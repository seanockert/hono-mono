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

/** The publication states of a CRUD row. */
export const STATUS = ['draft', 'published', 'archived'] as const;

export type Status = (typeof STATUS)[number];
