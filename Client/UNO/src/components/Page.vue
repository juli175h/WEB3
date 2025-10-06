<script setup lang="ts">
  import { RouterLink } from 'vue-router'
  import { computed } from 'vue'
  import { useOngoingGamesStore } from '../stores/ongoing_games_store';
  import {usePlayerStore} from '../stores/player_store';
  import {usePendingGamesStore} from '../stores/pending_games_store';
  
  const ongoingGamesStore = useOngoingGamesStore()
  const pendingGamesStore = usePendingGamesStore()
  const playerStore = usePlayerStore()
  
  const isParticipant = (g: {players: readonly string[]}) => g.players.indexOf(playerStore.player ?? '') > -1
  
  const my_ongoing_games = computed(() => ongoingGamesStore.games.filter(g => isParticipant(g.to_memento()) && !g.is_finished()))
  const my_pending_games = computed(() => pendingGamesStore.games.filter(isParticipant))
  const other_pending_games = computed(() => pendingGamesStore.games.filter(g => !isParticipant(g)))
</script>

<template>
  <h2 class="subheader">Welcome player {{playerStore.player}}</h2>
  <nav>
    <RouterLink class='link' to="/">Lobby</RouterLink>
    
    <h2>My Games</h2>
    <h3>Ongoing</h3>
    <RouterLink class='link' v-for="game in my_ongoing_games" :to="`/game/${game.id}`">Game #{{game.id}}</RouterLink>
    
    <h3>Waiting for players</h3>
    <RouterLink class='link' v-for="game in my_pending_games" :to="`/pending/${game.id}`">Game #{{game.id}}</RouterLink>
    
    <h2>Available Games</h2>
    <RouterLink class='link' v-for="game in other_pending_games" :to="`/pending/${game.id}`">Game #{{game.id}}</RouterLink>
  </nav>
  
  <slot class='main'></slot>
</template>
