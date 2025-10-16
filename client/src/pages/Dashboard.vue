<template>
  <div class="stack-2x">
    <header class="inline-between inline-wrap">
      <h1>Hola {{ session?.user.name }}</h1>
      <button @click="handleSignOut">Sign Out</button>
    </header>

    <main class="stack">
      <div v-if="!session">No session</div>
      <div v-else class="stack-half">
        <div class="inline">
          <strong>Name:</strong>
          <form class="inline-quarter" @submit="handleUpdateName">
            <input v-model="newName" type="text" :placeholder="session.user.name" :disabled="isUpdating" />
            <button type="submit">&rarr;</button>
          </form>

          <div v-if="updateMessage">{{ updateMessage }}</div>
        </div>

        <div class="inline"><strong>Email:</strong> {{ session.user.email }}</div>
        <div class="inline"><strong>User ID:</strong> {{ session.user.id }}</div>
        <div class="inline"><strong>Role:</strong> {{ session.user.role ?? '-' }}</div>
      </div>
    </main>

    <AuthTest />

    <UserList v-if="session?.user.role === 'admin'" />
  </div>
</template>

<script setup lang="ts">
import { authClient } from '../lib/auth-client';
import { useRouter } from '../lib/simple-router';
import { computed, ref } from 'vue';
import AuthTest from '../components/AuthTest.vue';
import UserList from '../components/UserList.vue';

const sessionData = authClient.useSession();
const session = computed(() => sessionData.value.data);
const { navigate } = useRouter();

const newName = ref(session.value?.user.name || '');
const isUpdating = ref(false);
const updateMessage = ref('');

const handleUpdateName = async (e: Event) => {
  e.preventDefault();

  if (!newName.value.trim()) {
    return;
  }

  isUpdating.value = true;
  updateMessage.value = '';

  try {
    const result = await authClient.updateUser({
      name: newName.value.trim(),
    });

    if (result.error) {
      updateMessage.value = result.error.message || 'Failed to update name';
    } else {
      updateMessage.value = 'Updated!';

      setTimeout(() => {
        updateMessage.value = '';
      }, 3000);
    }
  } catch (error) {
    updateMessage.value = 'Failed to update name. Please try again.';
  } finally {
    isUpdating.value = false;
  }
};

const handleSignOut = async () => {
  await authClient.signOut();
  navigate('login');
};
</script>
