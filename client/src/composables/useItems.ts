import { ref, onMounted, watch, toValue, type MaybeRefOrGetter } from 'vue';
import type { Item, ItemListParams, PaginatedResponse } from 'shared';
import { SERVER_URL, authHeaders } from '../lib/config';

export const useItems = () => {
  const items = ref<Item[]>([]);
  const total = ref(0);
  const isLoading = ref(false);
  const error = ref<string>('');
  const params = ref<ItemListParams>({ page: 1, limit: 20 });

  const fetchItems = async () => {
    isLoading.value = true;
    error.value = '';

    try {
      const query = new URLSearchParams();
      const p = params.value;
      if (p.page) query.set('page', String(p.page));
      if (p.limit) query.set('limit', String(p.limit));
      if (p.search) query.set('search', p.search);
      if (p.status) query.set('status', p.status);
      if (p.sortBy) query.set('sortBy', p.sortBy);
      if (p.sortOrder) query.set('sortOrder', p.sortOrder);

      const res = await fetch(`${SERVER_URL}/api/items?${query}`, {
        credentials: 'include',
      });

      if (!res.ok) throw new Error(`Request failed: ${res.status}`);

      const data: PaginatedResponse<Item> = await res.json();
      items.value = data.data;
      total.value = data.total;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch items';
    } finally {
      isLoading.value = false;
    }
  };

  const createItem = async (data: {
    title: string;
    content?: string;
    status?: Item['status'];
  }) => {
    const res = await fetch(`${SERVER_URL}/api/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Failed to create item: ${res.status}`);
    await fetchItems();
    return res.json() as Promise<Item>;
  };

  const updateItem = async (
    id: string,
    data: Partial<Pick<Item, 'title' | 'content' | 'status'>> & { slug?: string },
  ) => {
    const res = await fetch(`${SERVER_URL}/api/items/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Failed to update item: ${res.status}`);
    await fetchItems();
    return res.json() as Promise<Item>;
  };

  const deleteItem = async (id: string) => {
    const res = await fetch(`${SERVER_URL}/api/items/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`Failed to delete item: ${res.status}`);
    await fetchItems();
  };

  watch(params, fetchItems, { deep: true });
  onMounted(fetchItems);

  return { items, total, isLoading, error, params, fetchItems, createItem, updateItem, deleteItem };
};

export const useItem = (slugRef: MaybeRefOrGetter<string>) => {
  const item = ref<Item | null>(null);
  const isLoading = ref(false);
  const error = ref<string>('');

  const fetchItem = async () => {
    const slug = toValue(slugRef);
    if (!slug) return;
    isLoading.value = true;
    error.value = '';
    try {
      const res = await fetch(`${SERVER_URL}/api/items/${slug}`, {
        credentials: 'include',
      });
      if (res.status === 404) {
        error.value = 'Item not found';
        return;
      }
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      item.value = (await res.json()) as Item;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch item';
    } finally {
      isLoading.value = false;
    }
  };

  watch(() => toValue(slugRef), fetchItem, { immediate: true });

  return { item, isLoading, error };
};
