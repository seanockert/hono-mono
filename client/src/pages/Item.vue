<template>
  <div class="stack">
    <header class="inline-between">
      <h1>{{ item?.title ?? 'Item' }}</h1>
      <a href="/items" @click.prevent="navigate('items')">&larr; Items</a>
    </header>

    <div v-if="isLoading">Loading...</div>
    <div v-else-if="error" class="error-message">{{ error }}</div>
    <div v-else-if="item" class="stack">
      <dl>
        <dt>Slug</dt>
        <dd>{{ item.slug }}</dd>
        <dt>Status</dt>
        <dd>{{ item.status }}</dd>
        <dt>Created</dt>
        <dd>{{ new Date(item.createdAt).toLocaleString() }}</dd>
        <dt>Updated</dt>
        <dd>{{ new Date(item.updatedAt).toLocaleString() }}</dd>
      </dl>
      <div v-if="item.content">
        <p>{{ item.content }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from '../lib/simple-router';
import { useItem } from '../composables/useItems';

const { params, navigate } = useRouter();
const { item, isLoading, error } = useItem(() => params.value.slug ?? '');
</script>
