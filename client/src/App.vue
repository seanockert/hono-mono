<template>
  <div v-if="isPending">Loading...</div>

  <Dashboard v-else-if="session" />

  <Signup v-else-if="route === 'signup'" />

  <Login v-else />
</template>

<script setup lang="ts">
import { computed, watchEffect } from 'vue';
import { authClient } from './lib/auth-client';
import { useRouter } from './lib/simple-router';
import Dashboard from './pages/Dashboard.vue';
import Signup from './pages/Signup.vue';
import Login from './pages/Login.vue';

const sessionData = authClient.useSession();
const session = computed(() => sessionData.value.data);
const isPending = computed(() => sessionData.value.isPending);
const { route, navigate } = useRouter();

// Sync route with auth state
watchEffect(() => {
  if (isPending.value) {
    return;
  }

  // If logged in and not on dashboard, go to dashboard
  if (session.value && route.value !== 'dashboard') {
    navigate('dashboard');
    return;
  }

  // If not logged in and on dashboard, go to login
  if (!session.value && route.value === 'dashboard') {
    navigate('login', true);
  }
});
</script>
