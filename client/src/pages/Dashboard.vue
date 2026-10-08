<template>
  <div class="stack-2x">
    <header class="inline-between inline-wrap">
      <div class="inline">
        <Logo size="sm" />
        <h1>Hola, {{ session?.user.name }}</h1>
      </div>
      <button @click="handleSignOut">Sign Out</button>
    </header>

    <main class="stack">
      <div v-if="!session">No session</div>
      <div v-else class="stack-half">
        <div class="inline">
          <strong>Name:</strong>
          <form class="inline-zero inline-form" @submit.prevent="handleUpdateName">
            <label for="newName" hidden>Update name</label>
            <input
              v-model="newName"
              id="newName"
              type="text"
              :placeholder="session.user.name"
              :disabled="isUpdating"
            />
            <button type="submit">Update</button>
          </form>

          <div v-if="updateMessage">{{ updateMessage }}</div>
        </div>

        <div class="inline"><strong>Email:</strong> {{ session.user.email }}</div>
        <div class="inline"><strong>User ID:</strong> {{ session.user.id }}</div>
        <div class="inline"><strong>Role:</strong> {{ session.user.role ?? '-' }}</div>
      </div>
    </main>

    <div>
      <RouterLink :to="{ name: 'items' }">View Items &rarr;</RouterLink>
    </div>

    <form v-if="session" class="stack" @submit.prevent="handleChangePassword">
      <h2>Change password</h2>
      <div v-if="passwordMessage">{{ passwordMessage }}</div>

      <div class="stack-quarter">
        <label for="currentPassword">Current password</label>
        <input
          v-model="currentPassword"
          id="currentPassword"
          type="password"
          autocomplete="current-password"
          required
        />
      </div>

      <div class="stack-quarter">
        <label for="newPassword">New password</label>
        <input
          v-model="newPassword"
          id="newPassword"
          type="password"
          autocomplete="new-password"
          minlength="8"
          maxlength="50"
          required
        />
      </div>

      <button type="submit" :disabled="isChangingPassword">
        {{ isChangingPassword ? 'Saving...' : 'Change password' }}
      </button>
    </form>

    <form v-if="session" class="stack" @submit.prevent="handleDeleteAccount">
      <h2>Delete account</h2>
      <p>This deletes your account at once. You cannot undo it.</p>
      <div v-if="deleteMessage" class="error-message">{{ deleteMessage }}</div>

      <div class="stack-quarter">
        <label for="deletePassword">Password</label>
        <input
          v-model="deletePassword"
          id="deletePassword"
          type="password"
          autocomplete="current-password"
          required
        />
      </div>

      <button type="submit" class="button-secondary" :disabled="isDeleting">
        {{ isDeleting ? 'Deleting...' : 'Delete my account' }}
      </button>
    </form>

    <AuthTest />
  </div>
</template>

<script setup lang="ts">
import { authClient, clearStoredToken } from '../lib/auth-client';
import { getErrorMessage, NETWORK_ERROR } from '../lib/auth-errors';
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import AuthTest from '../components/AuthTest.vue';
import Logo from '../components/Logo.vue';

const sessionData = authClient.useSession();
const session = computed(() => sessionData.value.data);

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

const currentPassword = ref('');
const newPassword = ref('');
const isChangingPassword = ref(false);
const passwordMessage = ref('');

const handleChangePassword = async () => {
  isChangingPassword.value = true;
  passwordMessage.value = '';

  try {
    // Signs out all other devices. This session gets a new token.
    const result = await authClient.changePassword({
      currentPassword: currentPassword.value,
      newPassword: newPassword.value,
      revokeOtherSessions: true,
    });

    if (result.error) {
      passwordMessage.value = getErrorMessage(result.error);
    } else {
      passwordMessage.value = 'Password changed.';
      currentPassword.value = '';
      newPassword.value = '';
    }
  } catch {
    passwordMessage.value = NETWORK_ERROR;
  } finally {
    isChangingPassword.value = false;
  }
};

const deletePassword = ref('');
const isDeleting = ref(false);
const deleteMessage = ref('');

const handleDeleteAccount = async () => {
  if (!confirm('Delete your account? You cannot undo this.')) return;

  isDeleting.value = true;
  deleteMessage.value = '';

  try {
    const result = await authClient.deleteUser({ password: deletePassword.value });

    if (result.error) {
      deleteMessage.value = getErrorMessage(result.error);
    } else {
      clearStoredToken();
      // No router.push. App.vue navigates when the session changes.
    }
  } catch {
    deleteMessage.value = NETWORK_ERROR;
  } finally {
    isDeleting.value = false;
  }
};

const handleSignOut = async () => {
  // Sign out first. The request needs the token when the browser blocks the cookie.
  await authClient.signOut();
  clearStoredToken();
  // No router.push. App.vue navigates when the session changes.
};
</script>
