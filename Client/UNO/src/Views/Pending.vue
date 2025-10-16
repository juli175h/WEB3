<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useOngoingGamesStore } from '@/stores/ongoing_games_store'

const router = useRouter()
const route = useRoute()
const store = useOngoingGamesStore()

const gameId = Number(route.query.gameId)
const game = store.getGame(gameId)
const gamePlayers = ref(game ? game.players().map(p => p.name) : [])

onMounted(() => {
  // Automatically add CPU players until game is full
  const interval = setInterval(() => {
    if (!game) return
    const maxPlayers = store.games.find(g => g.id === gameId)?.maxPlayers!
    if (game.players().length < maxPlayers) {
      game.players().push({ name: `CPU${game.players().length}`, hand: [] })
      gamePlayers.value = game.players().map(p => p.name)
    } else {
      clearInterval(interval)
      router.push({ name: 'Game', params: { id: gameId } })
    }
  }, 1000)
})
</script>

<template>
  <div>
    <h2>Waiting for players...</h2>
    <p>Game #{{ gameId }}</p>
    <ul>
      <li v-for="p in gamePlayers" :key="p">{{ p }}</li>
    </ul>
    <p>Starting game shortly...</p>
  </div>
</template>
