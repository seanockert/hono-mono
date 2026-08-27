<template>
  <section class="stack">
    <h1>Choose a New Password</h1>

    <div v-if="!token" class="stack">
      <div class="error-message">That reset link is not valid, or it has expired.</div>
      <RouterLink :to="{ name: 'forgot-password' }">Ask for a new link</RouterLink>
    </div>

    <div v-else-if="isDone" class="stack">
      <p>Your password is updated.</p>
      <RouterLink :to="{ name: 'login' }">Log in &rarr;</RouterLink>
    </div>

    <form v-else @submit.prevent="handleSubmit" class="stack">
      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>

      <div class="stack-quarter">
        <label for="password">New password</label>
        <input
          type="password"
          id="password"
          autofocus
          maxlength="50"
          minlength="8"
          v-model="password"
          required
        />
      </div>

      <div class="stack-quarter">
        <label for="confirm">Confirm new password</label>
        <input
          type="password"
          id="confirm"
          maxlength="50"
          minlength="8"
          v-model="confirm"
          required
        />
      </div>

      <button type="submit" :disabled="isSaving">
        {{ isSaving ? 'Saving...' : 'Set password' }}
      </button>

      <RouterLink :to="{ name: 'login' }">&larr; Back to Login</RouterLink>
    </form>
  </section>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { authClient } from '../lib/auth-client';
import { getErrorMessage } from '../lib/auth-errors';

const route = useRoute();

// Better Auth redirects here with ?token=, or ?error= if the link is dead.
const token = route.query.error ? '' : ((route.query.token as string) ?? '');

const password = ref('');
const confirm = ref('');
const errorMessage = ref('');
const isSaving = ref(false);
const isDone = ref(false);

watch([password, confirm], () => {
  if (errorMessage.value) {
    errorMessage.value = '';
  }
});

const handleSubmit = async () => {
  if (password.value !== confirm.value) {
    errorMessage.value = 'The two passwords do not match.';
    return;
  }

  errorMessage.value = '';
  isSaving.value = true;

  try {
    const result = await authClient.resetPassword({ newPassword: password.value, token });

    if (result.error) {
      errorMessage.value = getErrorMessage(result.error);
    } else {
      isDone.value = true;
    }
  } catch (error: any) {
    errorMessage.value = getErrorMessage(error);
  } finally {
    isSaving.value = false;
  }
};
</script>

<style scoped>
section {
  max-width: var(--size-max-width-sm);
  margin: auto;
}
</style>
