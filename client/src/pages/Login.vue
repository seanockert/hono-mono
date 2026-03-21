<template>
  <div class="stack">
    <header class="inline-between">
      <h1><svg width="128" height="128" fill="none" viewBox="0 0 192 192"><title>Hono Mono</title><path fill="hsl(222, 21%, 26%)" class="logo-monogram" d="M23.988 89 19 156.02l24.316 16.318v-32.053h38.032V177H101.3v-39.629l24.939 30.801 22.445-27.887v32.053L173 156.02 168.012 89h-18.081l-24.417 48.033-24.838-34.046H81.348v18.066H43.316V89z"/><path fill="#fe2928" d="M84.57 10c78.681 14.031 82.428 47.269 84.301 67.106.524 2.217-1.93 3.86-5.872 5.573-.858-12.701-21.606-29.976-42.837-36.686 14.454 25.982-17.078 36.798-9.523 49.396-20.22-7.548-41.349 4.438-42.306 18.931 0 0-17.485.61-17.485-28.063C52.713 50.865 103 95.5 84.569 10"/></svg></h1>
    </header>

    <h2>Login</h2>

    <form @submit.prevent="handleLogin" class="stack">
      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>

      <div class="stack-quarter">
        <label for="email">Email</label>
        <input type="email" id="email" autofocus v-model="email" required />
      </div>

      <div class="stack-quarter">
        <label for="password">Password</label>
        <input type="password" id="password" v-model="password" required />
      </div>

      <button type="submit" :disabled="isPending || isLoggingIn">
        {{ isLoggingIn ? 'Logging in...' : 'Login' }}
      </button>

      <div class="inline-quarter">
        or <RouterLink :to="{ name: 'signup' }">sign up</RouterLink>
      </div>
      <!-- <button @click="handleGithubLogin">Login with GitHub</button> -->
    </form>

    <AuthTest />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { authClient } from '../lib/auth-client';
import { getErrorMessage } from '../lib/auth-errors';
import AuthTest from '../components/AuthTest.vue';

const sessionData = authClient.useSession();
const isPending = computed(() => sessionData.value.isPending);

const email = ref('');
const password = ref('');
const errorMessage = ref('');
const isLoggingIn = ref(false);

// Clear error when user starts typing
watch([email, password], () => {
  if (errorMessage.value) {
    errorMessage.value = '';
  }
});

const handleLogin = async () => {
  errorMessage.value = '';
  isLoggingIn.value = true;

  try {
    const result = await authClient.signIn.email({
      email: email.value,
      password: password.value,
    });

    if (result.error) {
      handleAuthError(result.error);
    }
    // Navigation after successful login is handled by App.vue watchEffect
  } catch (error: any) {
    handleAuthError(error);
  } finally {
    isLoggingIn.value = false;
  }
};

const handleAuthError = (error: any) => {
  console.error('Login error:', error);
  errorMessage.value = getErrorMessage(error);
};

// const handleGithubLogin = async () => {
//   await authClient.signIn.social({ provider: "github" })
// }
</script>
