import { computed, reactive, type Reactive } from 'vue'
import { defineStore } from 'pinia'
import type { IndexedYahtzeeSpecs } from '@/model/game'

export const usePendingGamesStore = defineStore('pending games', () => {
  const gameList = reactive<IndexedYahtzeeSpecs[]>([])
  const games = computed((): Reactive<Readonly<IndexedYahtzeeSpecs[]>> => gameList)
  const game = (id: string): IndexedYahtzeeSpecs | undefined => {
    return gameList.find(g => g.id === id)
  }
  
  const update = (game: Partial<IndexedYahtzeeSpecs>) => {
    const index = gameList.findIndex(g => g.id === game.id)
    if (index > -1) {
      gameList[index] = {... gameList[index], ...game}
      return game
    }
  }

  const upsert = (game: IndexedYahtzeeSpecs) => {
    if (gameList.some(g => g.id === game.id)) {
      update(game)
    } else {
      gameList.push(game)
    }
  }

  const remove = (game: {id: string}) => {
    const index = gameList.findIndex(g => g.id === game.id)
    if (index > -1) {
      gameList.splice(index, 1)
    }
  }

  return { games, game, update, upsert, remove }
})
