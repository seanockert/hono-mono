<template>
  <div class="stack">
    <div class="inline-between inline-wrap">
      <h2>User List</h2>

      <small v-if="!isLoading && !error" class="inline-half">
        <label for="role-filter">Filter by role:</label>
        <select id="role-filter" v-model="selectedRole">
          <option value="">All roles</option>
          <option v-for="role in availableRoles" :key="role" :value="role">
            {{ role }}
          </option>
        </select>
      </small>
    </div>

    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Role</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody v-if="isLoading">
        <tr>
          <td colspan="4">Loading users...</td>
        </tr>
      </tbody>
      <tbody v-else-if="error" class="error-message">
        <tr>
          <td colspan="4">{{ error }}</td>
        </tr>
      </tbody>
      <tbody v-else>
        <tr v-for="user in users" :key="user.id">
          <td>{{ user.name || '-' }}</td>
          <td>{{ user.email }}</td>
          <td>{{ user.role ?? '-' }}</td>
          <td>
            <button
              @click="deleteUser(user.id)"
              :disabled="deletingUserId === user.id"
              class="button-secondary button-small"
            >
              {{ deletingUserId === user.id ? 'Deleting...' : 'Delete' }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { authClient } from '../lib/auth-client';
import type { User, UserRole } from 'shared';

const limit = 100;
const users = ref<User[]>([]);
const isLoading = ref(false);
const error = ref<string>('');
const selectedRole = ref<string>('');
const availableRoles: UserRole[] = ['admin', 'user'];
const deletingUserId = ref<string | null>(null);

const errorMessage = 'Failed to fetch users';

const checkAdminRole = async () => {
  await authClient.admin.hasPermission({
    permissions: {
      user: ['delete'],
    },
  });
};

const getUsers = async () => {
  isLoading.value = true;
  error.value = '';

  try {
    const query = selectedRole.value
      ? {
          limit,
          filterField: 'role' as const,
          filterOperator: 'eq' as const,
          filterValue: selectedRole.value,
        }
      : { limit };

    const { data, error: fetchError } = await authClient.admin.listUsers({ query });

    if (fetchError) {
      error.value = fetchError.message || errorMessage;
    } else {
      users.value = data?.users || [];
    }
  } catch (err) {
    error.value = errorMessage;
  } finally {
    isLoading.value = false;
  }
};

const deleteUser = async (userId: string) => {
  if (!confirm('Delete this user? This is permanent.')) {
    return;
  }

  deletingUserId.value = userId;

  try {
    const { error: deleteError } = await authClient.admin.removeUser({
      userId,
    });

    if (deleteError) {
      alert(`Failed to delete user: ${deleteError.message || 'Unknown error'}`);
    } else {
      await getUsers();
    }
  } catch (err) {
    alert('Failed to delete user');
  } finally {
    deletingUserId.value = null;
  }
};

watch(selectedRole, getUsers);

onMounted(async () => {
  await checkAdminRole();
  await getUsers();
});
</script>

<style scoped></style>
