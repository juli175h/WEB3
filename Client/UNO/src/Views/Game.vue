<script setup lang="ts">
  import {useOngoingGamesStore} from '@/stores/ongoing_games_store';
  //import DiceRoll from '../components/DiceRoll.vue'
  //import ScoreCard from '../components/ScoreCard.vue'
  import { useRoute, useRouter } from 'vue-router';
  import { computed, ref, watch } from 'vue';
  import {usePlayerStore} from '@/stores/player_store';
  import Page from '@/components/Page.vue';

  const ongoingGameStore = useOngoingGamesStore()
  const playerStore = usePlayerStore()
  const route = useRoute()
  const router = useRouter()

  let id = ref(route.params.id.toString())
  watch(() => route.params.id, (newId) => id.value = newId.toString())
  const game = computed(() => ongoingGameStore.game(id.value))
  const enabled = computed(() => game.value !== undefined && playerStore.player === game.value.playerInTurn())
  const finished = computed(() => game.value === undefined || game.value.is_finished())
  const standings = computed(() => {
    if (game.value === undefined) return [] 
    const g = game.value
    const standings: [string, number][] = g.scores().map((s, i) => [g.players()[i], s.total()])
    standings.sort(([_, score1], [__, score2]) => score2 - score1)
    return standings
  })

  if (playerStore.player === undefined)
    router.push(`/game=${id.value}`)
  else if (game.value === undefined)
    router.replace('/')
  
</script>

<template>
  <Page v-if="game && playerStore.player">
    <div class="game">
      <div class="meta">
        <h1>Game #{{id}} </h1>
      </div>
      <ScoreCard class="card" :game="game" :player="playerStore.player" :enabled="enabled"/>
      <DiceRoll v-if="!finished" class ="roll" :game="game" :player="playerStore.player" :enabled="enabled"/>
      <div v-if="finished" class="scoreboard">
        <table>
          <thead><tr><td>Player</td><td>Score</td></tr></thead>
          <tbody>
            <tr v-for="row in standings" :class="row[0] == playerStore.player? 'current' : undefined"><td>{{row[0]}}</td><td>{{row[1]}}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </Page>
</template>

<style>
  .roll {
    margin: .3rem 1rem;
  }
  .scoreboard {
    display: inline-block;
    margin: .3rem 1rem;
  }
  .scoreboard thead {
    font-weight: bold;
    font-size: large;
  }
  .scoreboard > table {
    border: 1px solid black;
    border-collapse: collapse;
  }
  .scoreboard td {
    border: 1px solid black;
    border-collapse: collapse;
    padding: .2rem
  }
  .current {
    font-weight: bold;
    background-color: firebrick;
    color: lavenderblush;
  }
  .game {
    contain: content;
  }
  .card {
    float: left;
  }
</style>
