import { defineStore } from "pinia";
import { ref } from "vue";
import type { PendingUno } from "../model/game";
import {
  pending_games,
  onPending,
  onActive,
  new_game,
  join,
} from "../model/api";

export const usePendingUnoStore = defineStore("pending_uno", () => {
  const gameList = ref<PendingUno[]>([]);
  const loading = ref(false);
  const error = ref(false);

  /* ---------------- Load pending games ---------------- */
  async function loadPendingGames() {
    loading.value = true;
    error.value = false;
    try {
      const res = await pending_games();
      gameList.value = res.slice(); // shallow copy
    } catch (err) {
      console.error("❌ Failed to load pending games:", err);
      error.value = true;
    } finally {
      loading.value = false;
    }
  }

  /* ---------------- Subscriptions ---------------- */
 function subscribeToUpdates(onBecameActive?: (id: string) => void) {
  try {
    // Listen for pending updates
    onPending((updated) => {
      if (!updated) return;

      const idx = gameList.value.findIndex((g) => g.id === updated.id);

      if (updated.pending === false) {
        console.log("🎯 Game became active — removing pending and redirecting:", updated.id);
        if (idx !== -1) gameList.value.splice(idx, 1);
        if (onBecameActive) onBecameActive(updated.id);
        return;
      }

      if (idx !== -1) {
        gameList.value[idx] = { ...gameList.value[idx], ...updated };
      } else {
        gameList.value.push({ ...updated, players: updated.players ?? [] });
      }
    });

    // Listen for active game updates (just in case client gets them first)
    onActive((active) => {
      const idx = gameList.value.findIndex((g) => g.id === active.id);
      if (idx !== -1) gameList.value.splice(idx, 1);
      if (onBecameActive) onBecameActive(active.id);
    });
  } catch (err) {
    console.error("❌ Subscription error:", err);
    error.value = true;
  }
}



  /* ---------------- Mutations ---------------- */
  async function createGame(creator: string, numberOfPlayers: number) {
    const created = await new_game(numberOfPlayers, creator);

    if ("creator" in created) {
      // Pending
      const idx = gameList.value.findIndex((g) => g.id === created.id);
      if (idx !== -1) gameList.value[idx] = { ...gameList.value[idx], ...created };
      else gameList.value.push({ ...created, players: created.players ?? [] });
    } else {
      // Became active immediately — remove any stale lobby
      const idx = gameList.value.findIndex((g) => g.id === created.id);
      if (idx !== -1) gameList.value.splice(idx, 1);
    }

    return created;
  }

  async function joinGame(id: string, player: string) {
    const lobby = gameList.value.find((g) => g.id === id);
    if (!lobby) throw new Error("Game not found");

    const joined = await join(lobby, player);

    if ("creator" in joined) {
      const idx = gameList.value.findIndex((g) => g.id === joined.id);
      if (idx !== -1) gameList.value[idx] = { ...gameList.value[idx], ...joined };
      else gameList.value.push({ ...joined, players: joined.players ?? [] });
    } else {
      const idx = gameList.value.findIndex((g) => g.id === joined.id);
      if (idx !== -1) gameList.value.splice(idx, 1);
    }

    return joined;
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
