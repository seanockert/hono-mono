<template>
  <div class="stack">
    <h1>Sign Up</h1>
    <form @submit="handleSubmit" class="stack">
      <!-- Error Message Display -->
      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>

      <div class="stack-half">
        <label for="name">Name</label>
        <input type="text" id="name" autofocus v-model="name" required />
      </div>
      <div class="stack-half">
        <label for="email">Email</label>
        <input type="email" id="email" v-model="email" required />
      </div>
      <div class="stack-half">
        <label for="password">Password</label>
        <input type="password" id="password" v-model="password" required />
      </div>
      <button type="submit" :disabled="isPending || isSigningUp">
        {{ isSigningUp ? 'Creating account...' : 'Sign Up' }}
      </button>
      <!-- <button type="button" @click="handleGithubSignup">Sign up with GitHub</button> -->
    </form>
    <a href="/login">Back to Login</a>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { authClient } from '../lib/auth-client';
import { getErrorMessage } from '../lib/auth-errors';

// Form state
const email = ref('');
const password = ref('');
const name = ref('');
const errorMessage = ref('');
const isSigningUp = ref(false);

// Clear error when user starts typing
watch([email, password, name], () => {
  if (errorMessage.value) {
    errorMessage.value = '';
  }
});

const handleSubmit = async (e: Event) => {
  e.preventDefault();

  // Clear previous errors and set loading state
  errorMessage.value = '';
  isSigningUp.value = true;

  try {
    const result = await authClient.signUp.email({
      email: email.value,
      password: password.value,
      name: name.value,
    });

    if (result.error) {
      // Handle better-auth specific errors
      handleAuthError(result.error);
    }
  } catch (error: any) {
    handleAuthError(error);
  } finally {
    isSigningUp.value = false;
  }
};

const handleAuthError = (error: any) => {
  console.error('Signup error:', error);
  errorMessage.value = getErrorMessage(error);
};

// const handleGithubSignup = async () => {
//   await authClient.signIn.social({ provider: 'github' });
// };
</script>
