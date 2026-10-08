import { api } from '../lib/api';
import { createResource } from '../lib/resource';

export const { useList: use__Models__, useOne: use__Model__ } = createResource(
  api.__models__,
  '__Model__',
);
