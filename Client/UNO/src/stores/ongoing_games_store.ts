import { defineStore } from 'pinia'
import { reactive } from 'vue'
import { Game } from '../../../../Domain/src/model/UnoRound.js'
import { Player } from '../../../../Domain/src/model/Player.ts'

interface GameEntry {
  id: number
  game: Game
  maxPlayers: number
}

export const useOngoingGamesStore = defineStore('ongoingGames', () => {
  const games = reactive<GameEntry[]>([])

  function createGame(playerName: string, maxPlayers = 2): number {
    const id = Math.max(...games.map(g => g.id), 0) + 1
    const game = new Game()
    game.initialize([new Player(0, playerName)])
    games.push({ id, game, maxPlayers })
    return id
  }

  function joinGame(id: number, playerName: string) {
    const entry = games.find(g => g.id === id)
    if (!entry) return
    if (entry.game.players().length < entry.maxPlayers) {
      entry.game.players().push(new Player(entry.game.players().length, playerName))
    }
  }

  function getGame(id: number) {
    return games.find(g => g.id === id)?.game
  }

  function getPendingGames() {
    return games.filter(g => g.game.players().length < g.maxPlayers)
  }

  return { games, createGame, joinGame, getGame, getPendingGames }
})
