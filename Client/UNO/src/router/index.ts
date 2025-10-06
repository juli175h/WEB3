import { createRouter, createWebHistory } from 'vue-router'
import Lobby from '../Views/Lobby.vue'
import Game from '@/Views/Game.vue'
import Pending from '@/Views/Pending.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [{
      path: '/',
      name: 'lobby',
      component: Lobby,
    },  {
      path: '/game/:id',
      name: 'game',
      component: Game,
    }, {
      path: '/pending/:id',
      name: 'pending',
      component: Pending,
    },
  ],
})

export default router