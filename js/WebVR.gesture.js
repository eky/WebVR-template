/*******************************************

	webvr.gesture.on('nod', function(){
		console.log('Head nodding');
	});
	
	webvr.gesture.on('shake', function(){
		console.log('Head shaking');
	});

*******************************************/

WebVR.prototype.gesture = {
	head: {
		nod: false,
		shake: false
	},
	angularVelocity: [],
	nodCallbacks: [],
	shakeCallbacks: []
};

WebVR.prototype.gesture.on = function(eventName, callback) {
	if (eventName == 'nod') this.nodCallbacks.push(callback);
	else if (eventName == 'shake') this.shakeCallbacks.push(callback);
};

(function(){

	// Debug use
	var isDebugMode = true;
	if (isDebugMode) {
		var canvas = document.getElementById('gesture-canvas');
		var ctx = canvas.getContext("2d");
		ctx.lineWidth = 1;
		ctx.strokeStyle = '#fff';
	}

	// Sensitivity
	const NOD_UP_VELOCITY = 2,
		NOD_DOWN_VELOCITY = 2,
		NODDING_FRAME_AMOUNT = 3,
		SHAKE_VELOCITY = 1.8,
		SHAKE_FRAME_AMOUNT = 3;

	// Setting
	var vrDisplay = null,
		pose = null,

		dataBufferSize = 60,
		fps = 30,

		lastFrameNodEventOn = false,
		lastFrameShakeEventOn = false,

		mobilePolyfillMultiplier = 1500,
		lastOrientaion = [0, 0, 0],
		lastTime;

	// Init WebVR.js
	var webvr = new WebVR();
	webvr.init();

	lastTime = Date.now();

	// Get the VRHMD
	webvr.onGotVRDisplays(function(displays){

		var angularVelocity = webvr.gesture.angularVelocity;
		while (angularVelocity.length < dataBufferSize) {
			angularVelocity.push([0, 0, 0]);
		}

		vrDisplay = displays[0];

		checkVRGesture();
		function checkVRGesture() {
			window.requestAnimationFrame( checkVRGesture );

			// Maximize the FPS to prevent too high data frequncy
			var timeDelta = Date.now() - lastTime;
			if (timeDelta < 1000 / fps) return;

			if (vrDisplay !== null) {

				pose = vrDisplay.getPose();

				var angularVelocity = webvr.gesture.angularVelocity;

				if (pose !== null) {

					// Polyfill angularVelocity with orientation data (mainly mobile)
					if (pose.angularVelocity == null && pose.orientation !== null) {
						pose.angularVelocity = [
							( (pose.orientation[0] - lastOrientaion[0]) / timeDelta * mobilePolyfillMultiplier),
							( (pose.orientation[1] - lastOrientaion[1]) / timeDelta * mobilePolyfillMultiplier),
							( (pose.orientation[2] - lastOrientaion[2]) / timeDelta * mobilePolyfillMultiplier)
						];
					}

					lastOrientaion = [
						pose.orientation[0],
						pose.orientation[1],
						pose.orientation[2]
					];
					lastTime = Date.now();

					// Stack the head movement
					angularVelocity.push( pose.angularVelocity );
					while (angularVelocity.length >= dataBufferSize) {
						angularVelocity.shift();
					}

					// Analyze data if preform a nod or shake gesture
					var nodUpFrameCount = 0,
						nodDownFrameCount = 0;

					var shakeLeftFrameCount = 0,
						shakeRightFrameCount = 0;

					// Head nod
					for (var count = dataBufferSize; count > 0; count--) {
						// Move up and down once = nod
						if (angularVelocity[count]) {
							if (angularVelocity[count][0] > NOD_UP_VELOCITY) {
								nodUpFrameCount++;
							}
							if (angularVelocity[count][0] < NOD_DOWN_VELOCITY) {
								nodDownFrameCount++;
							}
						}

						// Move left and right once = shake
						if (angularVelocity[count]) {
							if (angularVelocity[count][1] > SHAKE_VELOCITY) {
								shakeLeftFrameCount++;
							}
							if (angularVelocity[count][1] < SHAKE_VELOCITY) {
								shakeRightFrameCount++;
							}
						}

					}

					// Gesture preformed when the frame count > FRAME_AMOUNT
					if (nodUpFrameCount >= NODDING_FRAME_AMOUNT && nodDownFrameCount >= NODDING_FRAME_AMOUNT) {
						webvr.gesture.head.nod = true;

						if (!lastFrameNodEventOn) {
							for (var callbackIndex in webvr.gesture.nodCallbacks) {
								webvr.gesture.nodCallbacks[callbackIndex]();
							}
						}

						lastFrameNodEventOn = true;
					} else {
						webvr.gesture.head.nod = false;
						lastFrameNodEventOn = false;
					}

					if (shakeLeftFrameCount >= SHAKE_FRAME_AMOUNT && shakeRightFrameCount >= SHAKE_FRAME_AMOUNT) {
						webvr.gesture.head.shake = true;

						if (!lastFrameShakeEventOn) {
							for (var callbackIndex in webvr.gesture.shakeCallbacks) {
								webvr.gesture.shakeCallbacks[callbackIndex]();
							}
						}

						lastFrameShakeEventOn = true;
					} else {
						webvr.gesture.head.shake = false;
						lastFrameShakeEventOn = false;
					}

					// Debug graph
					if (isDebugMode) debug();

				}

			}
		}

		// Debug graph
		function debug() {

			var angularVelocity = webvr.gesture.angularVelocity;

			ctx.clearRect(0, 0, canvas.width, canvas.height);

			// Draw movement
			for (var count = 0; count <= dataBufferSize; count++) {
				if (count > 0 && angularVelocity[count]) {
					ctx.beginPath();
					ctx.moveTo(
						((count-1) / dataBufferSize) * canvas.width, 
						(angularVelocity[count-1][0] / 3) * canvas.height / 2 + canvas.height / 2
					);
					ctx.lineTo(
						(count / dataBufferSize) * canvas.width, 
						(angularVelocity[count][0] / 3) * canvas.height / 2 + canvas.height / 2
					);
					ctx.stroke();
				}

				if (count > 0 && angularVelocity[count]) {
					ctx.beginPath();
					ctx.moveTo(
						(angularVelocity[count-1][1] / 3) * canvas.width / 2 + canvas.width / 2,
						((count-1) / dataBufferSize) * canvas.height
					);
					ctx.lineTo(
						(angularVelocity[count][1] / 3) * canvas.width / 2 + canvas.width / 2,
						(count / dataBufferSize) * canvas.height
					);
					ctx.stroke();
				}
			}
		}

	});

})();