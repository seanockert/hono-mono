<template>
  <section class="stack">
    <header class="inline-between">
      <h1>{{ item?.title ?? 'Untitled item' }}</h1>
      <RouterLink :to="{ name: 'items' }">Items</RouterLink>
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
  </section>
</template>

<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router';
import { useItem } from '../composables/useItems';

const route = useRoute();
const { item, isLoading, error } = useItem(() => route.params.slug as string);
</script>

<style scoped>
ul li {
  display: flex;
  gap: var(--size-base);
}
</style>
