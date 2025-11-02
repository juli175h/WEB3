<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Card from '../components/Card.vue'
import { usePlayerStore } from '../stores/player_store'
import { game as fetchGame, onActive, draw as apiDraw, my_hand, playCardByIndex, skipTurn } from '../model/api'
import type { Card as UnoCard } from '../../../../Domain/src/model/UnoCard'
import type { IndexedUno } from '../model/game'

const route = useRoute()
const router = useRouter()
const user = usePlayerStore()

const gameId = String(route.params.id)
const active = ref<IndexedUno | undefined>(undefined)
const loading = ref(true)
const error = ref<string | null>(null)

onMounted(async () => {
  // If the browser doesn't know which player this is, redirect to the lobby
  // so the user can enter their name before entering a game URL directly.
  if (!user.player) {
    router.push('/');
    loading.value = false;
    return;
  }
  try {
    active.value = await fetchGame(gameId)
    if (active.value) await loadHand()
    await onActive((g) => {
      if (String(g.id) === gameId) {
        active.value = g
        loadHand()
      }
    })
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to load game'
  } finally {
    loading.value = false
  }
})

const players = computed(() => active.value?.players ?? [])
const round = computed(() => active.value?.currentRound)
const currentPlayer = computed(() => {
  const idx = round.value?.currentPlayerIndex ?? 0
  return players.value[idx]
})
const discardTop = computed(() => round.value?.discardTop)
const isYourTurn = computed(() => {
  const me = user.player
  return !!(me && currentPlayer.value && currentPlayer.value.name === me)
})

const myScore = computed(() => {
  const me = user.player
  if (!me) return 0
  const p = players.value.find((pp: any) => pp.name === me)
  return p?.score ?? 0
})

// Winner modal state (derived from active match)
const isFinished = computed(() => !!active.value?.finished)
const winnerName = computed(() => active.value?.winner?.name ?? '')
function goToLobby() { router.push('/') }

// Local fallback for the discard top so the acting player sees the card immediately
const lastDiscard = ref<UnoCard | null>(null)
const cardToShow = computed<UnoCard | null>(() => discardTop.value ?? lastDiscard.value)

const err = ref('')
function clearErrSoon() { if (err.value) setTimeout(() => (err.value = ''), 1500) }

// Wild card color picker state
const showColorPicker = ref(false)
const pendingWildIndex = ref<number | null>(null)

// Draw modal state
const showDrawModal = ref(false)
const drawnCard = ref<UnoCard | null>(null)
const drawnIndex = ref<number | null>(null)
const drawnPlayable = ref<boolean>(false)

function openColorPickerFor(index: number) {
  pendingWildIndex.value = index
  showColorPicker.value = true
}

async function chooseColor(color: string) {
  if (pendingWildIndex.value === null) return
  const idx = pendingWildIndex.value
  // snapshot the card being played for local fallback after success
  const played = hand.value[idx] ?? null
  try {
    active.value = await playCardByIndex(String(active.value?.id), user.player!, idx, color)
    await loadHand()
    // If server already returned a discardTop we use that; otherwise show a local fallback
    if (active.value?.currentRound?.discardTop) {
      lastDiscard.value = null
    } else if (played) {
      lastDiscard.value = played as UnoCard
    }
  } catch (e: any) {
    err.value = e?.message ?? 'Illegal move'
    clearErrSoon()
  } finally {
    showColorPicker.value = false
    pendingWildIndex.value = null
  }
}

function cancelColorPick() {
  showColorPicker.value = false
  pendingWildIndex.value = null
}

async function onDraw() {
  if (!active.value || !user.player || !isYourTurn.value) return
  // close any wild picker
  showColorPicker.value = false
  pendingWildIndex.value = null
  try {
    const before = hand.value.slice()
    // perform draw on server
    active.value = await apiDraw(String(active.value.id), user.player)
    // fetch updated hand
    const updated = await my_hand(String(active.value.id), user.player)
    // compute which card was drawn (multiset diff)
    const keyFor = (c: any) => `${c.type}::${c.color ?? ''}::${c.value ?? ''}`
    const counts: Record<string, number> = {}
    for (const c of before) counts[keyFor(c)] = (counts[keyFor(c)] || 0) + 1
    let drawn: any = null
    let drawnIdx: number | null = null
    for (let i = 0; i < updated.length; i++) {
      const c = updated[i]
      const k = keyFor(c)
      if ((counts[k] || 0) > 0) {
        counts[k] = counts[k] - 1
        continue
      }
      drawn = c
      drawnIdx = i
      break
    }
    // fallback: if lengths grew and diff didn't detect, assume last card
    if (!drawn || drawnIdx === null) {
      if (updated.length > before.length) {
        drawn = updated[updated.length - 1]
        drawnIdx = updated.length - 1
      }
    }
  // update local hand to latest
  hand.value = updated
  // ensure we have a fresh top-of-discard from server after draw
  const fresh = await fetchGame(String(active.value.id))
  if (fresh) active.value = fresh
  // clear any local fallback so we always show the authoritative top card after draw
  lastDiscard.value = null
    // if a new card exists, open the draw modal; Play button enabled only if playable
    if (drawn && drawnIdx !== null) {
      const top = cardToShow.value
      const isPlayableCard = (pc: any, topc: any) => {
        if (!topc) return true
        if (pc.type === 'WILD' || pc.type === 'WILD DRAW') return true
        if (pc.type === 'NUMBERED' && topc.type === 'NUMBERED') {
          return pc.color === topc.color || pc.value === topc.value
        }
        if (pc.type === topc.type) return true
        if (pc.color && topc.color && pc.color === topc.color) return true
        return false
      }
      drawnCard.value = drawn
      drawnIndex.value = drawnIdx
      drawnPlayable.value = isPlayableCard(drawn, top)
      showDrawModal.value = true
    }
  } catch (e: any) {
    err.value = e?.message ?? 'Cannot draw now'
    clearErrSoon()
  }
}

// Play the drawn card (from the draw modal)
async function playDrawnCard() {
  if (!active.value || !user.player || drawnIndex.value === null) return
  const idx = drawnIndex.value
  const card = drawnCard.value
  if (!card) return

  // if wild, open color picker which will call play with chosenColor
  if (card.type === 'WILD' || card.type === 'WILD DRAW') {
    // reuse pendingWildIndex for the drawn index
    pendingWildIndex.value = idx
    showColorPicker.value = true
    showDrawModal.value = false
    return
  }

  try {
    active.value = await playCardByIndex(String(active.value.id), user.player, idx)
    await loadHand()
    if (active.value?.currentRound?.discardTop) {
      lastDiscard.value = null
    } else {
      lastDiscard.value = card
    }
  } catch (e: any) {
    err.value = e?.message ?? 'Illegal move'
    clearErrSoon()
  } finally {
    showDrawModal.value = false
    drawnCard.value = null
    drawnIndex.value = null
    drawnPlayable.value = false
  }
}

// Skip after drawing (ends your turn)
async function skipDrawnCard() {
  if (!active.value || !user.player) return
  try {
    await skipTurn(String(active.value.id), user.player)
  } catch (e: any) {
    err.value = e?.message ?? 'Cannot skip now'
    clearErrSoon()
  } finally {
    showDrawModal.value = false
    drawnCard.value = null
    drawnIndex.value = null
    drawnPlayable.value = false
  }
}

// Load and show the local player's hand
const hand = ref<UnoCard[]>([])
async function loadHand() {
  if (!active.value || !user.player) return
  hand.value = await my_hand(String(active.value.id), user.player)
}

// Initial hand load and refresh on active updates
onMounted(async () => {
  // after initial fetchGame completes, load hand
  const stop = watch(
    () => active.value,
    async (v) => { if (v) await loadHand() },
    { immediate: false }
  )
})

// Play a card by hand index (server expects index)
async function onPlay(idx: number) {
  if (!active.value || !user.player || !isYourTurn.value) return
  const card = hand.value[idx]
  // If the played card is a wild, open the color picker instead of sending immediately
  if (card && (card.type === 'WILD' || card.type === 'WILD DRAW')) {
    openColorPickerFor(idx)
    return
  }

  try {
    active.value = await playCardByIndex(String(active.value.id), user.player, idx)
    await loadHand()
    // if server returned a discardTop, clear local fallback
    if (active.value?.currentRound?.discardTop) {
      lastDiscard.value = null
    } else {
      lastDiscard.value = card
    }
  } catch (e: any) {
    err.value = e?.message ?? 'Illegal move'
    clearErrSoon()
  }
}
</script>

<template>
  <div class="game">
    <h2>UNO Match #{{ gameId }}</h2>

    <div v-if="loading">Loading game...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else-if="!active">Game not found.</div>

    <template v-else>
      <section class="players">
        <h3>Players</h3>
        <ul>
          <li
            v-for="p in players"
            :key="p.id"
            :class="{ current: currentPlayer && p.id === currentPlayer.id, you: user.player && p.name === user.player }"
          >
            <span>{{ p.name }}</span>
            <small>
              (cards: {{ p.handCount }} · score: {{ p.score }})
              <span v-if="currentPlayer && p.id === currentPlayer.id"> · current turn</span>
              <span v-if="user.player && p.name === user.player"> · you</span>
            </small>
          </li>
        </ul>
      </section>

      <section class="table">
        <h3>Discard pile</h3>
        <div class="discard">
          <Card v-if="cardToShow" :card="cardToShow!" />
          <div v-else class="placeholder">No discard yet</div>
        </div>
        <p class="meta">Draw pile: {{ round?.drawPileCount ?? 0 }} · Direction: {{ round?.direction === -1 ? '⟲ CCW' : '⟳ CW' }}</p>
      </section>

      <section class="actions">
        <button @click="onDraw" :disabled="!isYourTurn">Draw</button>
        <p class="hint" v-if="!isYourTurn">Wait for your turn to draw.</p>
        <p class="error" v-if="err">{{ err }}</p>
      </section>

      <section class="hand" v-if="user.player">
        <h3>{{ user.player }}'s hand (score: {{ myScore }})</h3>
        <div class="cards">
          <Card
            v-for="(c, idx) in hand"
            :key="idx + '-' + (c.color || 'WILD') + '-' + c.type + '-' + c.value"
            :card="c"
            :class="{ disabled: !isYourTurn }"
            :clickable="isYourTurn"
            @click="onPlay(idx)"
          />
        </div>
      </section>

      <!-- Wild color picker modal -->
      <div v-if="showColorPicker" class="modal-overlay">
        <div class="modal">
          <h4>Pick a color</h4>
          <div class="colors">
            <button class="color red" @click="chooseColor('RED')">Red</button>
            <button class="color blue" @click="chooseColor('BLUE')">Blue</button>
            <button class="color green" @click="chooseColor('GREEN')">Green</button>
            <button class="color yellow" @click="chooseColor('YELLOW')">Yellow</button>
          </div>
          <div class="modal-actions">
            <button @click="cancelColorPick">Cancel</button>
          </div>
        </div>
      </div>

      <!-- Draw result modal -->
      <div v-if="showDrawModal" class="modal-overlay">
        <div class="modal">
          <h4>Drawn card</h4>
          <div class="drawn-card">
            <Card v-if="drawnCard" :card="drawnCard!" />
          </div>
          <p>Would you like to play this card or skip your turn?</p>
          <div class="modal-actions">
            <button @click="playDrawnCard" :disabled="!drawnPlayable">Play</button>
            <button @click="skipDrawnCard">Skip</button>
          </div>
        </div>
      </div>

      <!-- Winner modal -->
      <div v-if="isFinished" class="modal-overlay">
        <div class="modal">
          <h3>Game Over</h3>
          <p v-if="winnerName">{{ winnerName }} reached 500 points and wins!</p>
          <p v-else>We have a winner!</p>
          <div class="modal-actions">
            <button @click="goToLobby">Return to Lobby</button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.game {
  max-width: 960px;
  margin: 1.5rem auto;
  padding: 0 1rem;
}
.players ul {
  display: flex;
  gap: 1rem;
  list-style: none;
  padding: 0;
}
.players li {
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  background: #f5f5f5;
}
.players li.current { background: #e6f4ff; }
.players li.you { outline: 2px solid #888; }

.table { margin: 1rem 0; }
.discard { min-height: 130px; display: flex; align-items: center; }
.placeholder { padding: 0.5rem 0.75rem; color: #777; }

.meta { color: #555; margin-top: 0.25rem; }
.actions { margin-top: 0.75rem; }
.hint { color: #777; margin-top: 0.25rem; }
.error { color: #b10000; margin-top: 0.25rem; }

/* Hand layout */
.hand .cards {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}
.hand .cards .card {
  flex: 0 0 auto;
}

/* Modal styles */
.modal-overlay {
  position: fixed;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}
.modal {
  background: white;
  padding: 1rem 1.25rem;
  border-radius: 8px;
  min-width: 260px;
  text-align: center;
}
.colors { display:flex; gap:0.5rem; justify-content:center; margin:1rem 0 }
.color { padding:0.5rem 0.75rem; border-radius:6px; color:white; border:none; cursor:pointer }
.color.red { background:#e53935 }
.color.blue { background:#1e88e5 }
.color.green { background:#43a047 }
.color.yellow { background:#fbc02d; color:#222 }
.modal-actions { margin-top:0.5rem }
</style>

