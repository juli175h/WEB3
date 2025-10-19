<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { usePendingUnoStore } from '../stores/pending_games_store';

const pendingStore = usePendingUnoStore();
const router = useRouter();

const playerName = ref('');
const maxPlayers = ref(2);

onMounted(async () => {
  await pendingStore.loadPendingGames();
  pendingStore.subscribeToUpdates((id) => {
    // ✅ Redirect to the active game
    router.push(`/game/${id}`);
  });
});


const pendingGames = computed(() => pendingStore.pending());

// Create a new game
async function createGame() {
  if (!playerName.value) return alert('Enter your name!');
  const game = await pendingStore.createGame(playerName.value, maxPlayers.value);

  // ✅ Handle both pending and active results
  if (game.pending) {
    router.push(`/pending/${game.id}`);
  } else {
    router.push(`/game/${game.id}`);
  }
}

// Join an existing game
async function joinGame(id: string) {
  if (!playerName.value) return alert('Enter your name!');
  const joined = await pendingStore.joinGame(id, playerName.value);

  // ✅ Go to pending if still waiting, or directly to game if lobby is full
  if (joined.pending) {
    router.push(`/pending/${joined.id}`);
  } else {
    router.push(`/game/${joined.id}`);
  }
}
</script>

<template>
  <div class="lobby">
    <h2>UNO Lobby</h2>

    <section class="setup">
      <div>
        <label>Your Name:</label>
        <input v-model="playerName" placeholder="Enter your name" />
      </div>
      <div>
        <label>Number of Players (2–4):</label>
        <select v-model.number="maxPlayers">
          <option v-for="n in 3" :key="n" :value="n + 1">{{ n + 1 }}</option>
        </select>
      </div>

      <button @click="createGame" :disabled="!playerName">Create New Game</button>
    </section>

    <section class="games">
      <h3>Pending Games</h3>

      <div v-if="pendingStore.loading">Loading games...</div>

      <div v-else-if="pendingStore.error" class="error">
        ⚠️ Server error: Could not connect to UNO server.
      </div>

      <ul v-else-if="pendingGames.length">
        <li v-for="game in pendingGames" :key="game.id">
          Game #{{ game.id }}
          ({{ game.players?.length || 0 }}/{{ game.number_of_players }} players)
          <button
            @click="joinGame(game.id)"
            :disabled="(game.players?.length || 0) >= game.number_of_players || !playerName"
          >
            Join
          </button>
        </li>
      </ul>

      <p v-else>No pending games available.</p>
    </section>
  </div>
</template>

<style scoped>
.lobby {
  padding: 1.5rem;
}
section.setup {
  margin-bottom: 1rem;
}
input,
select {
  margin: 0 0.5rem;
}
button {
  margin-top: 0.5rem;
}
.error {
  color: red;
  font-weight: bold;
  margin: 1rem 0;
}
</style>
