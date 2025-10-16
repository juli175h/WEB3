<script setup lang="ts">
  //import * as api from '../model/api'
  import { ref } from 'vue';
  import {useRouter} from 'vue-router';
  import {usePlayerStore} from '@/stores/player_store';
  import Page from '@/components/Page.vue';

  const playerStore = usePlayerStore()

  const router = useRouter()

  const number_of_players = ref(3)

  const new_game = async (player: string) => {
    const pending_game = await api.new_game(number_of_players.value, player)
    setTimeout(() => router.push(`/pending/${pending_game.id}`), 100)
  }

  function testButton() {
    router.push('/Game/0')
  }
//TODO: Put the if above in new_game so it handles the undefined name. Undefined = unable to click or something
//  if (playerStore.player === undefined)
//    router.push('/login')
  function addPlayer() { players.value.push("") }
  function goToPending() { router.push({ name: 'Pending', query: { players: JSON.stringify(players.value) } }) }

</script>

<template>
  <div>
  <div style="margin-bottom: 1rem;">
    <label for="player-name">Your Name:</label>
    <input id="player-name" v-model="playerName" placeholder="Enter your name" />
  </div>

  <div style="margin-bottom: 1rem;">
    <label for="player-count">Number of Players for New Game:</label>
    <select id="player-count" v-model.number="playerCount">
      <option v-for="n in 3" :key="n" :value="n + 1">{{ n + 1 }}</option>
      <!-- Generates options 2, 3, 4 -->
    </select>
  </div>

  <h3>Pending Games</h3>
  <ul>
    <li v-for="game in pendingGames" :key="game.id">
      Game #{{ game.id }} ({{ game.players.length }}/{{ game.maxPlayers }} players)
      <button
          :disabled="game.players.length >= game.maxPlayers || !canProceed"
          @click="joinGame(game.id)"
      >
        Join
      </button>
    </li>
  </ul>

  <button :disabled="!canProceed" @click="createGame">Create New Game</button>
  </div>
</template>
