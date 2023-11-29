const Role = {
  Publisher: 'pub',
  Subscriber: 'sub',
}

export interface Configuration {
  url: string
  room: string
  id: string
  role: 'pub' | 'sub'
  token?: string
  debug: boolean
  rtc?: RTCConfiguration
}

export class Client {
  dc?: RTCDataChannel
  pc?: RTCPeerConnection
  url: string
  role: string
  room: string
  id: string
  full_id?: string
  token?: string
  debug: boolean = false
  onPubStream?: (stream: MediaStream) => void
  onSubStream?: (
    stream: MediaStream,
    track: MediaStreamTrack,
    id: string,
    full_id: string,
    app: string,
    event: RTCTrackEvent,
  ) => void
  onPubJoin?: (id: string, full_id: string, app: string) => void
  onPubLeft?: (id: string, full_id: string, app: string) => void
  onError: (msg: any) => void = (msg) => console.error(msg)
  timestamp: number = 0
  constructor({ url, room, id, token, debug, rtc }: Configuration) {
    this.url = url
    this.role = 'pub'
    this.room = room
    this.id = id
    this.token = token
    this.debug = debug
    this.init({ rtc })
  }

  _log(msg: any) {
    if (this.debug) {
      let log_prefix = 'rion:' + this.role + ':'
      console.log(log_prefix + msg)
    }
  }

  async init({ rtc }: { rtc?: RTCConfiguration }) {
    let log = (msg: any) => this._log(msg)
    let _catch = this.onError
    let client = this
    this.pc = new RTCPeerConnection(rtc)
    this.dc = this.pc.createDataChannel('control')
    let pc = this.pc
    let dc = this.dc

    pc.onconnectionstatechange = (e: Event) => {
      log('Connection State:' + pc.connectionState)
    }

    pc.onicegatheringstatechange = (e: Event) => {
      let connection = e.target
      // @ts-ignore-next-line
      log('ICE Gathering State:' + connection.iceGatheringState)
    }

    pc.onnegotiationneeded = (e) => {
      log('Negotiation Needed')
    }

    pc.onsignalingstatechange = (e: Event) => {
      log('Signaling State:' + pc.signalingState)
    }

    // ICE connection state change callback
    pc.oniceconnectionstatechange = (e: Event) => {
      log('ICE Connection State:' + pc.iceConnectionState)
      // show final selected ICE candidate on website
      if (pc.iceConnectionState == 'connected') {
        // time profiling
        let now = performance.now()
        let duration = now - client.timestamp
        log(
          `from createOffer() to connected: ${duration} ms (${client.timestamp} -> ${now})`,
        )
        pc.getStats().then((s) => {
          s.forEach((o) => {
            if (o.state == 'succeeded') {
              // log('Local ICE: ' + JSON.stringify(s.get(o.localCandidateId)))
              // log('Remote ICE: ' + JSON.stringify(s.get(o.remoteCandidateId)))
            }
          })
        })
      }
    }

    // trickle ICE candidate calllback
    pc.onicecandidate = function (event: RTCPeerConnectionIceEvent) {
      if (event.candidate) {
        // log('trickle ICE: ' + JSON.stringify(event.candidate))
      }
      // @ts-ignore-next-line
      if (event.target.iceGatheringState === 'complete') {
        let now = performance.now()
        let duration = now - client.timestamp
        log(
          `from createOffer() to full ICE collected: ${duration} ms (${client.timestamp} -> ${now})`,
        )
        // all ICE candidates have been collected
        let offer = pc.localDescription
        // log('full local SDP Offer:' + offer.sdp)
        // use a trailing random id to avoid duplication from same publisher
        client.full_id = client.id + '+' + (+new Date()).toString(36)

        client.sendSDPOffer(offer)
      }
    }
    dc.onclose = () => log('DataChannel has closed')
    dc.onopen = () => log('DataChannel has opened')
    dc.onmessage = async (e) => {
      // log(`Message from DataChannel "${dc.label}" payload "${e.data}"`)
      if (dc.label != 'control') {
        return
      }
      if (client.role == Role.Subscriber) {
        if (e.data.startsWith('SDP_OFFER ') == true) {
          log('set remote SDP offer again')
          let offer = e.data.slice(10)
          // log('remote SDP Offer:' + offer)
          try {
            await pc.setRemoteDescription(
              new RTCSessionDescription({ type: 'offer', sdp: offer }),
            )
            const answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)
            dc.send('SDP_ANSWER ' + answer.sdp)
          } catch (e) {
            _catch(e)
          }
        } else if (e.data.startsWith('PUB_JOIN ') == true) {
          const words = e.data.split(' ')
          let full_id = words[1]
          let id = full_id.split('+')[0]
          let app = id.endsWith('-screen') ? 'screen' : 'default'
          id = id.replace('-screen', '')
          if (client.onPubJoin) {
            client.onPubJoin(id, full_id, app)
          }
        } else if (e.data.startsWith('PUB_LEFT ') == true) {
          const words = e.data.split(' ')
          let full_id = words[1]
          let id = full_id.split('+')[0]
          let app = id.endsWith('-screen') ? 'screen' : 'default'
          id = id.replace('-screen', '')
          if (client.onPubLeft) {
            client.onPubLeft(id, full_id, app)
          }
        }
      }
    }
  }

  // Ref: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
  async publish(stream: MediaStream) {
    let log = (msg: any) => this._log(msg)
    let _catch = this.onError
    let client = this
    if (!client.pc) {
      log('publish failed because pc is null')
      return
    }
    client.role = Role.Publisher
    stream.getTracks().forEach((track) => client.pc?.addTrack(track, stream))

    if (client.onPubStream) {
      client.onPubStream(stream)
    }
    // time profiling
    client.timestamp = performance.now()
    try {
      const offer = await client.pc?.createOffer()
      await client.pc?.setLocalDescription(offer)
    } catch (e) {
      _catch(e)
    }
  }

  async subscribe() {
    let log = (msg: any) => this._log(msg)
    let _catch = this.onError
    let client = this
    client.role = Role.Subscriber
    if (!client.pc) {
      log('subscribe failed because pc is null')
      return
    }
    // subscriber-only callback
    // new media track callback
    // we will also get user id from the stream id (embedded in SDP by design)
    client.pc.ontrack = function (event: RTCTrackEvent) {
      if (event.streams == null) {
        return
      }
      let full_id = event.streams[0].id
      // quick hack for hidden hardcode video stream that does not present
      if (full_id.startsWith('{')) {
        return
      }
      log(`add track ${full_id} ${event.track.id}`)
      let id = full_id.split('+')[0]
      let app = id.endsWith('-screen') ? 'screen' : 'default'
      id = id.replace('-screen', '')
      if (client.onSubStream) {
        client.onSubStream(
          event.streams[0],
          event.track,
          id,
          full_id,
          app,
          event,
        )
      }
    }
    // time profiling
    client.timestamp = performance.now()
    try {
      const offer = await client.pc.createOffer()
      await client.pc.setLocalDescription(offer)
    } catch (e) {
      _catch(e)
    }
  }

  close() {
    this._log('closing')
    if (this.dc) {
      this.dc.send('STOP')
    }
    if (this.pc) {
      this.pc.close()
    }
  }

  async sendSDPOffer(offer: RTCSessionDescription) {
    let log = (msg: any) => this._log(msg)
    let _catch = this.onError
    let pc = this.pc
    if (!pc) {
      log('send sdp offer failed because pc is null')
      return
    }
    let _url = `${this.url}/${this.role}/${this.room}/${this.full_id}`
    log(`url ${_url}`)
    try {
      const resp = await fetch(_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/sdp',
          Authorization: `Bearer ${this.token}`,
        },
        body: offer.sdp,
      }).then((res) => res.json())
      if (resp.data.sdp == 'bad token') {
        _catch(new Error('bad token'))
        return
      }
      await pc.setRemoteDescription(
        new RTCSessionDescription({ type: 'answer', sdp: resp.data.sdp }),
      )
    } catch (e) {
      _catch(e)
    }
  }
}
