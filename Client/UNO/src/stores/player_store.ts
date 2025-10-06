import { defineStore } from 'pinia'
import { ref } from 'vue'

export const usePlayerStore = defineStore('user', () => {
  const player = ref<string|undefined>(undefined)
  return { player }
})