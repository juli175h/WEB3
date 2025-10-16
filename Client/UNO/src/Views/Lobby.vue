<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { usePendingUnoStore } from '../stores/pending_games_store.ts';

const pendingStore = usePendingUnoStore();
const router = useRouter();

const playerName = ref('');
const maxPlayers = ref(2); // default 2

const pendingGames = computed(() => pendingStore.pending());

// Create a new game
function createGame() {
  if (!playerName.value) return alert('Enter your name!');
  const game = pendingStore.createGame(playerName.value, maxPlayers.value);
  router.push(`/pending/${game.id}`);
}

// Join an existing game
function joinGame(id: number) {
  if (!playerName.value) return alert('Enter your name!');
  pendingStore.joinGame(id, playerName.value);
  router.push(`/pending/${id}`);
}
</script>

<template>
  <div>
    <h2>Lobby</h2>

    <div>
      <label>Your Name:</label>
      <input v-model="playerName" placeholder="Enter your name" />
    </div>

    <div>
      <label>Number of Players (2-4):</label>
      <select v-model.number="maxPlayers">
        <option v-for="n in 3" :key="n" :value="n+1">{{ n+1 }}</option>
      </select>
    </div>

    <button @click="createGame" :disabled="!playerName">Create New Game</button>

    <h3>Pending Games</h3>
    <ul>
      <li v-for="game in pendingGames" :key="game.id">
        Game #{{ game.id }} ({{ game.players.length }}/{{ game.maxPlayers }} players)
        <button
            @click="joinGame(game.id)"
            :disabled="game.players.length >= game.maxPlayers || !playerName"
        >
          Join
        </button>
      </li>
    </ul>
  </div>
</template>
