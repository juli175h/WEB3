<script setup lang="ts">
import Page from '@/components/Page.vue'
import Card from '@/components/Card.vue'
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useOngoingUnoStore } from '../stores/ongoing_games_store';
import { usePlayerStore } from '@/stores/player_store'
import { useUnoGame } from '../Composable/useUnoGame'


const route = useRoute()
const store = useOngoingUnoStore()
const gameId = Number(route.params.id)
const game = computed(() => store.getGame(gameId))
const currentPlayer = computed(() => game.value?.currentPlayer())
</script>

<template>
  <div v-if="game">
    <h2>Game #{{ gameId }}</h2>
    <p>Current turn: {{ currentPlayer?.name }}</p>

    <div>
      <h3>Discard Pile Top</h3>
      <Card v-if="game.discardPileTop" :card="game.discardPileTop" />
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
