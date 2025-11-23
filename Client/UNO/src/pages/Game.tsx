import * as React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {Card} from '../components/Card'
import { useAppSelector } from '../store/hooks'
import {
  game as fetchGame,
  onActive,
  draw as apiDraw,
  my_hand,
  playCardByIndex,
  skipTurn,
} from '../services/api'
import type { Card as UnoCard } from 'Domain/src/model/UnoCard'
import type { IndexedUno } from '../services/game'
import './../styles/Game.css'

const Game: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const user = useAppSelector((state) => state.player.player)

  const [active, setActive] = React.useState(undefined as IndexedUno | undefined)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null as string | null)
  const [hand, setHand] = React.useState([] as UnoCard[])
  const [err, setErr] = React.useState('')
  const [lastDiscard, setLastDiscard] = React.useState(null as UnoCard | null)

  const [showColorPicker, setShowColorPicker] = React.useState(false)
  const [pendingWildIndex, setPendingWildIndex] = React.useState(null as number | null)

  const [showDrawModal, setShowDrawModal] = React.useState(false)
  const [drawnCard, setDrawnCard] = React.useState(null as UnoCard | null)
  const [drawnIndex, setDrawnIndex] = React.useState(null as number | null)
  const [drawnPlayable, setDrawnPlayable] = React.useState(false)

  // Prevent background scrolling and interactions while any modal is open
  React.useEffect(() => {
    const open = showColorPicker || showDrawModal || !!active?.finished;
    if (open) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => { document.body.classList.remove('modal-open'); };
  }, [showColorPicker, showDrawModal, active]);

  // Fetch game and subscribe to updates
  React.useEffect(() => {
    if (!user) {
      navigate('/')
      setLoading(false)
      return
    }

    const load = async () => {
      try {
        const g = await fetchGame(String(id))
        setActive(g)
        if (g) await loadHand(g)
        await onActive(async (update: IndexedUno) => {
          if (String(update.id) === id) {
            setActive(update)
            await loadHand(update)
          }
        })
      } catch (e: any) {
        setError(e?.message ?? 'Failed to load game')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, user, navigate])

  const loadHand = async (g: IndexedUno) => {
    if (!user) return
    const h = await my_hand(String(g.id), user)
    setHand(h)
  }

  const players = active?.players ?? []
  const round = active?.currentRound
  const currentPlayer = players[round?.currentPlayerIndex ?? 0]
  const discardTop = round?.discardTop
  const isYourTurn = user && currentPlayer?.name === user

  const myScore = React.useMemo(() => {
    const me = players.find((p: any) => p.name === user)
    return me?.score ?? 0
  }, [players, user])

  const isFinished = !!active?.finished
  const winnerName = active?.winner?.name ?? ''

  const cardToShow = discardTop ?? lastDiscard

  const clearErrSoon = () => setTimeout(() => setErr(''), 1500)

  // Track the server round index and clear transient `lastDiscard` only when
  // the server advances to a new round. This preserves immediate play feedback
  // while preventing the played card from appearing as the next round's discard.
  const prevRoundIndexRef = (React as any).useRef(null) as { current: number | null }
  React.useEffect(() => {
    const newIdx = active?.currentRound?.roundIndex ?? null
    if (prevRoundIndexRef.current !== null && newIdx !== prevRoundIndexRef.current) {
      setLastDiscard(null)
    }
    prevRoundIndexRef.current = newIdx
  }, [active?.currentRound?.roundIndex])

  const openColorPickerFor = (index: number) => {
    setPendingWildIndex(index)
    setShowColorPicker(true)
  }

  const chooseColor = async (color: string) => {
    if (pendingWildIndex == null || !active || !user) return
    const idx = pendingWildIndex
    const played = hand[idx]
    try {
      // show the played card immediately while we wait for the server update
      setLastDiscard(played)
      const updated = await playCardByIndex(String(active.id), user, idx, color)
      setActive(updated)
      await loadHand(updated)
    } catch (e: any) {
      // revert transient state on failure
      setLastDiscard(null)
      setErr(e?.message ?? 'Illegal move')
      clearErrSoon()
    } finally {
      setShowColorPicker(false)
      setPendingWildIndex(null)
    }
  }

  const onPlay = async (idx: number) => {
    if (!active || !user || !isYourTurn || isFinished) return
    const card = hand[idx]
    if (card.type === 'WILD' || card.type === 'WILD DRAW') {
      openColorPickerFor(idx)
      return
    }
    try {
      // show the played card immediately while we wait for the server update
      setLastDiscard(card)
      const updated = await playCardByIndex(String(active.id), user, idx)
      setActive(updated)
      await loadHand(updated)
    } catch (e: any) {
      // revert transient state on failure
      setLastDiscard(null)
      setErr(e?.message ?? 'Illegal move')
      clearErrSoon()
    }
  }

  // Local helper to determine playability of a card against the current discard top
  const cardIsPlayable = (card: UnoCard, top?: UnoCard | null) => {
    if (!top) return true
    if ((top.type === 'WILD' || top.type === 'WILD DRAW') && !top.color) return true
    if (card.type === 'WILD' || card.type === 'WILD DRAW') return true
    if (card.type === top.type) {
      if (card.type === 'NUMBERED' && top.type === 'NUMBERED') {
        return card.color === top.color || card.value === top.value
      }
      return true
    }
    if ('color' in card && 'color' in top && card.color && top.color && card.color === top.color) return true
    return false
  }

  const onDraw = async () => {
    if (!active || !user || !isYourTurn || isFinished) return
    try {
      const before = [...hand]
      const updatedGame = await apiDraw(String(active.id), user)
      setActive(updatedGame)
      const updatedHand = await my_hand(String(active.id), user)

      // Detect new card
      const diff = updatedHand.find(
        (c) => !before.some((b) => b.type === c.type && b.color === c.color && b.value === c.value)
      )
      const drawn = diff ?? updatedHand[updatedHand.length - 1]
      setHand(updatedHand)

      const fresh = await fetchGame(String(active.id))
      if (fresh) setActive(fresh)
      setLastDiscard(null)

      if (drawn) {
        const top = discardTop ?? lastDiscard
        const isPlayable = cardIsPlayable(drawn, top)
        setDrawnCard(drawn)
        setDrawnIndex(updatedHand.indexOf(drawn))
        setDrawnPlayable(isPlayable)
        setShowDrawModal(true)
      }
    } catch (e: any) {
      setErr(e?.message ?? 'Cannot draw now')
      clearErrSoon()
    }
  }

  const playDrawnCard = async () => {
    if (!active || !user || drawnIndex == null || !drawnCard || isFinished) return
    if (drawnCard.type === 'WILD' || drawnCard.type === 'WILD DRAW') {
      setPendingWildIndex(drawnIndex)
      setShowColorPicker(true)
      setShowDrawModal(false)
      return
    }
    try {
      // show the played drawn card immediately while we wait for the server update
      setLastDiscard(drawnCard)
      const updated = await playCardByIndex(String(active.id), user, drawnIndex)
      setActive(updated)
      await loadHand(updated)
    } catch (e: any) {
      // revert transient state on failure
      setLastDiscard(null)
      setErr(e?.message ?? 'Illegal move')
      clearErrSoon()
    } finally {
      setShowDrawModal(false)
      setDrawnCard(null)
      setDrawnIndex(null)
      setDrawnPlayable(false)
    }
  }

  const skipDrawnCard = async () => {
    if (!active || !user || isFinished) return
    try {
      await skipTurn(String(active.id), user)
    } catch (e: any) {
      setErr(e?.message ?? 'Cannot skip now')
      clearErrSoon()
    } finally {
      setShowDrawModal(false)
      setDrawnCard(null)
      setDrawnIndex(null)
      setDrawnPlayable(false)
    }
  }

  if (loading) return <div>Loading game…</div>
  if (error) return <div className="error">{error}</div>
  if (!active) return <div>Game not found.</div>

  return (
    <div className="game">
      <h2>UNO Match #{id}</h2>

      {/* Players */}
      <section className="players">
        <h3>Players</h3>
        <ul>
            {players.map((p: any) => (
            <li
              key={p.id}
              className={[
                p.id === currentPlayer?.id ? 'current' : '',
                user && p.name === user ? 'you' : '',
              ].join(' ')}
            >
              <span>{p.name}</span>
              <small>
                (cards: {p.handCount} · score: {p.score})
                {p.id === currentPlayer?.id && ' · current turn'}
                {user && p.name === user && ' · you'}
              </small>
            </li>
          ))}
        </ul>
      </section>

      {/* Table */}
      <section className="table">
        <h3>Discard pile</h3>
        <div className="discard">
          {cardToShow ? <Card card={cardToShow} /> : <div className="placeholder">No discard yet</div>}
        </div>
        <p className="meta">
          Draw pile: {round?.drawPileCount ?? 0} · Direction:{' '}
          {round?.direction === -1 ? '⟲ CCW' : '⟳ CW'}
        </p>
      </section>

      {/* Actions */}
      <section className="actions">
        <button onClick={onDraw} disabled={!isYourTurn}>
          Draw
        </button>
        {!isYourTurn && <p className="hint">Wait for your turn to draw.</p>}
        {err && <p className="error">{err}</p>}
      </section>

      {/* Hand */}
      {user && (
        <section className="hand">
          <h3>{user}'s hand (score: {myScore})</h3>
          <div className="cards">
            {hand.map((c: UnoCard, idx: number) => {
              const playable = cardIsPlayable(c, discardTop)
              const canClick = isYourTurn && playable && !isFinished
              return (
                <Card
                  key={idx + '-' + (c.color || 'WILD') + '-' + c.type + '-' + c.value}
                  card={c}
                  className={!canClick ? 'disabled' : ''}
                  onClick={canClick ? () => onPlay(idx) : undefined}
                />
              )
            })}
          </div>
        </section>
      )}

      {/* Modals */}
      {showColorPicker && (
        <div className="modal-overlay">
          <div className="modal">
            <h4>Pick a color</h4>
            <div className="colors">
              {['RED', 'BLUE', 'GREEN', 'YELLOW'].map((col) => (
                <button key={col} className={`color ${col.toLowerCase()}`} onClick={() => chooseColor(col)}>
                  {col.charAt(0) + col.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowColorPicker(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showDrawModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h4>Drawn card</h4>
            {drawnCard && <Card card={drawnCard} />}
            <p>Would you like to play this card or skip your turn?</p>
            <div className="modal-actions">
              <button onClick={playDrawnCard} disabled={!drawnPlayable}>
                Play
              </button>
              <button onClick={skipDrawnCard}>Skip</button>
            </div>
          </div>
        </div>
      )}

      {isFinished && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Game Over</h3>
            <p>{winnerName ? `${winnerName} reached 500 points and wins!` : 'We have a winner!'}</p>
            <div className="modal-actions">
              <button onClick={() => navigate('/')}>Return to Lobby</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Game
