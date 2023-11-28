<script setup lang="ts">
import { RouterView } from 'vue-router';
import Toaster from '@/components/ui/toast/Toaster.vue'
import useUserStore from '@/store/user'
import { genUUID } from '@/util/index'

const userStore = useUserStore()

const doLogin = () => {
  const id = genUUID()
  userStore.$patch({
    // @ts-ignore
    id,
    username: 'guest',
    isLogin: true
  })
}

const doLogout = () => {
  userStore.$reset()
}
</script>

<template>
    <div class="navbar bg-gray-800 text-white">
    <div class="flex-1">
      <span class="btn btn-ghost normal-case text-xl">Wion App</span>
    </div>
    <div class="flex-none">
      <ul class="menu menu-horizontal p-0">
        <li v-if="userStore.isLogin"><span>hi, {{ userStore.id }}</span></li>
        <li><RouterLink to="/">Home</RouterLink></li>
        <li v-if="!userStore.isLogin"><span @click="doLogin">Login</span></li>
        <li v-else><span @click="doLogout">Logout</span></li>
      </ul>
    </div>
  </div>
  <div class="content px-4">
    <RouterView/>
  </div>
  <Toaster />
</template>

