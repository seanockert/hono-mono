<template>
  <section class="stack">
    <header class="inline-between">
      <h1>__Models__</h1>
      <RouterLink :to="{ name: 'dashboard' }">Dashboard</RouterLink>
    </header>

    <form v-if="session" class="inline-zero inline-form" @submit.prevent="handleCreate">
      <label for="newTitle" hidden>New __model__ title</label>
      <input
        v-model="newTitle"
        id="newTitle"
        placeholder="New __model__ title"
        autofocus
        required
      />
      <button type="submit" :disabled="isCreating">
        {{ isCreating ? 'Adding...' : 'Add' }}
      </button>
    </form>

    <div v-if="error" class="error-message">{{ error }}</div>
    <div v-else-if="!hasLoaded">Loading...</div>
    <div v-else-if="!__models__.length">No __models__ yet.</div>

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
        <tr v-for="__model__ in __models__" :key="__model__.id">
          <td>
            <RouterLink :to="{ name: '__model__', params: { slug: __model__.slug } }">
              {{ __model__.title }}
            </RouterLink>
          </td>
          <td>{{ __model__.slug }}</td>
          <td>{{ __model__.status }}</td>
          <td>{{ new Date(__model__.createdAt).toLocaleDateString() }}</td>
          <td v-if="session">
            <button
              @click="handleDelete(__model__.id)"
              :disabled="deletingId === __model__.id"
              class="button-secondary button-small"
            >
              {{ deletingId === __model__.id ? 'Deleting...' : 'Delete' }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { RouterLink } from 'vue-router';
import { authClient } from '../lib/auth-client';
import { use__Models__ } from '../composables/use__Models__';

const sessionData = authClient.useSession();
const session = computed(() => sessionData.value.data);
const {
  rows: __models__,
  hasLoaded,
  error,
  create: create__Model__,
  remove: delete__Model__,
} = use__Models__();

const newTitle = ref('');
const isCreating = ref(false);
const deletingId = ref<string | null>(null);

const handleCreate = async () => {
  isCreating.value = true;
  try {
    await create__Model__({ title: newTitle.value });
    newTitle.value = '';
  } catch (err) {
    alert(err instanceof Error ? err.message : 'Failed to create __model__');
  } finally {
    isCreating.value = false;
  }
};

const handleDelete = async (id: string) => {
  if (!confirm('Delete this __model__?')) return;
  deletingId.value = id;
  try {
    await delete__Model__(id);
  } catch (err) {
    alert(err instanceof Error ? err.message : 'Failed to delete __model__');
  } finally {
    deletingId.value = null;
  }
};
</script>
