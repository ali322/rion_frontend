<template>
  <div class="pl-10">
    <div class="flex items-center px-4">
      <h5 class="text-lg flex-1 flex justify-center text-gray-600 py-4">
        <div>
          当前房间<span class="ml-4 badge">{{ roomID }}</span>
        </div>
        <div class="pl-4">
          当前节点<span class="ml-4 badge">{{ nodeID }}</span>
        </div>
      </h5>
    </div>
    <div>
      <div class="px-2 flex">
        <div class="w-72">
          <div class="flex items-center justify-between">
            <div class="pl-2 leading-10">本地媒体</div>
            <label
              for="local-media-record"
              class="btn btn-xs btn-outline text-sm"
              >录制记录</label
            >
          </div>
          <video
            class="h-40 m-0 rounded-xl shadow-xl"
            autoplay
            ref="localRef"></video>
          <div class="flex items-center justify-center">
            <div class="form-control">
              <label class="label cursor-pointer">
                <span class="label-text pr-2 text-xs">视频</span>
                <input
                  type="checkbox"
                  class="toggle toggle-sm"
                  v-model="isVideoEnabled" />
              </label>
            </div>
            <div class="form-control">
              <label class="label cursor-pointer">
                <span class="label-text pr-2 text-xs">音频</span>
                <input
                  type="checkbox"
                  class="toggle toggle-sm"
                  v-model="isAudioEnabled" />
              </label>
            </div>
          </div>
          <div class="flex items-center justify-center">
            <button class="btn btn-sm btn-secondary text-sm" @click="startMeet">
              发布
            </button>
            <button
              class="btn btn-sm btn-primary text-sm ml-4"
              @click="recordMedia"
              :class="{ 'btn-accent': isMediaRecord }">
              {{ isMediaRecord ? '停止' : '录制' }}
            </button>
          </div>
        </div>
        <div class="w-72 pl-4">
          <div class="flex items-center justify-between">
            <div class="pl-2 leading-10">本地屏幕</div>
            <label
              for="local-screen-record"
              class="btn btn-xs btn-outline text-sm"
              >录制记录</label
            >
          </div>
          <video
            class="h-40 m-0 rounded-xl shadow-xl"
            autoplay
            ref="screenRef"></video>
          <div class="flex items-center justify-center">
            <div class="form-control">
              <label class="label cursor-pointer">
                <span class="label-text pr-2 text-xs">视频</span>
                <input
                  type="checkbox"
                  class="toggle toggle-sm"
                  v-model="isScreenVideoEnabled" />
              </label>
            </div>
          </div>
          <div class="flex items-center justify-center">
            <label
              for="my-modal"
              class="btn btn-sm text-sm ml-4"
              @click="startScreen"
              >投屏</label
            >
            <button
              class="btn btn-sm btn-primary text-sm ml-4"
              @click="recordScreen"
              :class="{ 'btn-accent': isScreenRecord }">
              {{ isScreenRecord ? '停止' : '录制' }}
            </button>
          </div>
        </div>
        <div class="flex-1 flex">
          <div class="pl-4 flex flex-col">
            <p class="pl-2 leading-10">消息</p>
            <div class="h-60 overflow-y-auto bg-slate-100 rounded-xl mb-4">
              <div class="px-4 pt-2" v-for="(v, i) in incomeMsg" :key="i">
                <div v-if="v.node" class="text-left">
                  <span class="badge badge-secondary">{{ v.node }}</span>
                  <span class="pl-2">{{ v.data }}</span>
                </div>
                <div class="text-right" v-else>
                  <span class="pr-2">{{ v.data }}</span>
                  <span class="badge badge-primary">Me</span>
                </div>
              </div>
            </div>
            <div class="form-control">
              <div class="input-group input-group-sm">
                <input
                  type="text"
                  placeholder="广播消息"
                  class="input input-sm input-bordered"
                  v-model="broadcastMsg" />
                <span class="cursor-pointer" @click="broadcast">发送</span>
              </div>
            </div>
          </div>
          <div class="pl-4 flex flex-col">
            <p class="pl-2 leading-10">数据频道</p>
            <div class="h-60 overflow-y-auto bg-slate-100 rounded-xl mb-4">
              <div class="px-4 pt-2" v-for="(v, i) in incomeData" :key="i">
                <div v-if="v.node" class="text-left">
                  <span class="badge badge-secondary">{{ v.node }}</span>
                  <span class="pl-2">{{ v.data }}</span>
                </div>
                <div class="text-right" v-else>
                  <span class="pr-2">{{ v.data }}</span>
                  <span class="badge badge-primary">Me</span>
                </div>
              </div>
            </div>
            <div class="form-control">
              <div class="input-group input-group-sm">
                <input
                  type="text"
                  placeholder="数据频道消息"
                  class="input input-sm input-bordered"
                  v-model="datachannelMsg" />
                <span class="cursor-pointer" @click="sendDataChannel"
                  >发送</span
                >
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="divider"></div>
      <div class="px-2 pb-4">
        <div class="grid grid-cols-4 gap-4" ref="remoteRef">
          <div v-for="(n, i) in subStreams" :key="i">
            <RemoteStream :id="i" :streams="n" />
          </div>
        </div>
      </div>
    </div>
    <div>
      <input type="checkbox" id="local-media-record" class="modal-toggle" />
      <label for="local-media-record" class="modal cursor-pointer">
        <label class="modal-box relative" for="">
          <h3 class="text-lg font-bold">本地媒体录制记录</h3>
          <div class="px-4" v-for="(v, i) in mediaRecords" :key="i">
            <div class="text-left">
              <span class="badge badge-secondary text-xs">{{
                v.filename.join(',')
              }}</span>
              <p class="pl-2 text-xs">开始录制: {{ v.startedAt }}</p>
              <p class="pl-2 text-xs">结束录制: {{ v.finishedAt }}</p>
            </div>
          </div>
        </label>
      </label>
    </div>
    <div>
      <input type="checkbox" id="local-screen-record" class="modal-toggle" />
      <label for="local-screen-record" class="modal cursor-pointer">
        <label class="modal-box relative" for="">
          <h3 class="text-lg font-bold">本地屏幕录制记录</h3>
          <div class="px-4" v-for="(v, i) in mediaRecords" :key="i">
            <div class="text-left">
              <span class="badge badge-secondary text-xs">{{
                v.filename
              }}</span>
              <p class="pl-2 text-xs">开始录制: {{ v.startedAt }}</p>
              <p class="pl-2 text-xs">结束录制: {{ v.finishedAt }}</p>
            </div>
          </div>
        </label>
      </label>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { ref, Ref, onUnmounted, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import RemoteStream from '@/modules/RemoteStream.vue'
import { LocalStream } from '@/sdk/stream'
import { Client } from '@/sdk/client'
import { Trasport } from '@/sdk/transport'
import { baseURL } from '@/config/'

const route = useRoute()
let roomID = route.query.id!.toString()
let nodeID = route.query.node!.toString()
const localRef = ref()
const screenRef = ref()
const isScreenVideoEnabled = ref(true)
const remoteRef = ref()
const isVideoEnabled = ref(true)
const isAudioEnabled = ref(true)
const isRecord = ref(false)

const broadcastMsg = ref('')
const incomeMsg: Ref<Array<Record<string, string>>> = ref([])
const datachannelMsg = ref('')
const incomeData: Ref<Array<Record<string, string>>> = ref([])

const isMediaRecord = ref(false)
const mediaRecords: Ref<Array<Record<string, any>>> = ref([])
const isScreenRecord = ref(false)
const screenRecords: Ref<Array<Record<string, any>>> = ref([])

interface subStream {
  stream: MediaStream
  track: MediaStreamTrack
  id: string
  full_id: string
  app: string
  event: RTCTrackEvent
}

const subStreams: Ref<Record<string, Array<subStream>>> = ref({})

let pubMeet: Client
let pubScreen: Client

let settings = {
  room: roomID,
  id: nodeID,
  token: '',
  url: 'http://localhost:2008/api/v1',
  constraints: null,
  debug: true,
}

const sendDataChannel = () => {}
const broadcast = () => {}
const recordMedia = () => {}
const recordScreen = () => {}

let localMedia: LocalStream
watch(isVideoEnabled, (isChecked: boolean) => {
  if (isChecked) {
    localMedia?.unmute('video')
  } else {
    localMedia?.mute('video')
  }
})
watch(isAudioEnabled, (isChecked: boolean) => {
  if (isChecked) {
    localMedia?.unmute('audio')
  } else {
    localMedia?.mute('audio')
  }
})

const startMeet = async () => {
  const media = await LocalStream.getUserMedia({
    resolution: 'hd',
    // @ts-ignore
    codec: 'vp8',
    audio: true,
  })
  localMedia = media
  localRef.value.srcObject = media
  localRef.value.autoplay = true
  localRef.value.controls = true
  localRef.value.id = media.id
  localRef.value.muted = true
  console.log('localmedia', media.id)
  pubMeet = createPub(settings)
  pubMeet.publish(media)
}
let localScreen: LocalStream
watch(isScreenVideoEnabled, (isChecked: boolean) => {
  if (isChecked) {
    localScreen?.unmute('video')
  } else {
    localScreen?.mute('video')
  }
})
const startScreen = async () => {
  const media = await LocalStream.getDisplayMedia({
    // @ts-ignore
    resolution: 'hd',
    codec: 'vp8',
    // audio: true,
  })
  console.log('localScreen', media.id)
  localScreen = media
  screenRef.value.srcObject = media
  screenRef.value.autoplay = true
  screenRef.value.controls = true
  screenRef.value.id = media.id
  screenRef.value.muted = true
  media.getTracks().forEach((t: MediaStreamTrack) => {
    t.onended = function () {
      console.log(`${t.kind} of media stream has ended`)
    }
    // signalLocal?.call("publishTrack", {
    //   id: t.id,
    //   nodeID,
    //   streamID: media.id,
    //   kind: t.kind,
    //   flag: "123",
    // });
  })
  // settings.id += '-screen'
  pubScreen = createPub(Object.assign({}, settings, { id: `${nodeID}-screen` }))
  pubScreen.publish(media)
}

function createSub({ url, room, id, token, debug, constraints }) {
  let client = new Client({
    url,
    role: 'sub',
    room,
    id,
    token,
    debug,
  })
  client.onSubStream = (
    stream: MediaStream,
    track: MediaStreamTrack,
    id: string,
    full_id: string,
    app: string,
    event: RTCTrackEvent,
  ) => {
    console.log('on sub stream', stream, track, id, full_id)
    if (subStreams[full_id]) {
      subStreams.value[full_id].push({ stream, track, id, full_id, app, event })
    } else {
      subStreams.value[full_id] = [{ stream, track, id, full_id, app, event }]
    }
    console.log('sub streams', subStreams)
    // subStreams.value.push({ stream, track, id, full_id, app, event })
    // bindStream(id, track, stream)
  }
  client.onPubJoin = (id, full_id, app) => {
    let suffix = app == 'screen' ? "'s screen" : ''
    console.log(`============== Publisher ${id}${suffix} Joined.`)
    // nodes.value[msg.data.node] = { id: msg.data.node, streams: [] }
  }
  client.onPubLeft = (id, full_id, app) => {
    let suffix = app == 'screen' ? "'s screen" : ''
    console.log(`========= Publisher ${id}${suffix} Left.`)
    delete subStreams.value[full_id]
  }
  client.onError = (error) => {
    console.error('sub error', error)
  }
  client.subscribe()
  return client
}

function createPub(
  { url, room, id, token, debug, constraints },
  screen = false,
) {
  let client = new Client({
    url,
    room,
    role: 'pub',
    id,
    token,
    debug,
  })
  client.onPubStream = (stream, id, full_id, app) => {
    console.log('on pub stream', stream, id, full_id)
  }
  client.onError = (error) => {
    console.error('pub error', error)
  }
  // client.publish(constraints)
  return client
}

onMounted(async () => {
  createSub(settings)
  // settings.constraints = { audio: true, video: true }
  // pubMeet = createPub(settings)
})
</script>
