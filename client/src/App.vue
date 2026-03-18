<template>
  <div v-if="isPending">Loading...</div>

  <Item v-else-if="route === 'item'" />

  <Items v-else-if="route === 'items'" />

  <Dashboard v-else-if="session" />

  <Signup v-else-if="route === 'signup'" />

  <Login v-else />
</template>

<script setup lang="ts">
import { computed, watchEffect } from 'vue';
import { authClient } from './lib/auth-client';
import { useRouter } from './lib/simple-router';
import Dashboard from './pages/Dashboard.vue';
import Item from './pages/Item.vue';
import Items from './pages/Items.vue';
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

  // If logged in and not on a named route, go to dashboard
  if (session.value && route.value === 'login') {
    navigate('dashboard');
    return;
  }

  // If not logged in and on a protected route, go to login
  if (!session.value && route.value === 'dashboard') {
    navigate('login', true);
  }
});
</script>
