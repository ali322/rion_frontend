import { defineStore } from 'pinia'


export default defineStore('user', {
  state:(): Record<string, any> => {
    return {
      id: '',
      username: '',
      isLogin: false
    }
  }
})