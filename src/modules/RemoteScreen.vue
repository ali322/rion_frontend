<template>
  <div class="flex">
    <div v-if="streams.length === 0">
      <p class="flex-1 text-center">暂无媒体</p>
      <video class="rounded-xl shadow-xl w-96 h-56" />
    </div>
    <div v-for="(s, i) in props.streams" :key="i" class="px-4 pb-2">
      <div class="flex pb-2">
        <p class="flex-1">{{s.id}}</p>
        <button class="btn btn-xs btn-accent btn-outline text-sm" @click="stop(s.id)">关闭</button>
      </div>
      <video :id="s.id" class="rounded-xl shadow-xl h-40"></video>
    </div>
  </div>
  <p class="leding-10 pt-4 flex">
  <div class="">节点<span class="badge ml-2">{{ props.id }}</span></div>
  <div class="flex-1 flex justify-end">
    <div v-if="props.stats" v-for="(s, i) in props.stats" :key="i" class="tooltip tooltip-top"
      :data-tip="`${s[0]}kbps ${s[1]}fps`">
      <button class="btn btn-xs btn-outline text-sm mr-2">info</button>
    </div>
    <button class="btn btn-xs btn-outline text-sm" @click="switchStream">切换</button>
    <label :for="`screencast-modal-${props.id}`" class="btn btn-xs btn-outline text-sm ml-2">投屏</label>
    <button class="btn btn-xs btn-accent ml-2" @click="close">断开</button>
  </div>
  </p>
  <input type="checkbox" :id="`screencast-modal-${props.id}`" class="modal-toggle" />
  <div class="modal">
    <div class="modal-box w-1/4">
      <div class="form-control">
        <div class="input-group input-group-sm">
          <input type="text" placeholder="投屏地址" class="input input-sm input-bordered w-full" v-model="url" />
        </div>
      </div>
      <div class="modal-action">
        <label :for="`screencast-modal-${props.id}`" class="btn btn-sm" @click="start">开始</label>
        <label :for="`screencast-modal-${props.id}`" class="btn btn-sm">取消</label>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { ref, Ref, computed } from 'vue'

const props = defineProps<{
  streams: Array<Record<string, any>>,
  stats?: Record<string, Array<number>>,
  id: string
}>()

const emits = defineEmits<{
  (evt: 'switch', stream: Record<string, any>): void
  (evt: 'start', uid: string, url: string): void
  (evt: 'stop', uid: string, streamID: string): void
  (evt: 'close', uid: string): void
}>()

const selected = ref(0)
const url = ref('')
const switchStream = () => {
  if (selected.value === props.streams.length - 1) {
    selected.value = 0
    emits('switch', props.streams[0])
  } else {
    selected.value = selected.value + 1
    emits('switch', props.streams[selected.value])
  }
}
const start = () => {
  emits('start', props.id.replace('screencast-', ''), url.value)
}
const stop = (streamID: string) => {
  emits('stop', props.id.replace('screencast-', ''), streamID)
}
const close = () => {
  emits('close', props.id)
}
</script>