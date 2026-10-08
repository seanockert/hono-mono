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
import { parseResponse } from 'hono/client';
import { api, errorText } from '../lib/api';

const isTesting = ref(false);
const apiTestResult = ref('');

const testAuthenticatedEndpoint = async () => {
  isTesting.value = true;
  apiTestResult.value = '';

  try {
    const result = await parseResponse(api.protected.$get());
    apiTestResult.value = JSON.stringify(result, null, 2);
  } catch (error) {
    apiTestResult.value = `Request failed: ${errorText(error, 'Unknown error')}`;
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
