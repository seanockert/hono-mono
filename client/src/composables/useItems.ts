import { api } from '../lib/api';
import { createResource } from '../lib/resource';

export const { useList: useItems, useOne: useItem } = createResource(api.items, 'Item');
