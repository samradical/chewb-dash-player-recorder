const EVENT_ADD = 'add'
const EVENT_SAVED = 'saved'
const EVENT_PROGRESS = 'progress'

const EVENTS = [EVENT_ADD, EVENT_SAVED, EVENT_PROGRESS]

const DEFAULTS = {
	pipe: false,
}

//320x240x4x4
const BYTES_PER_CHUNK = 4915200
	//const BYTES_PER_CHUNK = 1228800
	//const BYTES_PER_CHUNK = 614400

const ARRAY_SLICE = 'onmessage=function(e){var data = e.data;var tmp=new Uint8Array(data.b1.byteLength+data.b2.byteLength);tmp.set(new Uint8Array(data.b1),0);tmp.set(new Uint8Array(data.b2),data.b1.byteLength);postMessage(tmp)};'

export default class DashRecorder {
	/*mediassource manager forom dash player*/
	constructor(socketInstance, options = {}) {

		this.options = Object.assign({}, DEFAULTS, options)

		this.socket = socketInstance

		//move this out
		this.socket.on('rad:recorder:save:success', (response) => {
			this._dispatchEvent(EVENT_SAVED, response)
				//this.socket.emit('rad:video:upload', [response])
		})

		if (!options.pipe) {

			this.socket.on('rad:recorder:frame:success', (response) => {
				this._saveNextVideoChunk()
			})

			this.socket.on('rad:recorder:audio:success', (response) => {
				this._saveNextAudioChunk()
			})

		}

		var blob = URL.createObjectURL(
			new Blob([ARRAY_SLICE], {
				type: 'application/javascript'
			}));

		this._concatWorker = new Worker(blob);

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

	_dispatchEvent(str, ...args) {
		if (this._events[str]) {
			this._events[str](...args)
		}
	}

	addAudio(buffer) {
		if (this.options.pipe) {
			this.pipeAudio(buffer)
		} else {
			this._audioBuffers.push(buffer)
			console.log('added audio', buffer.byteLength);
		}
	}

	pipeAudio(buffer) {
		this.socket.emit('rad:recorder:audio', buffer)
		console.log('piped audio', buffer.byteLength);
	}

	addFrame(frameData) {
		if (this.options.pipe) {
			this.pipeFrame(frameData)
		} else {
			//this._frameBuffers.push(frameData.slice(0))
			this._frameBuffers.push(frameData)
			console.log(this._frameBuffers.length);
			/*if (this._frameBuffers.length > this.options.cachBuffer) {
				this.pipeFrame(this._frameBuffers.pop())
			}*/
		}
	}

	pipeFrame(frameData) {
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
		let _l = this._frameBuffers.length
		if (_l) {
			this._dispatchEvent(EVENT_PROGRESS, (1 - (_l / this._totalFrames)))
			let _b = this._frameBuffers.shift()
			console.log(this._frameBuffers.length);
			this.socket.emit('rad:recorder:frame', _b)
			_b = null
		} else {
			console.log("DONE ALL");
			this.socket.emit('rad:recorder:save', this._saveOptions)
		}
	}

	save(options) {
		if (!options) {
			throw new Error('{width:, height: }')
			return
		}
		let _bytesPerFrame = options.width * options.height * 4
			//group them into chunks of
		let _groupings = Math.floor(BYTES_PER_CHUNK / _bytesPerFrame)
		this._saveOptions = options
			//base64
		if (options.withBuffers) {
			this._concatFrames(_groupings)
		} else {
			//buffer
			if (this._audioBuffers.length) {
				this._startUpload()
			} else {
				this._saveNextVideoChunk()
			}
		}
	}

	_startUpload() {
		this._totalFrames = this._frameBuffers.length
		if (this._audioBuffers.length) {
			let _b = this._audioBuffers.shift()
			this.socket.emit('rad:recorder:audio', _b)
			_b = null
		}
	}

	pipeSave(options) {
		this.socket.emit('rad:recorder:save', options)
	}

	_concatTwo(concated, frameBuffers, passes) {
		let _self = this
		if (frameBuffers.length > 1) {

			let b1 = frameBuffers.shift()
			let b2 = frameBuffers.shift()

			this._concatWorker.onmessage = function(e) {
				concated.push(e.data.buffer)
				_self._concatTwo(concated, frameBuffers, passes)
			};

			this._concatWorker.postMessage({
				b1: b1,
				b2: b2,
			}, [b1, b2]);

		} else if (frameBuffers.length === 1) {
			concated.push(frameBuffers.shift())
			_self._concatPassComplete(concated, passes)
		} else {
			_self._concatPassComplete(concated, passes)
		}
	}

	_concatPassComplete(concated, passes) {
		passes--
		if (passes > 0) {
			let _concated = []
			this._concatTwo(_concated, concated, passes)
		} else {
			this._frameBuffers = concated
			this._startUpload()
		}
	}

	_concatFrames(passes) {
		let _concated = []
		this._concatTwo(_concated, this._frameBuffers, passes)
			/*
					return
					let _proms = []
					for (var i = 0; i < this._frameBuffers.length; i += 2) {
						let b1 = this._frameBuffers[i]
						let b2 = this._frameBuffers[i + 1]
						if (b1 && b2) {
							_proms.push(this._concatTwo(b1, b2))
						}
					}

					return Q.all(_proms, { concurrency: 1 })
			*/
	}


	get frameBuffers() {
		return this._frameBuffers
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
