<template>
    <div class="relative">
        <video class="rounded-xl shadow-xl h-40" ref="videoRef" />
    </div>
    <p class="leding-10 pt-4 flex">
    <div class="">节点<span class="badge ml-2">{{ props.id }}</span></div>
    <div class="flex-1 flex justify-end">
        <div v-if="props.stats" v-for="(s, i) in props.stats" :key="i" class="tooltip tooltip-top"
            :data-tip="`${s[0]}kbps ${s[1]}fps`">
            <button class="btn btn-xs btn-outline text-sm mr-2">info</button>
        </div>
    </div>
    </p>
</template>
<script lang="ts" setup>
import { ref, onMounted } from 'vue'

const videoRef = ref()

const props = defineProps<{
    stats?: Record<string, Array<number>>,
    streams: Array<Record<string, any>>,
    id: string
}>()

onMounted(() => {
    videoRef.value.srcObject = props.streams[0].stream
    videoRef.value.autoplay = true
    videoRef.value.controls = true
    props.streams.forEach(({ track, stream }) => {
        track.onunmute = (evt) => {
            console.log('onunmute evt', evt)
            // el!.muted = false
            // el!.play()
        }
        track.onmute = (evt) => {
            console.log('onmute evt', evt)
            // el!.muted = true
            // el!.pause()
        }
        stream.onremovetrack = () => {
            try {
                // console.log('remove track', nodeID, id)
            } catch (err) { }
        }
    })
})
</script>