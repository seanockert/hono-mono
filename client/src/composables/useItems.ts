import type { Item, ItemListParams } from 'shared';
import { createResource } from '../lib/resource';

export const { useList: useItems, useOne: useItem } = createResource<Item, ItemListParams>(
  'items',
  'Item',
);
