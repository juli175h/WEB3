import { computed, reactive, type Reactive } from 'vue'
import { defineStore } from 'pinia'
import type { IndexedUno } from '@/model/game'

export const usePendingGamesStore = defineStore('pending games', () => {
  const gameList = reactive<IndexedUno[]>([])
  const games = computed((): Reactive<Readonly<IndexedUno[]>> => gameList)
  const game = (id: string): IndexedUno | undefined => {
    return gameList.find(g => g.id === id)
  }
  
  const update = (game: Partial<IndexedUno>) => {
    const index = gameList.findIndex(g => g.id === game.id)
    if (index > -1) {
      gameList[index] = {... gameList[index], ...game}
      return game
    }
  }

  const upsert = (game: IndexedUno) => {
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
