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

  _log(msg) {
    if (this.debug) {
      let log_prefix = 'rion:' + this.role + ':'
      console.log(log_prefix + msg)
    }
  }

   async init({ rtc }: { rtc?: RTCConfiguration }) {
    let log = (msg) => this._log(msg)
    let _catch = this.onError
    let client = this
    this.pc = new RTCPeerConnection(rtc)
    this.dc = this.pc.createDataChannel('control')
    let pc = this.pc
    let dc = this.dc

    pc.onconnectionstatechange = (e) => {
      log('Connection State:' + pc.connectionState)
    }

    pc.onicegatheringstatechange = (e) => {
      let connection = e.target
      log('ICE Gathering State:' + connection.iceGatheringState)
    }

    pc.onnegotiationneeded = (e) => {
      log('Negotiation Needed')
    }

    pc.onsignalingstatechange = (e) => {
      log('Signaling State:' + pc.signalingState)
    }

    // ICE connection state change callback
    pc.oniceconnectionstatechange = (e) => {
      log('ICE Connection State:' + pc.iceConnectionState)

      // show final selected ICE candidate on website
      if (pc.iceConnectionState == 'connected') {
        // time profiling
        let now = performance.now()
        let duration = now - client.timestamp
        log(
          `from createOffer() to connected: ${duration} ms (${client.timestamp} -> ${now})`
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
    pc.onicecandidate = function (event) {
      if (event.candidate) {
        // log('trickle ICE: ' + JSON.stringify(event.candidate))
      }
      if (event.target.iceGatheringState === 'complete') {
        let now = performance.now()
        let duration = now - client.timestamp
        log(
          `from createOffer() to full ICE collected: ${duration} ms (${client.timestamp} -> ${now})`
        )

        // all ICE candidates have been collected
        let offer = pc.localDescription
        // log('full local SDP Offer:' + offer.sdp)

        // use a trailing random id to avoid duplication from same publisher
        client.full_id = client.id + '+' + (+new Date()).toString(36)

        client.sendSDPOffer(offer)
      }
    }

    pc.ontrack = (evt) => {
      console.log('on track ===========', evt)
    }

    dc.onclose = () => log('DataChannel has closed')
    dc.onopen = () => log('DataChannel has opened')
    dc.onmessage = (e) => {
      // log(`Message from DataChannel "${dc.label}" payload "${e.data}"`)

      if (dc.label != 'control') {
        return
      }

      if (client.role == Role.Subscriber) {
        if (e.data.startsWith('SDP_OFFER ') == true) {
          log('set remote SDP offer again')
          let offer = e.data.slice(10)
          // log('remote SDP Offer:' + offer)
          pc.setRemoteDescription(
            new RTCSessionDescription({ type: 'offer', sdp: offer })
          )
          pc.createAnswer()
            .then((answer) => {
              // log('local SDP Answer:' + answer.sdp)
              pc.setLocalDescription(answer)
              dc.send('SDP_ANSWER ' + answer.sdp)
            })
            .catch(_catch)
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
  publish(stream) {
    let log = (msg) => this._log(msg)
    let _catch = (msg) => console.error(msg)
    let client = this
    client.role = Role.Publisher
    stream.getTracks().forEach((track) => client.pc.addTrack(track, stream))

    if (client.onPubStream) {
      client.onPubStream(stream)
    }

    // time profiling
    client.timestamp = performance.now()

    client.pc
      .createOffer()
      .then((offer) => {
        // log('local SDP Offer:' + offer.sdp)
        // set local SDP offer
        // this will trigger ICE gathering, and then onicecandidate callback
        client.pc.setLocalDescription(offer).catch(_catch)
      })
      .catch(_catch)
  }

  subscribe() {
    let log = (msg) => this._log(msg)
    let _catch = this.onError
    let client = this
    client.role = Role.Subscriber

    // subscriber-only callback
    // new media track callback
    // we will also get user id from the stream id (embedded in SDP by design)
    client.pc.ontrack = function (event) {
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
        client.onSubStream(event.streams[0], id, full_id, app, event)
      }
    }

    // time profiling
    client.timestamp = performance.now()

    client.pc
      .createOffer()
      .then((offer) => {
        // log('local SDP Offer:' + offer.sdp)
        // set local SDP offer
        // client will trigger ICE gathering, and then onicecandidate callback
        client.pc.setLocalDescription(offer)
      })
      .catch(_catch)
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

  sendSDPOffer(offer) {
    let log = (msg) => this._log(msg)
    let _catch = (e) => this.onError(e)
    let pc = this.pc
    let _url = `${this.url}/${this.role}/${this.room}/${this.full_id}=========`
    log(`url ${_url}`)
    fetch(_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/sdp',
        Authorization: `Bearer ${this.token}`,
      },
      body: offer.sdp,
    })
      .then((res) => {
        res.json().then(function (resp) {
          // log('remote SDP Answer=========:' + resp.data.sdp)
          if (resp.data.sdp == 'bad token') {
            _catch(new Error('bad token'))
            return
          }
          pc.setRemoteDescription(
            new RTCSessionDescription({ type: 'answer', sdp: resp.data.sdp })
          ).catch(_catch)
        })
      })
      .catch(_catch)
  }
}
