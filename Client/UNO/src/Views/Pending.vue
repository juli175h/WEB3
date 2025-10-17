<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { usePendingUnoStore } from '../stores/pending_games_store';
import { onActive } from '../model/api';

const pendingStore = usePendingUnoStore();
const route = useRoute();
const router = useRouter();

// Use string IDs for safety
const gameId = String(route.params.id);

// Computed property for the selected game
const game = computed(() =>
  pendingStore.gameList.find(g => String(g.id) === gameId)
);

// Load pending games and subscribe to updates
onMounted(async () => {
  // Load pending games from API
  await pendingStore.loadPendingGames();

  // Ensure players is always an array
  pendingStore.gameList.forEach(g => {
    g.players = g.players ?? [];
  });

  // Subscribe to real-time updates
  pendingStore.subscribeToUpdates();

  // Redirect if this game becomes active
  pendingStore.onPendingRemoved((removedId) => {
    if (String(removedId) === gameId) {
      router.push(`/game/${gameId}`);
    }
  });

  // Extra safety: also watch active games
 onActive((activeGame) => {
  console.log("🔥 ACTIVE update received:", activeGame.id, "vs", gameId);
  if (String(activeGame.id) === String(gameId)) {
    router.push(`/game/${activeGame.id}`);
  }
});
});
</script>

<template>
  <div class="pending-page">
    <h2>Pending Game #{{ gameId }}</h2>

    <!-- Loading state -->
    <div v-if="pendingStore.loading">Loading game...</div>

    <!-- Error state -->
    <div v-else-if="pendingStore.error" class="error">
      Failed to load game.
    </div>

    <!-- Game not found -->
    <div v-else-if="!game">
      Game not found.
    </div>

    <!-- Game details -->
    <div v-else>
      <!-- Players joined info -->
      <p v-if="(game?.players?.length ?? 0) === 0">
        No players have joined yet. Waiting for others...
      </p>
      <p v-else>
        Players joined: {{ game?.players?.length ?? 0 }}/{{ game?.number_of_players ?? '?' }}
      </p>

      <!-- List of joined players -->
      <ul v-if="(game?.players?.length ?? 0) > 0">
        <li v-for="player in game.players" :key="player">
          {{ player }}
        </li>
      </ul>

      <!-- Waiting / ready message -->
      <p v-if="(game?.players?.length ?? 0) < (game?.number_of_players ?? 0)">
        Waiting for remaining players to join...
      </p>
      <p v-else-if="(game?.players?.length ?? 0) === game?.number_of_players">
        All players have joined! Get ready to start the game.
      </p>
    </div>
  </div>
</template>

<style scoped>
.pending-page {
  max-width: 600px;

}

.error {
  color: red;
  margin: 1rem 0;
}

ul {
  list-style-type: disc;
  padding-left: 1.5rem;
  margin-bottom: 1rem;
}
</style>
