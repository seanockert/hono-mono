<template>
  <div class="stack-half">
    <h3>Test Authenticated API</h3>
    <button @click="testAuthenticatedEndpoint" :disabled="isTesting">
      {{ isTesting ? 'Testing...' : 'Test Protected Endpoint' }}
    </button>
    <div v-if="apiTestResult" class="api-result">
      <pre>{{ apiTestResult }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

// API testing state
const isTesting = ref(false);
const apiTestResult = ref('');

const testAuthenticatedEndpoint = async () => {
  isTesting.value = true;
  apiTestResult.value = '';

  try {
    // Make request to protected endpoint with cookies (session-based auth)
    const response = await fetch('http://localhost:3000/api/protected', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies for authentication
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
  background: #f5f5f5;
  border-radius: var(--size-half);
  border: 1px solid #ddd;
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
