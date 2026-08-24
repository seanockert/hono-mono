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
