<template>
  <main class="platform-shell">
    <section class="workspace">
      <RouterView v-slot="{ Component }">
        <component :is="Component" :platform="platform" />
      </RouterView>
    </section>
  </main>
</template>

<script setup>
import { RouterView } from 'vue-router';
import { usePlatformState } from './composables/usePlatformState';

const platform = usePlatformState();
</script>
