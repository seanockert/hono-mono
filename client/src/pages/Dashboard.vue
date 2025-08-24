<template>
  <div class="stack">
    <h1>Dashboard</h1>
    <div v-if="!session">No session</div>
    <div v-else class="stack-half">
      <div><strong>Name:</strong> {{ session.user.name }}</div>
      <div><strong>Email:</strong> {{ session.user.email }}</div>
      <div><strong>User ID:</strong> {{ session.user.id }}</div>
      <button @click="handleSignOut">Sign Out</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { authClient } from '../lib/auth-client';
import { useRouter } from '../lib/simple-router';
import { computed } from 'vue';

const sessionData = authClient.useSession();
const session = computed(() => sessionData.value.data);
const { navigate } = useRouter();

const handleSignOut = async () => {
  await authClient.signOut();
  navigate('login');
};
</script>
