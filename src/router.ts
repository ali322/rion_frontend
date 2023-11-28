import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/routes/Home.vue'
import Meeting from '@/routes/Meeting.vue'

const routes = [
  {path: '/', component: Home },
  {path: '/meeting', component: Meeting },
]


export default createRouter({
  routes: routes,
  history: createWebHistory()
})