<template>
  <div class="stack-half">
    <button @click="testAuthenticatedEndpoint" class="button-secondary" :disabled="isTesting">
      {{ isTesting ? 'Testing...' : 'Test Protected Endpoint' }}
    </button>
    <div v-if="apiTestResult" class="api-result">
      <pre>{{ apiTestResult }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { SERVER_URL, authHeaders } from '../lib/config';

const isTesting = ref(false);
const apiTestResult = ref('');

const testAuthenticatedEndpoint = async () => {
  isTesting.value = true;
  apiTestResult.value = '';

  try {
    const response = await fetch(`${SERVER_URL}/api/protected`, {
      headers: authHeaders(),
      credentials: 'include',
    });

    const result = await response.json();

    if (response.ok) {
      apiTestResult.value = JSON.stringify(result, null, 2);
    } else {
      apiTestResult.value = `Error ${response.status}: ${result.error || 'Unknown error'}`;
    }
  } catch (error) {
    apiTestResult.value = `Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
  } finally {
    isTesting.value = false;
  }
};
</script>

<style scoped>
.api-result {
  border-radius: var(--size-half);
  border: 1px solid var(--color-text-secondary);
  color: var(--color-text);
  padding: var(--size-base);
}

.api-result pre {
  font-family: monospace;
  font-size: var(--font-size-small);
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>
