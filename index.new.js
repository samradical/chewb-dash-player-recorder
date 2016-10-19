const EVENT_ADD = 'add'

const EVENTS = [EVENT_ADD]

export default class DashRecorder {
	/*mediassource manager forom dash player*/
	constructor(socketInstance) {
		this.socket = socketInstance

		//move this out
		this.socket.on('rad:video:save:success', (response) => {
			console.log(response);
			//this.socket.emit('rad:video:upload', [response])
		})

		this.socket.on('rad:recorder:frame:success', (response) => {
			this._saveNextVideoChunk()
		})

		this.socket.on('rad:recorder:audio:success', (response) => {
			console.log("Uploaded audio");
			this._saveNextAudioChunk()
		})

		this._events = {}
		this._audioBuffers = []
		this._frameBuffers = []
	}

	on(event, callback) {
		let _exists = EVENTS.filter(e => {
			return event === e
		}).length > 0
		if (_exists) {
			this._events[event] = callback
		}
	}

	off(event) {
		this._events[event] = null
	}

	addAudio(buffer) {
		this._audioBuffers.push(buffer)
		console.log('added audio', buffer.byteLength);
	}


	pipeAudio(buffer) {
		this.socket.emit('rad:recorder:audio', buffer)
		console.log('piped audio', buffer.byteLength);
	}

	addFrame(frameData) {
		this._frameBuffers.push(frameData)
		console.log(this._frameBuffers.length);
		/*var tmp = new Uint8Array(this._buffer.byteLength + frameData.byteLength);
		tmp.set(this._buffer, 0);
		tmp.set(new Uint8Array(frameData), this._buffer.byteLength);
		this._buffer = tmp
		console.log(this._buffer.length);*/
		//this.socket.emit('rad:video:frame', frameData)
	}

	pipeFrame(frameData){
		this.socket.emit('rad:recorder:frame', frameData)
	}

	_saveNextAudioChunk() {
		if (this._audioBuffers.length) {
			let _b = this._audioBuffers.shift()
			this.socket.emit('rad:recorder:audio', _b)
			_b = null
		} else {
			console.log("DONE AUDIO, now video");
			this._saveNextVideoChunk()
		}
	}

	_saveNextVideoChunk() {
		if (this._frameBuffers.length) {
			console.log(this._frameBuffers.length);
			let _b = this._frameBuffers.shift()
			this.socket.emit('rad:recorder:frame', _b)
			_b = null
		} else {
			console.log("DONE ALL");
			this.socket.emit('rad:recorder:save', this._saveOptions)
		}
	}

	save(options) {
		if(!options){
			throw new Error('{width:, height: }')
			return
		}
		this._saveOptions = options
		if (this._audioBuffers.length) {
			let _b = this._audioBuffers.shift()
			this.socket.emit('rad:recorder:audio', _b)
			_b = null
		}
	}

	pipeSave(options){
		this.socket.emit('rad:recorder:save', options)
	}








	/*lastFrame() {
		console.log("Saving");
		if (this._frameBuffers.length) {
			let _b = this._frameBuffers.shift()
			this.socket.emit('rad:recorder:frame', _b)
			_b = null
		}
		//this.socket.emit('rad:video:frame:end', this._buffer.buffer)
	}

	add(obj) {
		this.socket.emit('rad:video:save', obj)
	}

	upload() {

	}

	start() {
		this._started = true
	}

	stop() {
		this._started = false
	}*/

	destroy() {

	}

}
