<template>
  <div class="container">
    <div class="px-6 py-4">
      <button class="btn" @click="createRoom">创建房间</button>
    </div>
    <h5 class="py-10 px-12 text-gray-600 text-lg">多人会议</h5>
    <div class="grid grid-cols-5 gap-4 px-8">
      <div
        v-for="r in rooms"
        class="px-4 py-10 bg-gray-200 rounded-lg shadow-md">
        <p class="text-center text-gray-500 text-sm leading-10 overflow-ellipsis">{{ r }}</p>
        <div class="flex justify-center">
          <button class="btn btn-sm btn-secondary" @click="joinRoom(r)">进入</button>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
  import { onMounted, ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { storeToRefs } from 'pinia'
  import { useFetch } from '@vueuse/core'
  import { useToast } from '@/components/ui/toast/use-toast'
  import { baseURL } from '@/config/index'
  import useUserStore from '@/store/user'

  const userStore = useUserStore()

  const { toast } = useToast()
  const { id: userID, isLogin } = storeToRefs(userStore)

  const rooms = ref<Array<String>>([])
  const router = useRouter()
  const createRoom = async () => {
    // if (!isLogin.value) {
    //   toast({
    //     description: '请先登录',
    //   })
    //   return
    // }
    const { data, error } = await useFetch(`${baseURL}/room`).post({domain: 'default'}).json()
    if (error.value == null) {
      console.log('create data', data)
      rooms.value = rooms.value.concat([data.value.data])
    }
  }
  const joinRoom = (id: string) => {
    if (!isLogin.value) {
      toast({
        description: '请先登录',
      })
      return
    }
    router.push(`/meeting?id=${id}&node=${userID.value}`)
  }
  onMounted(async () => {
    const {data, error } = await useFetch(`${baseURL}/room?domain=default`).json()
    if (error.value == null) {
      rooms.value = data.value.data
    }
  })
</script>
