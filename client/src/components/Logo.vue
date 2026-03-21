<template>
  <svg :width="size === 'sm' ? 64 : 128" :height="size === 'sm' ? 64 : 128" fill="none" viewBox="0 0 192 192">
    <title>Hono Mono</title>
    <path fill="hsl(222, 21%, 26%)" class="logo-monogram" d="M23.988 89 19 156.02l24.316 16.318v-32.053h38.032V177H101.3v-39.629l24.939 30.801 22.445-27.887v32.053L173 156.02 168.012 89h-18.081l-24.417 48.033-24.838-34.046H81.348v18.066H43.316V89z"/>
    <path fill="hsl(0, 99%, 58%)" d="M84.57 10c78.681 14.031 82.428 47.269 84.301 67.106.524 2.217-1.93 3.86-5.872 5.573-.858-12.701-21.606-29.976-42.837-36.686 14.454 25.982-17.078 36.798-9.523 49.396-20.22-7.548-41.349 4.438-42.306 18.931 0 0-17.485.61-17.485-28.063C52.713 50.865 103 95.5 84.569 10"/>
  </svg>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{ size?: 'sm' | 'default' }>(),
  { size: 'default' }
)
</script>

<style scoped>
.dark .logo-monogram {
  fill: hsl(0, 0%, 90%)
}

@media (prefers-color-scheme: dark) {
  .logo-monogram {
    fill: hsl(0, 0%, 90%);
  }
}

</style>