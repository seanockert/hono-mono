<template>
  <div v-if="isPending">Loading...</div>
  <RouterView v-else />
</template>

<script setup lang="ts">
import { computed, watchEffect } from 'vue';
import { RouterView, useRoute, useRouter } from '@kitbag/router';
import { authClient } from './lib/auth-client';

const sessionData = authClient.useSession();
const session = computed(() => sessionData.value.data);
const isPending = computed(() => sessionData.value.isPending);

const router = useRouter();
const route = useRoute();

watchEffect(() => {
  if (isPending.value) return;

  if (session.value && (route.name === 'login' || route.name === 'signup')) {
    router.push('dashboard');
    return;
  }

  if (!session.value && route.name === 'dashboard') {
    router.replace('login');
  }
});
</script>
