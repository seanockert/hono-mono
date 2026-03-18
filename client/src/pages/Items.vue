<template>
  <div class="stack">
    <header class="inline-between">
      <h1>Items</h1>
      <a href="/dashboard" @click.prevent="navigate('dashboard')">Dashboard</a>
    </header>

    <form v-if="session" @submit.prevent="handleCreate" class="inline-quarter">
      <input v-model="newTitle" placeholder="New item title" autofocus required />
      <button type="submit" :disabled="isCreating">
        {{ isCreating ? 'Adding...' : 'Add' }}
      </button>
    </form>

    <div v-if="isLoading">Loading...</div>
    <div v-else-if="error" class="error-message">{{ error }}</div>
    <div v-else-if="!items.length">No items yet.</div>

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
        <tr v-for="item in items" :key="item.id">
          <td>
            <a :href="`/item/${item.slug}`" @click.prevent="navigate('item', false, { slug: item.slug })">
              {{ item.title }}
            </a>
          </td>
          <td>{{ item.slug }}</td>
          <td>{{ item.status }}</td>
          <td>{{ new Date(item.createdAt).toLocaleDateString() }}</td>
          <td v-if="session">
            <button
              @click="handleDelete(item.id)"
              :disabled="deletingId === item.id"
              class="button-secondary button-small"
            >
              {{ deletingId === item.id ? 'Deleting...' : 'Delete' }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { authClient } from '../lib/auth-client';
import { useRouter } from '../lib/simple-router';
import { useItems } from '../composables/useItems';

const sessionData = authClient.useSession();
const session = computed(() => sessionData.value.data);
const { navigate } = useRouter();
const { items, isLoading, error, createItem, deleteItem } = useItems();

const newTitle = ref('');
const isCreating = ref(false);
const deletingId = ref<string | null>(null);

const handleCreate = async () => {
  isCreating.value = true;
  try {
    await createItem({ title: newTitle.value });
    newTitle.value = '';
  } catch (err) {
    alert(err instanceof Error ? err.message : 'Failed to create item');
  } finally {
    isCreating.value = false;
  }
};

const handleDelete = async (id: string) => {
  if (!confirm('Delete this item?')) return;
  deletingId.value = id;
  try {
    await deleteItem(id);
  } catch (err) {
    alert(err instanceof Error ? err.message : 'Failed to delete item');
  } finally {
    deletingId.value = null;
  }
};
</script>
