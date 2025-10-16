import { createRouter, createWebHistory } from 'vue-router'
import Lobby from '@/views/Lobby.vue'
import Pending from '@/views/Pending.vue'
import Game from '@/views/Game.vue'

const routes = [
    { path: '/', name: 'Lobby', component: Lobby },
    { path: '/pending', name: 'Pending', component: Pending },
    { path: '/game/:id', name: 'Game', component: Game },
]

export default createRouter({
    history: createWebHistory(),
    routes,
})
