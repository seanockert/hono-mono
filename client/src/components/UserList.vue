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
        </tr>
      </thead>
      <tbody v-if="isLoading">
        <tr>
          <td colspan="3">Loading users...</td>
        </tr>
      </tbody>
      <tbody v-else-if="error" class="error-message">
        <tr>
          <td colspan="3">{{ error }}</td>
        </tr>
      </tbody>
      <tbody v-else>
        <tr v-for="user in users" :key="user.id">
          <td>{{ user.name || '-' }}</td>
          <td>{{ user.email }}</td>
          <td>{{ user.role ?? '-' }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { authClient } from '../lib/auth-client';

interface User {
  id: string;
  name?: string;
  email: string;
  role?: string;
}

const limit = 100;
const users = ref<User[]>([]);
const isLoading = ref(false);
const error = ref<string>('');
const selectedRole = ref<string>('');
const availableRoles = ref(['admin', 'user']);

const errorMessage = 'Failed to fetch users';

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

watch(selectedRole, getUsers);

onMounted(getUsers);
</script>
