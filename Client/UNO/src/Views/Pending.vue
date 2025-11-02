<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { usePendingUnoStore } from '../stores/pending_games_store';
import { usePlayerStore } from '../stores/player_store';

const pendingStore = usePendingUnoStore();
const user = usePlayerStore();
const route = useRoute();
const router = useRouter();
const gameId = String(route.params.id);

const game = computed(() =>
  pendingStore.gameList.find(g => String(g.id) === gameId)
);

onMounted(async () => {
  // Guard: if no player name is set, send user back to lobby to enter a name
  if (!user.player) {
    router.push('/');
    return;
  }

  await pendingStore.loadPendingGames();

  // ✅ Let store handle redirect when game starts
  pendingStore.subscribeToUpdates((id) => {
    if (String(id) === gameId) {
      console.log(`🎉 Game ${id} started — redirecting...`);
      router.push(`/game/${id}`);
    }
  });
});
</script>


<template>
  <div class="pending-page">
    <h2>Pending Game #{{ gameId }}</h2>

    <div v-if="pendingStore.loading">Loading game...</div>

    <div v-else-if="pendingStore.error" class="error">
      Failed to load game.
    </div>

    <div v-else-if="!game">
      Game not found.
    </div>

    <div v-else>
      <p>
        Players joined: {{ game.players?.length ?? 0 }}/{{ game.number_of_players ?? '?' }}
      </p>

      <ul v-if="(game.players?.length ?? 0) > 0">
        <li v-for="player in game.players" :key="player">{{ player }}</li>
      </ul>

      <p v-if="(game.players?.length ?? 0) < (game.number_of_players ?? 0)">
        Waiting for remaining players to join...
      </p>
      <p v-else>All players have joined! Game starting...</p>
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
