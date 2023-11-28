import { LocalStream } from './stream'

export interface Configuration {
  url: string
  room: string
  id: string
  role: 'pub' | 'sub'
  token?: string
  debug: boolean
  rtc?: RTCConfiguration
}

export class Trasport {
  pc: RTCPeerConnection
  dc: RTCDataChannel
  url: string
  role: string
  room: string
  id: string
  full_id: string
  token: string
  timestamp: any
  debug: boolean
  onError: (reason: any) => any
  onPubJoin: Function
  onPubLeft: Function
  onPubStream: Function
  onSubStream: Function
  constructor({ url, room, id, token, debug, rtc }: Configuration) {
    this.url = url
    this.role = 'pub'
    this.room = room
    this.id = id
    this.full_id = null
    this.token = token
    // callback for publisher
    this.onPubStream = null // published (outgoing) stream, for local display
    // callback for subscriber
    this.onSubStream = null // subscribed (incoming) stream
    this.onPubLeft = null // callback publisher left
    this.onPubJoin = null // callback publisher join
    // callback for error
    this.onError = null // callback for whatever error
    // timestamp for we started
    this.timestamp = null
    // flag to control debug logs
    // we can control debug logs by connection
    this.debug = debug
    this.init({ rtc })
  }

  init({ rtc }: { rtc?: RTCConfiguration }) {
    this.pc = new RTCPeerConnection(rtc)
    this.dc = this.pc.createDataChannel('control')
    let client = this
    let pc = this.pc
    let dc = this.dc

    pc.onconnectionstatechange = (_) => {
      console.log('Connection State:' + pc.connectionState)
    }
    // pc.onicegatheringstatechange = (e) => {
    //   let connection = e.target
    //   // @ts-ignore-next-line
    //   console.log('ICE Gathering State:' + connection.iceGatheringState)
    // }
    // pc.onnegotiationneeded = (_) => {
    //   console.log('Negotiation Needed')
    // }
    // pc.onsignalingstatechange = (_) => {
    //   console.log('Signaling State:' + pc.signalingState)
    // }
    // ICE connection state change callback
    pc.oniceconnectionstatechange = (_) => {
      console.log('ICE Connection State:' + pc.iceConnectionState)
      // show final selected ICE candidate on website
      if (pc.iceConnectionState == 'connected') {
        // time profiling
        let now = performance.now()
        let duration = now - client.timestamp
        console.log(
          `from createOffer() to connected: ${duration} ms (${client.timestamp} -> ${now})`
        )
        pc.getStats().then((s) => {
          s.forEach((o) => {
            if (o.state == 'succeeded') {
              console.log(
                'Local ICE: ' + JSON.stringify(s.get(o.localCandidateId))
              )
              console.log(
                'Remote ICE: ' + JSON.stringify(s.get(o.remoteCandidateId))
              )
            }
          })
        })
      }
    }

    // trickle ICE candidate calllback
    pc.onicecandidate = function (event) {
      if (event.candidate) {
        console.log('trickle ICE: ' + JSON.stringify(event.candidate))
      }
      // @ts-ignore-next-line
      if (event.target.iceGatheringState === 'complete') {
        let now = performance.now()
        let duration = now - client.timestamp
        console.log(
          `from createOffer() to full ICE collected: ${duration} ms (${client.timestamp} -> ${now})`
        )
        // all ICE candidates have been collected
        let offer = pc.localDescription
        // use a trailing random id to avoid duplication from same publisher
        client.full_id = client.id + '+' + (+new Date()).toString(36)

        client.sendSDPOffer(offer)
      }
    }
    dc.onclose = () => console.log('DataChannel has closed')
    dc.onopen = () => console.log('DataChannel has opened')
    dc.onmessage = this.onDataMessage.bind(this)
  }

  async onDataMessage(e: MessageEvent) {
    console.log(
      `Message from DataChannel "${this.dc.label}" payload "${e.data}"`
    )
    if (this.dc.label != 'control') {
      return
    }
    if (this.role == Role.Subscriber) {
      if (e.data.startsWith('SDP_OFFER ') == true) {
        console.log('set remote SDP offer again')
        let offer = e.data.slice(10)
        // log('remote SDP Offer:' + offer)
        await this.pc.setRemoteDescription(
          new RTCSessionDescription({ type: 'offer', sdp: offer })
        )
        const answer = await this.pc.createAnswer()
        await this.pc.setLocalDescription(answer)
        this.dc.send('SDP_ANSWER ' + answer.sdp)
      } else if (e.data.startsWith('PUB_JOIN ') == true) {
        const words = e.data.split(' ')
        let full_id = words[1]
        let id = full_id.split('+')[0]
        let app = id.endsWith('-screen') ? 'screen' : 'default'
        id = id.replace('-screen', '')
        if (this.onPubJoin) {
          this.onPubJoin(id, full_id, app)
        }
      } else if (e.data.startsWith('PUB_LEFT ') == true) {
        const words = e.data.split(' ')
        let full_id = words[1]
        let id = full_id.split('+')[0]
        let app = id.endsWith('-screen') ? 'screen' : 'default'
        id = id.replace('-screen', '')
        if (this.onPubLeft) {
          this.onPubLeft(id, full_id, app)
        }
      }
    }
  }

  // Ref: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
  async publish(
    stream: LocalStream,
    encodingParams?: RTCRtpEncodingParameters[]
  ) {
    let client = this
    // stream.publish(client.pc, encodingParams)
    stream.getTracks().forEach((track) => client.pc.addTrack(track, stream))
    if (client.onPubStream) {
      client.onPubStream(stream)
    }
    // time profiling
    client.timestamp = performance.now()
    const offer = await client.pc.createOffer()
    await client.pc.setLocalDescription(offer)
  }

  // screen share
  // publish_screen(constraints) {
  //   let log = (msg) => this._log(msg)
  //   let _catch = this.onError
  //   let client = this
  //   client.id = client.id + '-screen'
  //   client.role = ClientRole.Publisher
  //   navigator.mediaDevices
  //     .getDisplayMedia(constraints)
  //     .then((stream) => {
  //       stream.getTracks().forEach((track) => client.pc.addTrack(track, stream))

  //       if (client.onPubStream) {
  //         client.onPubStream(stream)
  //       }

  //       // time profiling
  //       client.timestamp = performance.now()

  //       client.pc
  //         .createOffer()
  //         .then((offer) => {
  //           // log('local SDP Offer:' + offer.sdp)
  //           // set local SDP offer
  //           // this will trigger ICE gathering, and then onicecandidate callback
  //           client.pc.setLocalDescription(offer).catch(_catch)
  //         })
  //         .catch(_catch)
  //     })
  //     .catch(_catch)
  // }

  async subscribe() {
    // subscriber-only callback
    // new media track callback
    // we will also get user id from the stream id (embedded in SDP by design)
    this.pc.ontrack = (event) => {
      console.log('============ on track', event)
      if (event.streams == null) {
        return
      }
      let full_id = event.streams[0].id
      // quick hack for hidden hardcode video stream that does not present
      if (full_id.startsWith('{')) {
        return
      }
      console.log(`add track ${full_id} ${event.track.id}`)
      let id = full_id.split('+')[0]
      let app = id.endsWith('-screen') ? 'screen' : 'default'
      id = id.replace('-screen', '')
      if (this.onSubStream) {
        this.onSubStream(event.streams[0], id, full_id, app, event)
      }
    }

    // time profiling
    this.timestamp = performance.now()
    const offer = await this.pc.createOffer()
    await this.pc.setLocalDescription(offer)
  }

  close() {
    console.log('closing')
    if (this.dc) {
      this.dc.send('STOP')
    }
    if (this.pc) {
      this.pc.close()
    }
  }

  async join() {
    let offer = await this.pc.createOffer()
    await this.pc.setLocalDescription(offer)
  }

  async sendSDPOffer(offer: RTCSessionDescription | null) {
    let pc = this.pc
    let url = `${this.url}/room/${this.role}?room=${this.room}&id=${this.full_id}`
    let resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/sdp',
        Authorization: `Bearer ${this.token}`,
      },
      body: offer?.sdp,
    }).then((res) => res.json())
    if (resp.data.sdp == 'bad token') {
      console.error('bad token')
      return
    }
    await pc.setRemoteDescription(
      new RTCSessionDescription({ type: 'answer', sdp: resp.data.sdp })
    )
  }
}

const Role = {
  Publisher: 'pub',
  Subscriber: 'sub',
}
