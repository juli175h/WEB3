import { createRouter, createWebHistory } from 'vue-router'
import Lobby from '@/Views/Lobby.vue'
import Pending from '@/Views/Pending.vue'
import Game from '@/Views/Game.vue'

const routes = [
    { path: '/', name: 'Lobby', component: Lobby },
    { path: '/pending/:id', name: 'Pending', component: Pending },
    { path: '/game/:id', name: 'Game', component: Game },
]

export default createRouter({
    history: createWebHistory(),
    routes,
})
