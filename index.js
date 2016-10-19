const EVENT_ADD = 'add'

const EVENTS = [EVENT_ADD]

export default class DashRecorder {
	/*mediassource manager forom dash player*/
	constructor(VideoController, socketInstance) {
		this.socket = socketInstance

		//move this out
		this.socket.on('rad:video:save:success', (response)=>{
			this.socket.emit('rad:video:upload', [response])
		})

		this._events = {}

		VideoController._onIndexAndBufferSuccess = (vo) => {

			var buf = new ArrayBuffer(vo.indexBuffer.length)
			var bufView = new Uint8Array(buf);
			bufView.set(vo.indexBuffer)

			if (this._started) {
				this.add({
					indexBuffer: buf,
					rangeBuffer: vo.videoBuffer,
					saveName: vo.videoId,
					duration:vo.duration
				})

				if (this._events[EVENT_ADD]){
					this._events[EVENT_ADD]()
				}
			}
		}
	}

	on(event, callback) {
		let _exists = EVENTS.filter(e => {
			return event === e
		}).length > 0
		if (_exists) {
			this._events[event] = callback
		}
	}

	off(event){
			this._events[event] = null
	}

	addFrame(frameData){
		this.socket.emit('rad:video:frame', frameData)
	}

	lastFrame(frameData){
		this.socket.emit('rad:video:frame:end', frameData)
	}

	add(obj) {
		this.socket.emit('rad:video:save', obj)
	}

	save() {
		this.socket.emit('rad:video:save:end')
	}

	upload(){

	}

	start() {
		this._started = true
	}

	stop() {
		this._started = false
	}

	destroy() {

	}

}
