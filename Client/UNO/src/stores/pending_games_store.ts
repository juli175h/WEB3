import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { PendingUno } from '../model/api';
import { pending_games, onPending, new_game, join } from '../model/api';

export const usePendingUnoStore = defineStore('pending_uno', () => {
  const gameList = ref<PendingUno[]>([]);
  const loading = ref(false);
  const error = ref(false);
  const onRemovedCallbacks: ((id: string) => void)[] = []; // ✅ added

  async function loadPendingGames() {
    loading.value = true;
    error.value = false;
    try {
      const res = await pending_games();
      gameList.value = res.map(g => ({ ...g }));
    } catch (err) {
      console.error('❌ Failed to load pending games:', err);
      error.value = true;
    } finally {
      loading.value = false;
    }
  }

  function subscribeToUpdates() {
    try {
      onPending((updated) => {
        if (!updated) return; // safety for null events

        const fresh = structuredClone(updated);
        const idx = gameList.value.findIndex((g) => g.id === fresh.id);

        if (fresh.pending) {
          if (idx !== -1) gameList.value[idx] = fresh;
          else gameList.value.push(fresh);
        } else {
          // ✅ pending -> active, remove from list
          if (idx !== -1) gameList.value.splice(idx, 1);
          onRemovedCallbacks.forEach(cb => cb(fresh.id));
        }
      });
    } catch (err) {
      console.error('❌ Subscription error:', err);
      error.value = true;
    }
  }

  async function createGame(creator: string, numberOfPlayers: number) {
    const created = await new_game(numberOfPlayers, creator);
    const fresh = structuredClone(created);
    if (fresh.pending) {
      gameList.value.push(fresh);
    }
    return fresh;
  }

  async function joinGame(id: string, player: string) {
    const found = gameList.value.find((g) => g.id === id);
    if (!found) throw new Error('Game not found');
    const joined = await join(found, player);
    const fresh = structuredClone(joined);
    const idx = gameList.value.findIndex((g) => g.id === fresh.id);
    if (idx !== -1) gameList.value[idx] = fresh;
    else gameList.value.push(fresh);
    return fresh;
  }

  function onPendingRemoved(cb: (id: string) => void) {
    onRemovedCallbacks.push(cb);
  }

  function pending() {
    return gameList.value;
  }

  return {
    gameList,
    loading,
    error,
    loadPendingGames,
    subscribeToUpdates,
    createGame,
    joinGame,
    pending,
    onPendingRemoved, // ✅ expose helper
  };
});
