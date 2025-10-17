<script setup lang="ts">
//import Page from '../'
import Card from '../components/Card.vue'
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useOngoingUnoStore } from '../stores/ongoing_games_store'

const route = useRoute()
const store = useOngoingUnoStore()
const gameId = Number(route.params.id)

// Find the game in the store's games array
const game = computed(() =>
  store.allGames?.find(g => g.id === gameId)
)

// Current player (safely)
const currentPlayer = computed(() => game.value?.currentPlayer())

// Load games if needed
onMounted(async () => {
  if (!store.allGames || store.allGames.length === 0) {
    await store.loadGames?.()
  }
})
</script>

<template>
  <div v-if="!store.allGames || store.allGames.length === 0">
    Loading games...
  </div>

  <div v-else-if="!game">
    Game not found.
  </div>

  <div v-else class="game">
    <h2>Game #{{ gameId }}</h2>

    <p v-if="currentPlayer">
      Current turn: {{ currentPlayer.name }}
    </p>
    <p v-else>
      Waiting for game data...
    </p>

    <div>
      <h3>Discard Pile Top</h3>
      <Card v-if="game.discardPileTop" :card="game.discardPileTop" />
      <p v-else>No cards in discard pile yet.</p>
    </div>

    <div v-if="currentPlayer">
      <h3>{{ currentPlayer.name }}'s Hand</h3>
      <div style="display:flex; flex-wrap:wrap;">
        <Card
          v-for="card in currentPlayer.hand.cards"
          :key="card.color + card.type + card.value"
          :card="card"
          clickable
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.game {
  max-width: 800px;
  margin: 2rem auto;
  font-family: sans-serif;
}

.card {
  margin: 0.2rem;
}

p {
  margin: 0.5rem 0;
}
</style>
