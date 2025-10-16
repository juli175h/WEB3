<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import { computed } from 'vue';
import { usePendingUnoStore } from '../stores/pending_games_store.ts';

const route = useRoute();
const router = useRouter();
const pendingStore = usePendingUnoStore();

const gameId = Number(route.params.id);
const game = computed(() => pendingStore.game(gameId));

function startGame() {
  if (!game.value) return;
  router.push(`/game/${gameId}`);
}
</script>

<template>
  <div v-if="game">
    <h2>Pending Game #{{ game.id }}</h2>
    <ul>
      <li v-for="p in game.players" :key="p.id">{{ p.name }}</li>
    </ul>
    <button @click="startGame" :disabled="game.players.length < 2">
      Start Game
    </button>
  </div>
</template>
