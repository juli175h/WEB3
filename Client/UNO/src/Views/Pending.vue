<script setup lang="ts">
  import {usePendingGamesStore} from '@/stores/pending_games_store';
  import {usePlayerStore} from '@/stores/player_store';
  import {computed, onBeforeMount, ref, watch} from 'vue';
  import { useRoute, useRouter } from 'vue-router';
  //import * as api from '../model/api'
  import {useOngoingGamesStore} from '@/stores/ongoing_games_store';
  import Page from '@/components/Page.vue';

  const route = useRoute()
  const router = useRouter()

  const pendingGamesStore = usePendingGamesStore()
  const ongoingGamesStore = useOngoingGamesStore()
  const playerStore = usePlayerStore()

  let id = ref(route.params.id.toString())

  onBeforeMount(async () => {
    let game = pendingGamesStore.game(id.value)
    if (!game) return game
    if (!game.creator || !game.number_of_players) {
      game = await api.pending_game(game?.id)
      if (game) pendingGamesStore.update(game)
    }
  })

  const game = computed(() => pendingGamesStore.game(id.value))
  
  const canJoin = computed(() => 
    game.value && playerStore.player 
    && game.value.players.indexOf(playerStore.player) === -1
  )

  watch(() => route.params.id, (newId) => id.value = newId.toString())
  watch(() => pendingGamesStore.game(id.value), g => {
    if (!g) {
      if (ongoingGamesStore.game(id.value))
        router.replace(`/game/${id.value}`)
      else
        router.replace('/')
    }
  })

  const join = () => {
    if (game.value &&  playerStore.player && canJoin.value) {
      api.join(game.value, playerStore.player)
    }
  }

  if (playerStore.player === undefined)
    router.push(`/`)
  else if (game.value === undefined) {
    if (ongoingGamesStore.game(id.value))
      router.replace('/game/' + id.value)
    else
      router.replace('/')
  }
</script>

<template>
  <Page>
    <h1>Game #{{id}}</h1>
    <div>Created by: {{game?.creator}}</div>
    <div>Players: {{game?.players.join(', ')}}</div>
    <div>Available Seats: {{ (game?.number_of_players??2) - (game?.players.length??0)}}</div>
    <button v-if="canJoin" @click="join">Join</button>
  </Page>
</template>
