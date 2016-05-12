/*******************************************
	
	// Inside init function
	webvr.pointer.indicator.color = 0xff3300;
	webvr.pointer.indicator.radius = 0.05;
	webvr.pointer.init(scene, camera);
	
	// Inside render function
	webvr.pointer.update();
	
	// Runtime
	webvr.pointer.on(objects, 'enter', function(objects){
		console.log('Pointer enter');
	});
	
	webvr.pointer.on(objects, 'leave', function(objects){
		console.log('Pointer leave');
	});
	
	webvr.pointer.on(objects, 'selected', function(objects){
		console.log('Object selected');
	}, 1000);

*******************************************/

WebVR.prototype.pointer = {
	color: 0xdddddd,
	radius: 5,

	triggerTime: 1000,

	scene: null,
	camera: null,

	raycaster: null,

	mouse: null,
	_indicator: null,

	enterCallbacks: [],
	leaveCallbacks: [],
	selectedCallbacks: []
};

WebVR.prototype.pointer.indicator = {
	visible: true,

	radius: 0.05,
	distance: -5,
	segment: 15,
	color: 0x9999ff,

	progressRing: {
		visible: true,

		color: 0x9999ff,
		holeOffset: 0.05,
		tubeWidth: 0.02,
		radialSegments: 2,
		tubularSegments: 100
	}
};

WebVR.prototype.pointer.init = function(scene, camera) {
	var raycaster = new THREE.Raycaster();
	var mouse = new THREE.Vector3();

	this.scene = scene;
	this.camera = camera;

	this.raycaster = raycaster;
	this.mouse = mouse;

	this._indicator = new THREE.Mesh( 
		new THREE.CircleGeometry(this.indicator.radius, this.indicator.segment), 
		new THREE.MeshBasicMaterial( { color: this.indicator.color } )
	);
	this._indicator.visible = this.indicator.visible;

	this.scene.add(this._indicator);

	onResize.bind(this);
	function onResize() {
		this.mouse.x = ( (window.innerWidth/2) / window.innerWidth ) * 2 - 1;
		this.mouse.y = - ( (window.innerHeight/2) / window.innerHeight ) * 2 + 1;
		this.mouse.z = 0.5;
	}

	window.addEventListener('resize', onResize.bind(this), false);
};

WebVR.prototype.pointer.updateProgress = function(progress) {

	var indicator = this._indicator,
		ring = indicator.children[0];

	// Remove old object
	if (ring && ring.geometry) {
		ring.geometry.dispose();
		ring.material.dispose();
		indicator.remove( ring );
	}

	if (progress > 0 && progress <= 1 && this.indicator.progressRing.visible) {

		// Build new ring
		var progressRing = new THREE.Mesh( 
			new THREE.TorusGeometry(
				this.indicator.radius + this.indicator.progressRing.holeOffset,
				this.indicator.progressRing.tubeWidth,
				this.indicator.progressRing.radialSegments,
				this.indicator.progressRing.tubularSegments,
				progress * Math.PI * 2
			), 
			new THREE.MeshBasicMaterial( { color: this.indicator.color } )
		);
		progressRing.rotation.x = Math.PI / -1;
		progressRing.rotation.z = Math.PI / -2;

		indicator.add(progressRing);

	}

};

WebVR.prototype.pointer.update = function() {

	this._indicator.quaternion.copy( this.camera.quaternion );
	this._indicator.position.copy( this.camera.position );
	this._indicator.translateZ( this.indicator.distance );

	this.raycaster.setFromCamera( this.mouse, this.camera );

	// Enter
	for (var callbackIndex in this.enterCallbacks) {
		var eventData = this.enterCallbacks[callbackIndex];
		var intersects = this.raycaster.intersectObjects( eventData.objects );

		var results = [];
	
		for ( var i = 0; i < intersects.length; i++ ) {

			var object = intersects[ i ].object;

			if (!object.userData._entering) {
				object.userData._entering = true;
				object.userData._enterStart = Date.now();

				results.push(object);
			}
		
		}

		eventData.callback(results);
	}

	// Leave
	for (var callbackIndex in this.leaveCallbacks) {
		var eventData = this.leaveCallbacks[callbackIndex];
		var intersects = this.raycaster.intersectObjects( eventData.objects );

		var intersectIds = [],
			results = [];
	
		for ( var i = 0; i < intersects.length; i++ ) {
			var object = intersects[ i ].object;

			if (!object.userData._entering) {
				object.userData._entering = true;
				object.userData._enterStart = Date.now();
			}

			intersectIds.push(object.id);
		}
		for ( var i = 0; i < eventData.objects.length; i++ ) {
			var object = eventData.objects[ i ];

			// If entered but not intersect any more
			if (object.userData._entering && intersectIds.indexOf(object.id) < 0) {
				object.userData._entering = false;
				object.userData._enterStart = 0;

				results.push(object);
			}
		}

		eventData.callback(results);
	}

	// Selected
	for (var callbackIndex in this.selectedCallbacks) {
		var eventData = this.selectedCallbacks[callbackIndex];
		var intersects = this.raycaster.intersectObjects( eventData.objects );

		var results = [];

		var now = Date.now();

		var earliestEnterStart = 0;
	
		for ( var i = 0; i < intersects.length; i++ ) {

			var object = intersects[ i ].object;

			if (!object.userData._entering) {
				object.userData._entering = true;
				object.userData._enterStart = now;

			}
			
			if (object.userData._enterStart > 0 && earliestEnterStart < object.userData._enterStart) {
				earliestEnterStart = object.userData._enterStart;
			}
			
			if (object.userData._enterStart && now - object.userData._enterStart >= eventData.triggerTime ) {
				results.push(object);
			}
		}

		if (intersects.length >= 1 && earliestEnterStart > 0) {
			this.updateProgress( (now - earliestEnterStart) / eventData.triggerTime );
		} else {
			this.updateProgress( 0 );
		}

		eventData.callback(results);
	}

};

WebVR.prototype.pointer.on = function(objects, eventName, callback, triggerTime) {
	if (eventName == 'enter') this.enterCallbacks.push({ objects: objects, callback: callback });
	else if (eventName == 'leave') this.leaveCallbacks.push({ objects: objects, callback: callback });
	else if (eventName == 'selected') {
		triggerTime = triggerTime == undefined ? this.triggerTime : triggerTime;
		this.selectedCallbacks.push({ objects: objects, callback: callback, triggerTime: triggerTime });
	}
};