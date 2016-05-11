/*******************************************************************
 *
 * Updated 20160425
 *
 * First to VR, recommend read
 * - https://developer.mozilla.org/en-US/docs/Web/API/WebVR_API/WebVR_concepts
 * 
 * WebVR API reference
 * - https://hacks.mozilla.org/2016/03/introducing-the-webvr-1-0-api-proposal/
 * - https://mozvr.github.io/webvr-spec/
 * 
 * Latest support status
 * - https://iswebvrready.org/
 *
 * Supported devices
 * - Oculus Rift (full support runtime 1.3+, limited support runtime 0.8)
 * - Mobile (with webvr-polyfill, https://github.com/borismus/webvr-polyfill)
 *
 * Theoretically supported, not tested
 * - HTC Vive
 * - Razer OSVR
 * - GearVR
 *
 * Supported browser
 * - Chromium WebVR build
 *     https://drive.google.com/folderview?id=0BzudLt22BqGRbW9WTHMtOWMzNjQ&usp=sharing#list
 *     (need "Enable WebVR" in "chrome://flags")
 * 
 * - Firefox Nightly
 *     https://nightly.mozilla.org/
 *     (with WebVR add-on, https://addons.mozilla.org/en-US/firefox/addon/mozilla-webvr-enabler/)
 * 
 * - Mobile Chrome / Firefox
 *
 * Theoretically supported, not tested
 * - Samsung Internet for Gear VR
 *
 *******************************************************************/

function WebVR() {

	this.displays = [];
	this.compatible = false;
	this.webglCanvas = null;
	this.gotVRDisplaysCallbacks = [];
	this.onVRPresentChangeCallbacks = [];
	this.onVRDisplayConnectedCallbacks = [];
	this.onVRDisplayDisconnectedCallbacks = [];

	this.WEBVR_API = {
		NO_SUPPORT: 0,
		ONE: 1,
		OLD: 2,
		CARDBOARD: 3
	};
	this.compatibleType = this.WEBVR_API.NO_SUPPORT;	
	
}

WebVR.prototype.init = function() {

	// No Promise in all IE
	if (!("Promise" in window)) {

		this.compatible = false;
		console.log('No Promise, bye bye');
		return;

	}

	// Get the VR stuff
	this.getVRDisplays().then(function(displays) {

		this.displays = displays;
		if (this.displays !== null && this.displays !== undefined && 
			this.displays.length >= 1) {
			this.display = this.displays[0];

			// Run the callback stack saved in onGotVRDisplays
			for (var callbackIndex in this.gotVRDisplaysCallbacks) {
				this.gotVRDisplaysCallbacks[callbackIndex](displays);
			}

		} else {
			this.displays = null;
			this.display = null;
		}

	}.bind(this));
	
}

WebVR.prototype.onGotVRDisplays = function(callback) {

	// If we already got the device, run it
	if (this.displays !== null && this.displays.length >= 1) {
		callback(this.displays);
	}

	// else we put it in a stack and run it later when we get the device
	this.gotVRDisplaysCallbacks.push(callback);

}

WebVR.prototype.requestFullscreen = function() {
	document.body.requestFullscreen = document.body.requestFullscreen ||
		document.body.msRequestFullscreen || document.body.mozRequestFullScreen ||
		document.body.webkitRequestFullscreen;
	if (document.body.requestFullscreen) {
		document.body.requestFullscreen();
	}
}

WebVR.prototype.exitFullscreen = function() {
	document.exitFullscreen = document.exitFullscreen ||
		document.msExitFullscreen || document.mozExitFullScreen ||
		document.webkitExitFullscreen;
	if (document.exitFullscreen) {
		document.exitFullscreen();
	}
}

WebVR.prototype.enterVR = function(vrDisplay, webglCanvas, threejsEffect, isEnterFullscreen ) {

	this.webglCanvas = webglCanvas;

	if (this.compatibleType == this.WEBVR_API.OLD) {

		if (threejsEffect !== undefined) {
			threejsEffect.setFullScreen(true);
		}

	} else {

		if (isEnterFullscreen) this.requestFullscreen();

		vrDisplay.requestPresent({ source: webglCanvas }).then(function () {
		}, function() {
			console.log('requestPresent failed.');
		});

	}

}

WebVR.prototype.exitVR = function(vrDisplay) {

	this.webglCanvas = null;

	vrDisplay.exitPresent().then(function () {
		this.exitFullscreen();
	}.bind(this), function() {
		console.log('exitPresent failed.');
	});

}

WebVR.prototype.resetPose = function(display) {

	if (display.resetPose) {
		display.resetPose();
	} else if (display.resetSensor) {
		display.resetSensor();
	} else if (display.zeroSensor) {
		display.zeroSensor();
	}

}

WebVR.prototype.getVRDisplays = function() {
	return new Promise(function(resolve, reject) {
		if (navigator.getVRDisplays) {

			// WebVR 1.0
			this.compatible = true;
			this.compatibleType = this.WEBVR_API.ONE;

			navigator.getVRDisplays().then(function (displays) {

				if (displays.length > 0) {

					if (displays[0].isPolyfilled) {
						this.compatibleType = this.WEBVR_API.CARDBOARD;
					}

					resolve(displays);

				} else {
					console.log("WebVR supported, but no VRDisplays found.");
					resolve(null);
				}

			}.bind(this));

		} else if (navigator.getVRDevices) {

			// Older WebVR
			// https://developer.mozilla.org/en-US/docs/Web/API/Navigator/getVRDevices
			this.compatible = true;
			this.compatibleType = this.WEBVR_API.OLD;
			console.log("Your browser supports WebVR but not the latest version. See <a href='http://webvr.info'>webvr.info</a> for more info.");

			// Very limited fallback
			navigator.getVRDevices().then(function (devices) {

				if (devices.length > 0) {
					var display = null;

					// Combine HMD and Position sensor together
					for (var idx in devices) {
						if (devices[idx] instanceof HMDVRDevice) {
							display = devices[idx];
							display.displayName = display.deviceName;
							display.displayId = display.deviceId;
							display.isConnected = true;
							display.isPresenting = false;
							display.capabilities.canPresent = true;
							display.capabilities.hasExternalDisplay = true;

						} else if (devices[idx] instanceof PositionSensorVRDevice) {

							display.sensor = devices[idx];
							display.getPose = function() { return display.sensor.getState() }
							display.getImmediatePose = function() { return display.sensor.getState() }

						}
					}

					resolve([display]);
				} else {

					console.log("Older WebVR supported, but no getVRDevices found.");
					resolve(null);

				}

			});

		} else {

			// No support
			this.compatible = false;
			console.log("Your browser does not support WebVR. See <a href='http://webvr.info'>webvr.info</a> for assistance.");
			resolve(null);

		}
	}.bind(this));
};