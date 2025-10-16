import { defineStore } from 'pinia';
import { reactive, computed } from 'vue';
import { Player } from '../../../../Domain/src/model/Player'; // your domain Player

export interface PendingUnoGame {
  id: number;             // game ID counter
  players: Player[];      // list of players in this game
  maxPlayers: number;     // max number of players for the game
}

export const usePendingUnoStore = defineStore('pending_uno', () => {
  const gameList = reactive<PendingUnoGame[]>([]);
  let nextId = 1; // counter for game IDs

  const games = computed(() => gameList);
  const game = (id: number) => gameList.find(g => g.id === id);

  function createGame(playerName: string, maxPlayers: number) {
    const newGame: PendingUnoGame = {
      id: nextId++,
      players: [new Player(1, playerName)],
      maxPlayers
    };
    gameList.push(newGame);
    return newGame;
  }

  function joinGame(id: number, playerName: string) {
    const g = game(id);
    if (g && g.players.length < g.maxPlayers) {
      g.players.push(new Player(g.players.length + 1, playerName));
    }
    return g;
  }

  function pending() {
    return gameList.filter(g => g.players.length < g.maxPlayers);
  }

  return { games, game, createGame, joinGame, pending };
});
