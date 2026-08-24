import type { __Model__, __Model__ListParams } from 'shared';
import { createResource } from '../lib/resource';

export const { useList: use__Models__, useOne: use__Model__ } = createResource<
  __Model__,
  __Model__ListParams
>('__models__', '__Model__');
