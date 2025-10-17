import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { PendingUno } from '../model/api';
import { pending_games, onPending, new_game, join } from '../model/api';

export const usePendingUnoStore = defineStore('pending_uno', () => {
  const gameList = ref<PendingUno[]>([]);
  const loading = ref(false);
  const error = ref(false);

  /* ---------------- Load pending games ---------------- */
  async function loadPendingGames() {
    loading.value = true;
    error.value = false;
    try {
      const res = await pending_games();
      gameList.value = res.map((g) => ({ ...g }));
    } catch (err) {
      console.error('❌ Failed to load pending games:', err);
      error.value = true;
    } finally {
      loading.value = false;
    }
  }

  /* ---------------- Subscriptions ---------------- */
  function subscribeToUpdates() {
    try {
      onPending((updated) => {
        if (!updated) return;

        console.log('📩 Pending store received update:', updated);

        // ✅ If the server signals pending=false, remove the lobby
        if ((updated as any).pending === false) {
          const id = (updated as any).id as string;
          console.log('🧭 Removing lobby because game started:', id);
          const idx = gameList.value.findIndex((g) => g.id === id);
          if (idx !== -1) gameList.value.splice(idx, 1);
          return;
        }

        // Normal pending update: merge or insert
        const fresh = structuredClone(updated);
        const idx = gameList.value.findIndex((g) => g.id === fresh.id);
        if (idx !== -1) {
          const prev = gameList.value[idx];
          gameList.value[idx] = {
            ...prev,
            ...fresh,
            players: fresh.players ?? prev.players ?? [],
          };
        } else {
          gameList.value.push({
            ...fresh,
            players: fresh.players ?? [],
          });
        }
      });
    } catch (err) {
      console.error('❌ Subscription error:', err);
      error.value = true;
    }
  }

  /* ---------------- Mutations ---------------- */
  async function createGame(creator: string, numberOfPlayers: number) {
    const created = await new_game(numberOfPlayers, creator);
    const fresh = structuredClone(created);
    if (fresh.pending) {
      gameList.value.push({ ...fresh, players: fresh.players ?? [] });
    }
    return fresh;
  }

  async function joinGame(id: string, player: string) {
    const found = gameList.value.find((g) => g.id === id);
    if (!found) throw new Error('Game not found');
    const joined = await join(found, player);
    const fresh = structuredClone(joined);
    const idx = gameList.value.findIndex((g) => g.id === fresh.id);
    if (idx !== -1) {
      const prev = gameList.value[idx];
      gameList.value[idx] = {
        ...prev,
        ...fresh,
        players: fresh.players ?? prev.players ?? [],
      };
    } else {
      gameList.value.push({ ...fresh, players: fresh.players ?? [] });
    }
    return fresh;
  }

  /* ---------------- Getters ---------------- */
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
  };
});
