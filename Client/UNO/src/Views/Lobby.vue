<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { usePendingUnoStore } from '../stores/pending_games_store';
import { usePlayerStore } from '../stores/player_store';
import { games as fetchActiveGames, onActive } from '../model/api';
import type { IndexedUno } from '../model/game';

const pendingStore = usePendingUnoStore();
const router = useRouter();
const user = usePlayerStore();

const playerName = ref('');
const maxPlayers = ref(2);
const activeGames = ref<IndexedUno[]>([]);

onMounted(async () => {
  await pendingStore.loadPendingGames();

  // load current active games
    try {
  const loaded = await fetchActiveGames();
    // debug: log raw fetched active games
    console.log('[Lobby] fetched active games (raw):', loaded);
      // debug: check for shared player array references between games
      if (Array.isArray(loaded)) {
        for (let i = 0; i < loaded.length; i++) {
          for (let j = i + 1; j < loaded.length; j++) {
            try {
              if (loaded[i].players && loaded[j].players && loaded[i].players === loaded[j].players) {
                console.warn(`[Lobby][DEBUG] games ${loaded[i].id} and ${loaded[j].id} share the same players array reference`);
              }
            } catch (err) {
              // ignore
            }
          }
        }
      }
    // normalize and dedupe by id
  const noFinished = loaded.filter(g => !g.finished);
  const map = new Map<string, IndexedUno>();
  for (const g of noFinished) map.set(String(g.id), g);
  activeGames.value = Array.from(map.values());
    console.log('[Lobby] activeGames normalized:', activeGames.value);
    // debug: also check normalized array for shared player references
    if (Array.isArray(activeGames.value)) {
      for (let i = 0; i < activeGames.value.length; i++) {
        for (let j = i + 1; j < activeGames.value.length; j++) {
          if (activeGames.value[i].players && activeGames.value[j].players && activeGames.value[i].players === activeGames.value[j].players) {
            console.warn(`[Lobby][DEBUG] normalized games ${activeGames.value[i].id} and ${activeGames.value[j].id} share the same players array reference`);
          }
        }
      }
    }
  } catch (e) {
    console.error('Failed to load active games', e);
  }

  // subscribe to updates for active games to keep list fresh
  pendingStore.subscribeToUpdates((id) => {
    // ✅ Redirect to the active game when a lobby becomes active
    router.push(`/game/${id}`);
  });

  // listen for active game updates and refresh the whole active games list
  // (keeps player lists correct and avoids any merge/duplication issues)
  onActive(async () => {
    try {
  const refreshed = await fetchActiveGames();
      // debug: log refresh payload
      console.log('[Lobby] onActive refresh (raw):', refreshed);
      // debug: check refreshed for shared players arrays
      if (Array.isArray(refreshed)) {
        for (let i = 0; i < refreshed.length; i++) {
          for (let j = i + 1; j < refreshed.length; j++) {
            if (refreshed[i].players && refreshed[j].players && refreshed[i].players === refreshed[j].players) {
              console.warn(`[Lobby][DEBUG] refreshed games ${refreshed[i].id} and ${refreshed[j].id} share the same players array reference`);
            }
          }
        }
      }
      // normalize by id to keep stable ordering
  const noFinished = refreshed.filter(g => !g.finished);
  const map = new Map<string, IndexedUno>();
  for (const gg of noFinished) map.set(String(gg.id), gg);
  activeGames.value = Array.from(map.values());
      console.log('[Lobby] onActive activeGames normalized:', activeGames.value);
    } catch (e) {
      console.error('Failed to refresh active games on update', e);
    }
  });
});


const pendingGames = computed(() => pendingStore.pending());

function playerNames(game: any) {
  if (!game || !game.players) return '';
  return game.players
    .map((p: any) => (typeof p === 'string' ? p : (p && p.name ? p.name : String(p))))
    .join(', ');
}

function canJoinActive(game: any) {
  if (!user.player) return false;
  const want = String(user.player).trim().toLowerCase();
  return (game.players || []).some((p: any) => {
    if (typeof p === 'string') return p.trim().toLowerCase() === want;
    if (p && typeof p.name === 'string') return p.name.trim().toLowerCase() === want;
    return false;
  });
}

function joinActive(game: any) {
  // ensure local player name is stored from the text input if provided
  if (playerName.value) user.player = playerName.value;

  if (!user.player) {
    alert('Enter your name in the lobby first');
    return;
  }

  if (!canJoinActive(game)) {
    // allow click but inform the user they can't join under a different name
    alert('Your name is not part of this game. Join is only allowed for players already in the match.');
    return;
  }

  router.push(`/game/${game.id}`);
}

// Create a new game
async function createGame() {
  if (!playerName.value) return alert('Enter your name!');
  user.player = playerName.value;
  // persist local player name so Game view can identify "you"
  // (keeps creator identified after navigation)
  // store the name immediately
  // NOTE: we intentionally always navigate to the pending page so the creator
  // waits for other players instead of being redirected straight to an active match.
  const game = await pendingStore.createGame(playerName.value, maxPlayers.value);
  router.push(`/pending/${game.id}`);
}

// Join an existing game
async function joinGame(id: string) {
  if (!playerName.value) return alert('Enter your name!');
  user.player = playerName.value;
  const joined = await pendingStore.joinGame(id, playerName.value);

  // ✅ Go to pending if still waiting, or directly to game if lobby is full
  if (joined.pending) {
    router.push(`/pending/${joined.id}`);
  } else {
    router.push(`/game/${joined.id}`);
  }
}
</script>

<template>
  <div class="lobby">
    <h2>UNO Lobby</h2>

    <section class="setup">
      <div>
        <label>Your Name:</label>
        <input v-model="playerName" placeholder="Enter your name" />
      </div>
      <div>
        <label>Number of Players (2–4):</label>
        <select v-model.number="maxPlayers">
          <option v-for="n in 3" :key="n" :value="n + 1">{{ n + 1 }}</option>
        </select>
      </div>

      <button @click="createGame" :disabled="!playerName">Create New Game</button>
    </section>

    <section class="games">
      <h3>Active Games</h3>

      <div v-if="activeGames.length">
        <ul>
          <li v-for="g in activeGames" :key="g.id">
            Game #{{ g.id }} — Players: {{ playerNames(g) }}
            <button @click="joinActive(g)">
              Join
            </button>
          </li>
        </ul>
      </div>
      <p v-else>No active games available.</p>
    </section>

    <section class="games">
      <h3>Pending Games</h3>

      <div v-if="pendingStore.loading">Loading games...</div>

      <div v-else-if="pendingStore.error" class="error">
        ⚠️ Server error: Could not connect to UNO server.
      </div>

      <ul v-else-if="pendingGames.length">
        <li v-for="game in pendingGames" :key="game.id">
          Game #{{ game.id }}
          ({{ game.players?.length || 0 }}/{{ game.number_of_players }} players)
          <button
            @click="joinGame(game.id)"
            :disabled="(game.players?.length || 0) >= game.number_of_players || !playerName"
          >
            Join
          </button>
        </li>
      </ul>

      <p v-else>No pending games available.</p>
    </section>
  </div>
</template>

<style scoped>
.lobby {
  padding: 1.5rem;
}
section.setup {
  margin-bottom: 1rem;
}
input,
select {
  margin: 0 0.5rem;
}
button {
  margin-top: 0.5rem;
}
.error {
  color: red;
  font-weight: bold;
  margin: 1rem 0;
}
</style>
