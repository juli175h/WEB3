import { defineStore } from 'pinia';
import { reactive, computed } from 'vue';
import { UnoMatch } from '../../../../Domain/src/model/UnoMatch.ts';
import { Player } from '../../../../Domain/src/model/Player';
import type { Card } from '../../../../Domain/src/model/UnoCard.ts';

interface OngoingUnoGame {
  id: number;
  match: UnoMatch;
}

export const useOngoingUnoStore = defineStore('ongoing_uno', () => {
  const games = reactive<OngoingUnoGame[]>([]);
  let nextId = 1;

  // --- Get all games ---
  const allGames = computed(() => games);

  // --- Find game by ID ---
  function game(id: number) {
    return games.find(g => g.id === id);
  }

  // --- Create a new match ---
  function createMatch(playerNames: string[]) {
    const newMatch: OngoingUnoGame = {
      id: nextId++,
      match: new UnoMatch(playerNames),
    };
    games.push(newMatch);
    return newMatch;
  }

  // --- Play a card ---
  function playCard(gameId: number, playerId: number, card: Card) {
    const g = game(gameId);
    if (!g) return;

    const player = g.match.players.find(p => p.id === playerId);
    if (!player) return;

    g.match.currentRound.playCard(player, card);
  }

  // --- Draw a card ---
  function drawCard(gameId: number, playerId: number) {
    const g = game(gameId);
    if (!g) return;

    const player = g.match.players.find(p => p.id === playerId);
    if (!player) return;

    g.match.currentRound.drawCard(player);
  }

  // --- Advance round (called when round ends) ---
  function finishRound(gameId: number) {
    const g = game(gameId);
    if (!g) return;

    g.match.finishRound();
  }

  // --- Get current player of a game ---
  function currentPlayer(gameId: number): Player | undefined {
    const g = game(gameId);
    if (!g) return;
    return g.match.currentRound.currentPlayer;
  }

  return {
    allGames,
    game,
    createMatch,
    playCard,
    drawCard,
    finishRound,
    currentPlayer,
  };
});
