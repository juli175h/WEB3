import {
    initializeGame,
    drawCard,
    playCard,
    nextPlayer,
    currentPlayer,
    discardPile,
    drawPile,
    chooseColor
} from "../../../../Domain/src/model/Game.ts"
import { Player } from "../../../../Domain/src/model/Player.ts"
import type { Card } from "../../../../Domain/src/model/UnoCard.ts"

export function useUnoGame() {
    // reactive game state for Vue
    const game = reactive({
        instance: new Game(),
        players: [] as Player[],
        currentPlayer: null as Player | null,
        discardPileTop: null as Card | null
    })
    function startGame(playerNames: string[]) {
        const players = playerNames.map((name, i) => new Player(i, name))
        game.instance.initialize(players)
        game.players = players
        game.currentPlayer = game.instance.currentPlayer()
        game.discardPileTop = game.instance.discardPile.top() || null
    }

    // play a card
    function play(player: Player, card: Card) {
        game.instance.playCard(player, card)
        game.currentPlayer = game.instance.currentPlayer()
        game.discardPileTop = game.instance.discardPile.top() || null
    }

    // draw a card
    function draw(player: Player) {
        game.instance.drawCard(player)
    }

    // move to next turn
    function nextTurn() {
        game.instance.nextPlayer()
        game.currentPlayer = game.instance.currentPlayer()
    }

    return { game, startGame, play, draw, nextTurn }
}