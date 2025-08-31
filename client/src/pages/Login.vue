<template>
  <div class="stack">
    <header class="inline-between">
      <h1>Login</h1>
    </header>

    <form @submit="handleLogin" class="stack">
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

      <div class="inline-quarter">or <a href="/signup">sign up</a></div>
      <!-- <button @click="handleGithubLogin">Login with GitHub</button> -->
    </form>

    <AuthTest />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watchEffect, watch } from 'vue';
import { authClient } from '../lib/auth-client';
import { useRouter } from '../lib/simple-router';
import { getErrorMessage } from '../lib/auth-errors';
import AuthTest from '../components/AuthTest.vue';

const sessionData = authClient.useSession();
const session = computed(() => sessionData.value.data);
const isPending = computed(() => sessionData.value.isPending);
const { route, navigate } = useRouter();

const email = ref('');
const password = ref('');
const errorMessage = ref('');
const isLoggingIn = ref(false);

// Redirect to dashboard when user logs in
watchEffect(() => {
  if (session.value && route.value !== 'dashboard') {
    navigate('dashboard');
  }
});

// Clear error when user starts typing
watch([email, password], () => {
  if (errorMessage.value) {
    errorMessage.value = '';
  }
});

const handleLogin = async (e: Event) => {
  e.preventDefault();
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
