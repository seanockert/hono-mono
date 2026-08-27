<template>
  <section class="stack">
    <h1>Forgot Password</h1>

    <div v-if="isSent" class="stack">
      <p>
        If an account exists for that address, we have sent a link to reset the password. Check your
        email.
      </p>
      <RouterLink :to="{ name: 'login' }">&larr; Back to Login</RouterLink>
    </div>

    <form v-else @submit.prevent="handleSubmit" class="stack">
      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>

      <p>Enter your email address and we will send you a link to choose a new password.</p>

      <div class="stack-quarter">
        <label for="email">Email</label>
        <input type="email" id="email" autofocus v-model="email" required />
      </div>

      <button type="submit" :disabled="isSending">
        {{ isSending ? 'Sending...' : 'Send reset link' }}
      </button>

      <RouterLink :to="{ name: 'login' }">&larr; Back to Login</RouterLink>
    </form>
  </section>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { authClient } from '../lib/auth-client';
import { getErrorMessage } from '../lib/auth-errors';

const email = ref('');
const errorMessage = ref('');
const isSending = ref(false);
const isSent = ref(false);

watch(email, () => {
  if (errorMessage.value) {
    errorMessage.value = '';
  }
});

const handleSubmit = async () => {
  errorMessage.value = '';
  isSending.value = true;

  try {
    // Resolved against the API origin, so it has to be absolute.
    const result = await authClient.requestPasswordReset({
      email: email.value,
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (result.error) {
      errorMessage.value = getErrorMessage(result.error);
    } else {
      isSent.value = true;
    }
  } catch (error: any) {
    errorMessage.value = getErrorMessage(error);
  } finally {
    isSending.value = false;
  }
};
</script>

<style scoped>
section {
  max-width: var(--size-max-width-sm);
  margin: auto;
}
</style>
