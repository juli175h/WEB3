<script setup lang="ts">
import { computed } from 'vue'
import type { Card } from "Domain/src/model/UnoCard.js"

const props = defineProps<{
  card: Card
  clickable?: boolean
}>()

// Compute the CSS class for the correct image
const cardClass = computed(() => {
  const { card } = props

  // Wild cards
  if (card.type === "WILD") return "wildchange"
  if (card.type === "WILD DRAW") return "wilddraw"

  const color = card.color?.toLowerCase()
  if (!color) return ""

  // Numbered cards
  if (card.type === "NUMBERED") return `${color}${card.value}`

  // Action cards
  switch (card.type) {
    case "DRAW":
      return `${color}draw`
    case "SKIP":
      return `${color}skip`
    case "REVERSE":
      return `${color}reverse`
    default:
      return ""
  }
})

const cardImage = computed(() => {
  const { card } = props
  if (card.type === "WILD") return new URL("@/assets/Cards/uno_card-wildchange.png", import.meta.url).href
  if (card.type === "WILD DRAW") return new URL("@/assets/Cards/uno_card-wilddraw4.png", import.meta.url).href

  const color = card.color?.toLowerCase()
  if (!color) return ""

  if (card.type === "NUMBERED") return new URL(`@/assets/Cards/uno_card-${color}${card.value}.png`, import.meta.url).href
  if (card.type === "DRAW") return new URL(`@/assets/Cards/uno_card-${color}draw2.png`, import.meta.url).href
  if (card.type === "SKIP") return new URL(`@/assets/Cards/uno_card-${color}skip.png`, import.meta.url).href
  if (card.type === "REVERSE") return new URL(`@/assets/Cards/uno_card-${color}reverse.png`, import.meta.url).href
  return ""
})
</script>

<template>
  <div class="card">
    <img :src="cardImage" alt="UNO card" />
  </div>
</template>

<style>
.card img {
  width: 80px;
  height: 120px;
  margin: 0.2rem;
}
.uno-card {
  width: 80px;
  height: 120px;
  margin: 4px;
  border-radius: 8px;
  background-size: contain;
  background-repeat: no-repeat;
}
.clickable:hover {
  transform: scale(1.08);
  cursor: pointer;
}
.red0 {
    content: url(@/assets/Cards/uno_card-red0.png)
}

.red1 {
    content: url(@/assets/Cards/uno_card-red1.png)
}

.red2 {
    content: url(@/assets/Cards/uno_card-red2.png)
}

.red3 {
    content: url(@/assets/Cards/uno_card-red3.png)
}

.red4 {
    content: url(@/assets/Cards/uno_card-red4.png)
}

.red5 {
    content: url(@/assets/Cards/uno_card-red5.png)
}

.red6 {
    content: url(@/assets/Cards/uno_card-red6.png)
}

.red7 {
    content: url(@/assets/Cards/uno_card-red7.png)
}

.red8 {
    content: url(@/assets/Cards/uno_card-red8.png)
}

.red9 {
    content: url(@/assets/Cards/uno_card-red9.png)
}

.yel0 {
    content: url(@/assets/Cards/uno_card-yellow0.png)
}

.yel1 {
    content: url(@/assets/Cards/uno_card-yellow1.png)
}

.yel2 {
    content: url(@/assets/Cards/uno_card-yellow2.png)
}

.yel3 {
    content: url(@/assets/Cards/uno_card-yellow3.png)
}

.yel4 {
    content: url(@/assets/Cards/uno_card-yellow4.png)
}

.yel5 {
    content: url(@/assets/Cards/uno_card-yellow5.png)
}

.yel6 {
    content: url(@/assets/Cards/uno_card-yellow6.png)
}

.yel7 {
    content: url(@/assets/Cards/uno_card-yellow7.png)
}

.yel8 {
    content: url(@/assets/Cards/uno_card-yellow8.png)
}

.yel9 {
    content: url(@/assets/Cards/uno_card-yellow9.png)
}

.green0 {
    content: url(@/assets/Cards/uno_card-green0.png)
}

.green1 {
    content: url(@/assets/Cards/uno_card-green1.png)
}

.green2 {
    content: url(@/assets/Cards/uno_card-green2.png)
}

.green3 {
    content: url(@/assets/Cards/uno_card-green3.png)
}

.green4 {
    content: url(@/assets/Cards/uno_card-green4.png)
}

.green5 {
    content: url(@/assets/Cards/uno_card-green5.png)
}

.green6 {
    content: url(@/assets/Cards/uno_card-green6.png)
}

.green7 {
    content: url(@/assets/Cards/uno_card-green7.png)
}

.green8 {
    content: url(@/assets/Cards/uno_card-green8.png)
}

.green9 {
    content: url(@/assets/Cards/uno_card-green9.png)
}

.blue0 {
    content: url(@/assets/Cards/uno_card-blue0.png)
}

.blue1 {
    content: url(@/assets/Cards/uno_card-blue1.png)
}

.blue2 {
    content: url(@/assets/Cards/uno_card-blue2.png)
}

.blue3 {
    content: url(@/assets/Cards/uno_card-blue3.png)
}

.blue4 {
    content: url(@/assets/Cards/uno_card-blue4.png)
}

.blue5 {
    content: url(@/assets/Cards/uno_card-blue5.png)
}

.blue6 {
    content: url(@/assets/Cards/uno_card-blue6.png)
}

.blue7 {
    content: url(@/assets/Cards/uno_card-blue7.png)
}

.blue8 {
    content: url(@/assets/Cards/uno_card-blue8.png)
}

.blue9 {
    content: url(@/assets/Cards/uno_card-blue9.png)
}


.reddraw {
    content: url(@/assets/Cards/uno_card-reddraw2.png)
}

.redreverse{
    content: url(@/assets/Cards/uno_card-redreverse.png)
}

.redskip{
    content: url(@/assets/Cards/uno_card-redskip.png)
}

.yeldraw {
    content: url(@/assets/Cards/uno_card-yellowdraw2.png)
}

.yelreverse{
    content: url(@/assets/Cards/uno_card-yellowreverse.png)
}

.yelskip{
    content: url(@/assets/Cards/uno_card-yellowskip.png)
}

.greendraw {
    content: url(@/assets/Cards/uno_card-greendraw2.png)
}

.greenreverse{
    content: url(@/assets/Cards/uno_card-greenreverse.png)
}

.greenskip{
    content: url(@/assets/Cards/uno_card-greenskip.png)
}

.bluedraw {
    content: url(@/assets/Cards/uno_card-bluedraw2.png)
}

.bluereverse{
    content: url(@/assets/Cards/uno_card-bluereverse.png)
}

.blueskip{
    content: url(@/assets/Cards/uno_card-blueskip.png)
}


.wildchange{
    content: url(@/assets/Cards/uno_card-wildchange.png)
}

.wilddraw{
    content: url(@/assets/Cards/uno_card-wilddraw4.png)
}
</style>