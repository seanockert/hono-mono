import { ref, onMounted, watch, toValue, type MaybeRefOrGetter, type Ref } from 'vue';
import {
  DetailedError,
  parseResponse,
  type ClientResponse,
  type InferRequestType,
  type InferResponseType,
} from 'hono/client';
import { errorText } from './api';

type Call = (...args: never[]) => Promise<ClientResponse<unknown>>;

/** The shape of a `createCrudRoutes` endpoint on the RPC client, for example `api.items`. */
type CrudEndpoint = {
  $get: Call;
  $post: Call;
  ':idOrSlug': { $get: Call };
  ':id': { $put: Call; $delete: Call };
};

/** `T[K]`, for a `T` that TypeScript cannot index while it is generic. */
type Field<T, K extends string> = T extends Record<K, infer V> ? V : never;

/** `label` is the name in errors ("Item"). */
export const createResource = <E extends CrudEndpoint>(endpoint: E, label: string) => {
  type Row = InferResponseType<E[':idOrSlug']['$get'], 200>;
  type Page = InferResponseType<E['$get'], 200>;
  type ListParams = Field<InferRequestType<E['$get']>, 'query'>;
  type CreateInput = Field<InferRequestType<E['$post']>, 'json'>;
  type UpdateInput = Field<InferRequestType<E[':id']['$put']>, 'json'>;

  // The constraint loses the argument types, so give them back here.
  const call = <R>(fn: Call, args: object) => parseResponse(fn(args as never)) as Promise<R>;

  const describe = (err: unknown) =>
    err instanceof DetailedError && err.statusCode === 404
      ? `${label} not found`
      : errorText(err, `Failed to fetch ${label}`);

  const useList = () => {
    const rows = ref<Row[]>([]) as Ref<Row[]>;
    const total = ref(0);
    const isLoading = ref(false);
    const hasLoaded = ref(false);
    const error = ref('');
    const params = ref({ page: '1', limit: '20' } as ListParams) as Ref<ListParams>;

    const fetchAll = async () => {
      isLoading.value = true;
      error.value = '';
      try {
        const page = await call<Page & { data: Row[]; total: number }>(endpoint.$get, {
          query: params.value,
        });
        rows.value = page.data;
        total.value = page.total;
      } catch (err) {
        error.value = describe(err);
      } finally {
        isLoading.value = false;
        hasLoaded.value = true;
      }
    };

    /** Sends a write, then loads the list again. A failed write throws the server message. */
    const write = async <R>(run: () => Promise<R>) => {
      let result: R;
      try {
        result = await run();
      } catch (err) {
        throw new Error(errorText(err, `Failed to save ${label}`), { cause: err });
      }
      await fetchAll();
      return result;
    };

    watch(params, fetchAll, { deep: true });
    onMounted(fetchAll);

    return {
      rows,
      total,
      isLoading,
      hasLoaded,
      error,
      params,
      fetchAll,
      create: (json: CreateInput) => write(() => call<Row>(endpoint.$post, { json })),
      update: (id: string, json: UpdateInput) =>
        write(() => call<Row>(endpoint[':id'].$put, { param: { id }, json })),
      remove: (id: string) =>
        write(() => call<undefined>(endpoint[':id'].$delete, { param: { id } })),
    };
  };

  const useOne = (idOrSlugRef: MaybeRefOrGetter<string>) => {
    const row = ref<Row | null>(null) as Ref<Row | null>;
    const isLoading = ref(false);
    const error = ref('');

    const fetchOne = async () => {
      const idOrSlug = toValue(idOrSlugRef);
      if (!idOrSlug) return;
      isLoading.value = true;
      error.value = '';
      try {
        row.value = await call<Row>(endpoint[':idOrSlug'].$get, { param: { idOrSlug } });
      } catch (err) {
        error.value = describe(err);
      } finally {
        isLoading.value = false;
      }
    };

    watch(() => toValue(idOrSlugRef), fetchOne, { immediate: true });

    return { row, isLoading, error, fetchOne };
  };

  return { useList, useOne };
};
