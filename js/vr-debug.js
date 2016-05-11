webvr.onGotVRDisplays(function(){

	var params = {
		vrDisplay: {
			displayName: null,
			displayId: null,
			isConnected: null,
			isPresenting: null
		},
		'vrDisplay.capabilities': {
			canPresent: null,
			hasExternalDisplay: null,
			hasOrientation: null,
			hasPosition: null
		},
		'vrDisplay.getPose()': {
			timeStamp: null,
			position: null,
			orientation: null,
			linearVelocity: null,
			linearAcceleration: null,
			angularVelocity: null,
			angularAcceleration: null
		},
		'vrDisplay.stageParameters': {
			sittingToStandingTransform: null,
			sizeX: null,
			sizeY: null
		}
	};

	var details = document.createElement('details'),
		summary = document.createElement('summary'),
		sections = [];
	
	details.setAttribute('open', 'open');
	details.id = '_vr-debug_';

	summary.textContent = 'VR Params';
	details.appendChild(summary);

	for (var key in params) {
		var section = document.createElement('h1');
		section.textContent = key;
		details.appendChild(section);

		var paramList = document.createElement('ul');
		paramList.classList.add('_vr-debug_param-list');

		for (var name in params[key]) {
			var paramItem = document.createElement('li');
			paramItem.textContent = name + ': ';

			var paramText = document.createElement('code');
			paramText.id = '_vr-debug_attr-' + name;
			paramText.textContent = 'null';

			paramItem.appendChild(paramText);
			paramList.appendChild(paramItem);
		}

		details.appendChild(paramList);
	}

	document.body.appendChild(details);

	var capabilities = null,
		vrPose = null,
		stageParameters = null;

	function updateParam(params) {
		for (var name in params) {
			if ( params[name] !== null ) {

				if (
					typeof params[name] == "string" || 
					typeof params[name] == "number" || 
					typeof params[name] == "boolean"
				) {
					if (document.getElementById('_vr-debug_attr-' + name) != null)
						document.getElementById('_vr-debug_attr-' + name).textContent = params[name].toString();
				} else if (
					/*
						Heavy, don't use Object.prototype.toString.call
						Object.prototype.toString.call() === "[object Float32Array]" || 
						Object.prototype.toString.call(params[name]) === "[object DOMPoint]"
					*/
					params[name].length == 4 || params[name].length == 3
				) {
					var value = "";
					for (var idx in params[name]) {
						if (value != "")
							value += ",";
						if (params[name][idx] >= 0)
							value += '\u00a0'; // &nbsp;
						value += params[name][idx].toFixed(3);
					}
					if (document.getElementById('_vr-debug_attr-' + name) != null)
						document.getElementById('_vr-debug_attr-' + name).textContent = value;
				}
				
			}
		}
	}

	vrDebug();
	function vrDebug() {
		requestAnimationFrame( vrDebug );

		if (!vrDisplay) vrDisplay = webvr.display;
		else {
			capabilities = vrDisplay.capabilities;
			vrPose = vrDisplay.getPose();
			stageParameters = vrDisplay.stageParameters;

			if (vrDisplay !== null) {
				updateParam(vrDisplay);
			}

			if (capabilities !== null) {
				updateParam(capabilities);
			}

			if (vrPose !== null) {
				updateParam(vrPose);
			}

			if (stageParameters !== null) {
				updateParam(stageParameters);
			}

		}
	}
	
});