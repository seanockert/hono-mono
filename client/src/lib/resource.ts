import {
  ref,
  computed,
  onMounted,
  onScopeDispose,
  watch,
  toValue,
  type MaybeRefOrGetter,
  type Ref,
} from 'vue';
import type { PaginatedResponse } from 'shared';
import { SERVER_URL, authHeaders } from './config';

type Row = { id: string; title: string; slug: string; content: string | null; status: string };
type ListParams = Record<string, string | number | undefined>;
type WriteInput<T extends Row> = Partial<Pick<T, 'title' | 'content' | 'status'>> & {
  slug?: string;
};

class HttpError extends Error {
  status: number;
  constructor(status: number) {
    super(`Request failed: ${status}`);
    this.status = status;
  }
}

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(`${SERVER_URL}/api/${path}`, {
    credentials: 'include',
    ...init,
    headers: { ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...authHeaders() },
  });
  if (!res.ok) throw new HttpError(res.status);
  return res.status === 204 ? (undefined as T) : res.json();
};

const useDelayedFlag = (source: Ref<boolean>, delay = 150, minDuration = 300) => {
  const visible = ref(false);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let shownAt = 0;

  const clear = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };

  watch(source, (active) => {
    clear();

    if (active) {
      // Already visible from an earlier cycle whose hide was still pending.
      if (visible.value) return;
      timer = setTimeout(() => {
        visible.value = true;
        shownAt = Date.now();
      }, delay);
      return;
    }

    if (!visible.value) return;
    const remaining = minDuration - (Date.now() - shownAt);
    if (remaining <= 0) {
      visible.value = false;
      return;
    }
    timer = setTimeout(() => {
      visible.value = false;
    }, remaining);
  });

  onScopeDispose(clear);
  return visible;
};

/** `path` is the API segment ("items"), `label` names it in errors ("Item"). */
export const createResource = <T extends Row, P extends ListParams = ListParams>(
  path: string,
  label: string,
) => {
  const describe = (err: unknown, action: string) =>
    err instanceof HttpError && err.status === 404
      ? `${label} not found`
      : err instanceof Error
        ? err.message
        : `Failed to ${action} ${path}`;

  const useList = () => {
    const rows = ref<T[]>([]) as Ref<T[]>;
    const total = ref(0);
    const isLoading = ref(false);
    const hasLoaded = ref(false);
    const error = ref('');
    const params = ref<P>({ page: 1, limit: 20 } as unknown as P);
    const showLoading = useDelayedFlag(computed(() => isLoading.value && !hasLoaded.value));

    const fetchAll = async () => {
      isLoading.value = true;
      error.value = '';
      try {
        const query = new URLSearchParams();
        for (const [key, value] of Object.entries(params.value)) {
          if (value !== undefined && value !== '') query.set(key, String(value));
        }
        const data = await request<PaginatedResponse<T>>(`${path}?${query}`);
        rows.value = data.data;
        total.value = data.total;
      } catch (err) {
        error.value = describe(err, 'fetch');
      } finally {
        isLoading.value = false;
        hasLoaded.value = true;
      }
    };

    const write = async <R>(id: string | null, init: RequestInit) => {
      const result = await request<R>(id ? `${path}/${id}` : path, init);
      await fetchAll();
      return result;
    };

    watch(params, fetchAll, { deep: true });
    onMounted(fetchAll);

    return {
      rows,
      total,
      isLoading,
      showLoading,
      hasLoaded,
      error,
      params,
      fetchAll,
      create: (data: WriteInput<T> & Pick<T, 'title'>) =>
        write<T>(null, { method: 'POST', body: JSON.stringify(data) }),
      update: (id: string, data: WriteInput<T>) =>
        write<T>(id, { method: 'PUT', body: JSON.stringify(data) }),
      remove: (id: string) => write<void>(id, { method: 'DELETE' }),
    };
  };

  const useOne = (slugRef: MaybeRefOrGetter<string>) => {
    const row = ref<T | null>(null) as Ref<T | null>;
    const isLoading = ref(false);
    const error = ref('');

    const fetchOne = async () => {
      const slug = toValue(slugRef);
      if (!slug) return;
      isLoading.value = true;
      error.value = '';
      try {
        row.value = await request<T>(`${path}/${slug}`);
      } catch (err) {
        error.value = describe(err, 'fetch');
      } finally {
        isLoading.value = false;
      }
    };

    watch(() => toValue(slugRef), fetchOne, { immediate: true });

    return { row, isLoading, error, fetchOne };
  };

  return { useList, useOne };
};
