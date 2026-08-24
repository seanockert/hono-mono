export type __Model__Status = 'draft' | 'published' | 'archived';

export interface __Model__ {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  status: __Model__Status;
  authorId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type __Model__ListParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: __Model__Status;
  sortBy?: 'createdAt' | 'updatedAt' | 'title';
  sortOrder?: 'asc' | 'desc';
};
