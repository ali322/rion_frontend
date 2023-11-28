<template>
  <div class="relative">
    <video class="rounded-xl shadow-xl h-40" v-if="streams.length === 0" />
    <video v-for="(s ,i) in props.streams" :key="i" :id="s.id" class="rounded-xl shadow-xl" 
    :class="{'absolute bottom-0 right-0 w-20': i != selected, 'w-full h-full': i==selected}">
    </video>
  </div>
  <p class="leding-10 pt-4 flex">
    <div class="">节点<span class="badge ml-2">{{ props.id }}</span></div>
    <div class="flex-1 flex justify-end">
      <div v-if="props.stats" v-for="(s ,i) in props.stats" :key="i" class="tooltip tooltip-top" :data-tip="`${s[0]}kbps ${s[1]}fps`">
        <button class="btn btn-xs btn-outline text-sm mr-2">info</button>
      </div>
      <button class="btn btn-xs btn-outline text-sm" @click="switchStream">切换</button>
    </div>
  </p>
</template>
<script lang="ts" setup>
import { ref, computed } from 'vue'

const props = defineProps<{
  streams: Array<Record<string, any>>,
  stats?: Record<string, Array<number>>,
  id: string
}>()

const emits = defineEmits<{
  (evt: 'switch', stream: Record<string, any>): void
}>()

const selected = ref(0)
const switchStream = () => {
  if (selected.value === props.streams.length - 1) {
    selected.value = 0
    emits('switch', props.streams[0])
  } else {
    selected.value = selected.value + 1
    emits('switch', props.streams[selected.value])
  }
}
</script>