<template>
  <div class="stack">
    <header class="inline-between">
      <h1>{{ item?.title ?? 'Untitled item' }}</h1>
      <a href="/items" @click.prevent="navigate('items')">Items</a>
    </header>

    <div v-if="isLoading">Loading...</div>
    <div v-else-if="error" class="error-message">{{ error }}</div>
    <ul v-else-if="item" class="stack-half">
      <li><div>Slug:</div> {{ item.slug }}</li>
      <li><div>Status:</div> {{ item.status }}</li>
      <li><div>Created:</div> {{ new Date(item.createdAt).toLocaleString() }}</li>
      <li><div>Updated:</div> {{ new Date(item.updatedAt).toLocaleString() }}</li>
      <li v-if="item.content">
        <p>{{ item.content }}</p>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from '../lib/simple-router';
import { useItem } from '../composables/useItems';

const { params, navigate } = useRouter();
const { item, isLoading, error } = useItem(() => params.value.slug ?? '');
</script>

<style scoped>
ul li {
  display: flex;
  gap: var(--size-base);
}
</style>
