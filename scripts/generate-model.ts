#!/usr/bin/env bun
/**
 * Model scaffolder — generates CRUD boilerplate for a new model.
 *
 * Usage:
 *   bun run generate <modelName> [pluralName]
 *
 * Example:
 *   bun run generate post
 *   bun run generate category categories
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { root, resolveModel, runMigrate } from './lib';

const modelArg = process.argv[2];

if (!modelArg) {
  console.error('Usage: bun run generate <modelName> [pluralName]');
  console.error('Example: bun run generate category categories');
  process.exit(1);
}

const { model, Model, models, Models } = resolveModel(modelArg, process.argv[3]);
const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, '').replace(/[T:]/g, '-');

const writeFile = (path: string, content: string) => {
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(path, content, 'utf-8');
  console.log(`  Created: ${path.replace(root + '/', '')}`);
};

// ─── 1. SQL Migration ────────────────────────────────────────────────────────

const sqlPath = join(root, `server/migrations/${timestamp}_create_${models}.sql`);
const sqlContent = `CREATE TABLE IF NOT EXISTS "${model}" (
  "id"        TEXT NOT NULL PRIMARY KEY,
  "title"     TEXT NOT NULL,
  "slug"      TEXT NOT NULL UNIQUE,
  "content"   TEXT,
  "status"    TEXT NOT NULL DEFAULT 'draft',
  "authorId"  TEXT REFERENCES "user" ("id") ON DELETE SET NULL,
  "createdAt" TEXT NOT NULL,
  "updatedAt" TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS "${model}_slug_idx"      ON "${model}" ("slug");
CREATE INDEX IF NOT EXISTS "${model}_status_idx"    ON "${model}" ("status");
CREATE INDEX IF NOT EXISTS "${model}_createdAt_idx" ON "${model}" ("createdAt");
`;

// ─── 2. Server Route ─────────────────────────────────────────────────────────

const routePath = join(root, `server/src/routes/${models}.ts`);
const routeContent = `import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { createDb } from '../lib/db';
import { requireAuth, type AuthVariables } from '../lib/middleware';
import { getEnv, type AppEnv } from '../lib/env';
import { slugify, UUID_REGEX } from '../lib/utils';

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'title']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const createSchema = z.object({
  title: z.string().min(1),
  content: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
});

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().optional(),
  content: z.string().nullable().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
});

const ${models} = new Hono<{ Bindings: AppEnv; Variables: AuthVariables }>();

${models}.get('/', zValidator('query', listSchema), async (c) => {
  const { page, limit, search, status, sortBy, sortOrder } = c.req.valid('query');
  const db = createDb(getEnv(c.env));
  const offset = (page - 1) * limit;

  let query = db.selectFrom('${model}').selectAll();
  let countQuery = db
    .selectFrom('${model}')
    .select((eb) => eb.fn.countAll<number>().as('count'));

  if (search) {
    const pattern = \`%\${search}%\`;
    query = query.where((eb) =>
      eb.or([eb('title', 'like', pattern), eb('content', 'like', pattern)]),
    );
    countQuery = countQuery.where((eb) =>
      eb.or([eb('title', 'like', pattern), eb('content', 'like', pattern)]),
    );
  }

  if (status) {
    query = query.where('status', '=', status);
    countQuery = countQuery.where('status', '=', status);
  }

  query = query.orderBy(sortBy, sortOrder).limit(limit).offset(offset);

  const [rows, countRow] = await Promise.all([query.execute(), countQuery.executeTakeFirst()]);
  const total = Number(countRow?.count ?? 0);

  return c.json({ data: rows, total, page, limit, totalPages: Math.ceil(total / limit) });
});

${models}.get('/:idOrSlug', async (c) => {
  const idOrSlug = c.req.param('idOrSlug');
  const db = createDb(getEnv(c.env));

  const ${model} = UUID_REGEX.test(idOrSlug)
    ? await db.selectFrom('${model}').selectAll().where('id', '=', idOrSlug).executeTakeFirst()
    : await db.selectFrom('${model}').selectAll().where('slug', '=', idOrSlug).executeTakeFirst();

  if (!${model}) return c.json({ error: 'Not found' }, 404);
  return c.json(${model});
});

${models}.post('/', requireAuth, zValidator('json', createSchema), async (c) => {
  const { title, content, status } = c.req.valid('json');
  const session = c.get('session');
  const db = createDb(getEnv(c.env));
  const now = new Date().toISOString();

  let slug = slugify(title);
  let existing = await db.selectFrom('${model}').select('id').where('slug', '=', slug).executeTakeFirst();
  let counter = 2;
  while (existing) {
    slug = \`\${slugify(title)}-\${counter++}\`;
    existing = await db.selectFrom('${model}').select('id').where('slug', '=', slug).executeTakeFirst();
  }

  const id = crypto.randomUUID();
  await db
    .insertInto('${model}')
    .values({ id, title, slug, content: content ?? null, status, authorId: session.user.id, createdAt: now, updatedAt: now })
    .execute();

  const ${model} = await db.selectFrom('${model}').selectAll().where('id', '=', id).executeTakeFirst();
  return c.json(${model}, 201);
});

${models}.put('/:id', requireAuth, zValidator('json', updateSchema), async (c) => {
  const id = c.req.param('id');
  const updates = c.req.valid('json');
  const db = createDb(getEnv(c.env));

  const existing = await db.selectFrom('${model}').selectAll().where('id', '=', id).executeTakeFirst();
  if (!existing) return c.json({ error: 'Not found' }, 404);

  const now = new Date().toISOString();
  const updateData: Record<string, string | null> = { updatedAt: now };

  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.content !== undefined) updateData.content = updates.content ?? null;
  if (updates.status !== undefined) updateData.status = updates.status;

  if (updates.slug !== undefined) {
    updateData.slug = updates.slug;
  } else if (updates.title !== undefined) {
    let slug = slugify(updates.title);
    let conflict = await db
      .selectFrom('${model}')
      .select('id')
      .where('slug', '=', slug)
      .where('id', '!=', id)
      .executeTakeFirst();
    let counter = 2;
    while (conflict) {
      slug = \`\${slugify(updates.title)}-\${counter++}\`;
      conflict = await db
        .selectFrom('${model}')
        .select('id')
        .where('slug', '=', slug)
        .where('id', '!=', id)
        .executeTakeFirst();
    }
    updateData.slug = slug;
  }

  await db.updateTable('${model}').set(updateData).where('id', '=', id).execute();
  const ${model} = await db.selectFrom('${model}').selectAll().where('id', '=', id).executeTakeFirst();
  return c.json(${model});
});

${models}.delete('/:id', requireAuth, async (c) => {
  const id = c.req.param('id');
  const db = createDb(getEnv(c.env));

  const existing = await db.selectFrom('${model}').select('id').where('id', '=', id).executeTakeFirst();
  if (!existing) return c.json({ error: 'Not found' }, 404);

  await db.deleteFrom('${model}').where('id', '=', id).execute();
  return new Response(null, { status: 204 });
});

export default ${models};
`;

// ─── 3. Shared Type ──────────────────────────────────────────────────────────

const typePath = join(root, `shared/src/types/${model}.ts`);
const typeContent = `export type ${Model}Status = 'draft' | 'published' | 'archived';

export interface ${Model} {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  status: ${Model}Status;
  authorId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ${Model}ListParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: ${Model}Status;
  sortBy?: 'createdAt' | 'updatedAt' | 'title';
  sortOrder?: 'asc' | 'desc';
};
`;

// ─── 4. Vue Composable ───────────────────────────────────────────────────────

const composablePath = join(root, `client/src/composables/use${Models}.ts`);
const composableContent = `import { ref, onMounted, watch, toValue, type MaybeRefOrGetter } from 'vue';
import type { ${Model}, ${Model}ListParams } from 'shared';
import { SERVER_URL, authHeaders } from '../lib/config';

export const use${Models} = () => {
  const ${models} = ref<${Model}[]>([]);
  const total = ref(0);
  const isLoading = ref(false);
  const error = ref<string>('');
  const params = ref<${Model}ListParams>({ page: 1, limit: 20 });

  const fetch${Models} = async () => {
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

      const res = await fetch(\`\${SERVER_URL}/api/${models}?\${query}\`, {
        credentials: 'include',
      });

      if (!res.ok) throw new Error(\`Request failed: \${res.status}\`);

      const data = await res.json();
      ${models}.value = data.data;
      total.value = data.total;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch ${models}';
    } finally {
      isLoading.value = false;
    }
  };

  const create${Model} = async (data: {
    title: string;
    content?: string;
    status?: ${Model}['status'];
  }) => {
    const res = await fetch(\`\${SERVER_URL}/api/${models}\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(\`Failed to create ${model}: \${res.status}\`);
    await fetch${Models}();
    return res.json() as Promise<${Model}>;
  };

  const update${Model} = async (
    id: string,
    data: Partial<Pick<${Model}, 'title' | 'content' | 'status'>> & { slug?: string },
  ) => {
    const res = await fetch(\`\${SERVER_URL}/api/${models}/\${id}\`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(\`Failed to update ${model}: \${res.status}\`);
    await fetch${Models}();
    return res.json() as Promise<${Model}>;
  };

  const delete${Model} = async (id: string) => {
    const res = await fetch(\`\${SERVER_URL}/api/${models}/\${id}\`, {
      method: 'DELETE',
      headers: authHeaders(),
      credentials: 'include',
    });
    if (!res.ok) throw new Error(\`Failed to delete ${model}: \${res.status}\`);
    await fetch${Models}();
  };

  watch(params, fetch${Models}, { deep: true });
  onMounted(fetch${Models});

  return { ${models}, total, isLoading, error, params, fetch${Models}, create${Model}, update${Model}, delete${Model} };
};

export const use${Model} = (slugRef: MaybeRefOrGetter<string>) => {
  const ${model} = ref<${Model} | null>(null);
  const isLoading = ref(false);
  const error = ref<string>('');

  const fetch${Model} = async () => {
    const slug = toValue(slugRef);
    if (!slug) return;
    isLoading.value = true;
    error.value = '';
    try {
      const res = await fetch(\`\${SERVER_URL}/api/${models}/\${slug}\`, {
        credentials: 'include',
      });
      if (res.status === 404) {
        error.value = '${Model} not found';
        return;
      }
      if (!res.ok) throw new Error(\`Request failed: \${res.status}\`);
      ${model}.value = (await res.json()) as ${Model};
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch ${model}';
    } finally {
      isLoading.value = false;
    }
  };

  watch(() => toValue(slugRef), fetch${Model}, { immediate: true });

  return { ${model}, isLoading, error };
};
`;

// ─── 5. Vue List Page ────────────────────────────────────────────────────────

const listPagePath = join(root, `client/src/pages/${Models}.vue`);
const listPageContent = `<template>
  <div class="stack">
    <header class="inline-between">
      <h1>${Models}</h1>
      <RouterLink :to="{ name: 'dashboard' }">Dashboard</RouterLink>
    </header>

    <form v-if="session" class="inline-zero inline-form" @submit.prevent="handleCreate">
      <label for="newTitle" hidden>New ${model} title</label>
      <input v-model="newTitle" id="newTitle" placeholder="New ${model} title" autofocus required />
      <button type="submit" :disabled="isCreating">
        {{ isCreating ? 'Adding...' : 'Add' }}
      </button>
    </form>

    <div v-if="isLoading">Loading...</div>
    <div v-else-if="error" class="error-message">{{ error }}</div>
    <div v-else-if="!${models}.length">No ${models} yet.</div>

    <table v-else>
      <thead>
        <tr>
          <th>Title</th>
          <th>Slug</th>
          <th>Status</th>
          <th>Created</th>
          <th v-if="session">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="${model} in ${models}" :key="${model}.id">
          <td>
            <RouterLink :to="{ name: '${model}', params: { slug: ${model}.slug } }">
              {{ ${model}.title }}
            </RouterLink>
          </td>
          <td>{{ ${model}.slug }}</td>
          <td>{{ ${model}.status }}</td>
          <td>{{ new Date(${model}.createdAt).toLocaleDateString() }}</td>
          <td v-if="session">
            <button
              @click="handleDelete(${model}.id)"
              :disabled="deletingId === ${model}.id"
              class="button-secondary button-small"
            >
              {{ deletingId === ${model}.id ? 'Deleting...' : 'Delete' }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { RouterLink } from 'vue-router';
import { authClient } from '../lib/auth-client';
import { use${Models} } from '../composables/use${Models}';

const sessionData = authClient.useSession();
const session = computed(() => sessionData.value.data);
const { ${models}, isLoading, error, create${Model}, delete${Model} } = use${Models}();

const newTitle = ref('');
const isCreating = ref(false);
const deletingId = ref<string | null>(null);

const handleCreate = async () => {
  isCreating.value = true;
  try {
    await create${Model}({ title: newTitle.value });
    newTitle.value = '';
  } catch (err) {
    alert(err instanceof Error ? err.message : 'Failed to create ${model}');
  } finally {
    isCreating.value = false;
  }
};

const handleDelete = async (id: string) => {
  if (!confirm('Delete this ${model}?')) return;
  deletingId.value = id;
  try {
    await delete${Model}(id);
  } catch (err) {
    alert(err instanceof Error ? err.message : 'Failed to delete ${model}');
  } finally {
    deletingId.value = null;
  }
};
</script>
`;

// ─── 6. Vue Detail Page ──────────────────────────────────────────────────────

const detailPagePath = join(root, `client/src/pages/${Model}.vue`);
const detailPageContent = `<template>
  <div class="stack">
    <header class="inline-between">
      <h1>{{ ${model}?.title ?? 'Untitled ${model}' }}</h1>
      <RouterLink :to="{ name: '${models}' }">${Models}</RouterLink>
    </header>

    <div v-if="isLoading">Loading...</div>
    <div v-else-if="error" class="error-message">{{ error }}</div>
    <ul v-else-if="${model}" class="stack-half">
      <li><div>Slug:</div> {{ ${model}.slug }}</li>
      <li><div>Status:</div> {{ ${model}.status }}</li>
      <li><div>Created:</div> {{ new Date(${model}.createdAt).toLocaleString() }}</li>
      <li><div>Updated:</div> {{ new Date(${model}.updatedAt).toLocaleString() }}</li>
      <li v-if="${model}.content">
        <p>{{ ${model}.content }}</p>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router';
import { use${Model} } from '../composables/use${Models}';

const route = useRoute();
const { ${model}, isLoading, error } = use${Model}(() => route.params.slug as string);
</script>

<style scoped>
ul li {
  display: flex;
  gap: var(--size-base);
}
</style>
`;

// ─── Write all files ──────────────────────────────────────────────────────────

console.log(`\nScaffolding model: ${Model}\n`);
writeFile(sqlPath, sqlContent);
writeFile(routePath, routeContent);
writeFile(typePath, typeContent);
writeFile(composablePath, composableContent);
writeFile(listPagePath, listPageContent);
writeFile(detailPagePath, detailPageContent);

// ─── Patch A — server/src/lib/db.ts ──────────────────────────────────────────

const dbTsPath = join(root, 'server/src/lib/db.ts');
let dbTs = readFileSync(dbTsPath, 'utf-8');
const dbTsOriginal = dbTs;

const tableInterface = `export interface ${Model}Table {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  status: string;
  authorId: string | null;
  createdAt: string;
  updatedAt: string;
}

`;

if (dbTs.includes(`interface ${Model}Table`)) {
  console.log(`  Skipped: ${Model}Table already in db.ts`);
} else {
  dbTs = dbTs.replace('export interface AppDatabase {', tableInterface + 'export interface AppDatabase {');
  console.log(`  Patched: server/src/lib/db.ts — added ${Model}Table interface`);
}

const dbEntry = `  ${model}: ${Model}Table;`;
if (dbTs.includes(dbEntry)) {
  console.log(`  Skipped: ${model} already in AppDatabase`);
} else {
  dbTs = dbTs.replace(/^(export interface AppDatabase \{[^}]*)(\})/ms, `$1${dbEntry}\n$2`);
  console.log(`  Patched: server/src/lib/db.ts — added ${model} to AppDatabase`);
}

if (dbTs !== dbTsOriginal) writeFileSync(dbTsPath, dbTs, 'utf-8');

// ─── Patch B — server/src/index.ts ───────────────────────────────────────────

const indexPath = join(root, 'server/src/index.ts');
let indexTs = readFileSync(indexPath, 'utf-8');
const indexTsOriginal = indexTs;

const importLine = `import ${models} from './routes/${models}';`;
if (indexTs.includes(importLine)) {
  console.log(`  Skipped: ${models} import already in index.ts`);
} else {
  indexTs = indexTs.replace(
    /(import \w+ from '\.\/routes\/[^']+';)(?![\s\S]*import \w+ from '\.\/routes\/)/,
    `$1\n${importLine}`,
  );
  console.log(`  Patched: server/src/index.ts — added ${models} import`);
}

const routeLine = `app.route('/api/${models}', ${models});`;
if (indexTs.includes(routeLine)) {
  console.log(`  Skipped: ${models} route already in index.ts`);
} else {
  indexTs = indexTs.replace('export default app;', `${routeLine}\n\nexport default app;`);
  console.log(`  Patched: server/src/index.ts — mounted /api/${models}`);
}

if (indexTs !== indexTsOriginal) writeFileSync(indexPath, indexTs, 'utf-8');

// ─── Patch C — shared/src/types/index.ts ─────────────────────────────────────

const sharedTypesPath = join(root, 'shared/src/types/index.ts');
let sharedTypes = readFileSync(sharedTypesPath, 'utf-8');

const reExport = `export type { ${Model}, ${Model}Status, ${Model}ListParams } from './${model}';`;
if (sharedTypes.includes(reExport)) {
  console.log(`  Skipped: ${Model} re-export already in shared/src/types/index.ts`);
} else {
  sharedTypes = sharedTypes.trimEnd() + '\n\n' + reExport + '\n';
  writeFileSync(sharedTypesPath, sharedTypes, 'utf-8');
  console.log(`  Patched: shared/src/types/index.ts — added ${Model} re-export`);
}

// ─── Patch D — client/src/router.ts ──────────────────────────────────────────

const routerPath = join(root, 'client/src/router.ts');
let routerTs = readFileSync(routerPath, 'utf-8');
const routerTsOriginal = routerTs;

const pageImportPlural = `import ${Models} from './pages/${Models}.vue';`;
const pageImportSingle = `import ${Model} from './pages/${Model}.vue';`;

if (!routerTs.includes(pageImportPlural)) {
  routerTs = routerTs.replace(
    /(import \w+ from '\.\/pages\/[^']+';)(?![\s\S]*import \w+ from '\.\/pages\/)/,
    `$1\n${pageImportPlural}\n${pageImportSingle}`,
  );
  console.log(`  Patched: client/src/router.ts — added page imports`);
}

const listRoute = `  { name: '${models}', path: '/${models}', component: ${Models} },`;
const detailRoute = `  { name: '${model}', path: '/${model}/:slug', component: ${Model} },`;

if (!routerTs.includes(`name: '${models}'`)) {
  routerTs = routerTs.replace(
    `  { name: 'not-found'`,
    `${listRoute}\n${detailRoute}\n  { name: 'not-found'`,
  );
  console.log(`  Patched: client/src/router.ts — added routes`);
}

if (routerTs !== routerTsOriginal) writeFileSync(routerPath, routerTs, 'utf-8');

// ─── Patch E — run migration ──────────────────────────────────────────────────

runMigrate();

console.log(`
  Done! ${Model} model is ready.

  Files created:
    server/migrations/${timestamp}_create_${models}.sql
    server/src/routes/${models}.ts
    shared/src/types/${model}.ts
    client/src/composables/use${Models}.ts
    client/src/pages/${Models}.vue
    client/src/pages/${Model}.vue

  Files patched:
    server/src/lib/db.ts       (${Model}Table + AppDatabase)
    server/src/index.ts        (route mount)
    shared/src/types/index.ts  (re-export)
    client/src/router.ts       (page routes)

  The API is live at /api/${models}
`);
