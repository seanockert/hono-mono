<template>
  <section class="stack">
    <header class="inline-between">
      <h1>{{ __model__?.title ?? 'Untitled __model__' }}</h1>
      <RouterLink :to="{ name: '__models__' }">__Models__</RouterLink>
    </header>

    <div v-if="isLoading">Loading...</div>
    <div v-else-if="error" class="error-message">{{ error }}</div>
    <ul v-else-if="__model__" class="stack-half">
      <li>
        <div>Slug:</div>
        {{ __model__.slug }}
      </li>
      <li>
        <div>Status:</div>
        {{ __model__.status }}
      </li>
      <li>
        <div>Created:</div>
        {{ new Date(__model__.createdAt).toLocaleString() }}
      </li>
      <li>
        <div>Updated:</div>
        {{ new Date(__model__.updatedAt).toLocaleString() }}
      </li>
      <li v-if="__model__.content">
        <p>{{ __model__.content }}</p>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router';
import { use__Model__ } from '../composables/use__Models__';

const route = useRoute();
const { row: __model__, isLoading, error } = use__Model__(() => route.params.slug as string);
</script>

<style scoped>
ul li {
  display: flex;
  gap: var(--size-base);
}
</style>
