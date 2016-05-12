/************ WebVR ************/
var vrDisplay = null;

var webvr = new WebVR();

webvr.init();
webvr.gesture.on('nod', function(){
	console.log('Head nodding');
});
webvr.gesture.on('shake', function(){
	console.log('Head shaking');
});

// Not implemented yet in Chromium
window.addEventListener( 'vrdisplaypresentchange', function(event){
	// console.log(webvr.display.isConnected, event);
});

// Not implemented yet in Chromium
window.addEventListener( 'vrdisplayconnected', function(event){
	// console.log(webvr.display.isConnected, event);
});

// Implemented
window.addEventListener( 'vrdisplaydisconnected', function(event){
	// console.log(webvr.display.isPresenting, event);
});

webvr.onGotVRDisplays(function(displays){

	if (displays.length >= 2) {

		// If we detect more than one VR device, provide options to user for choosing which one to use.
		// In future, WebVR API will support two or more devices output but not now.

		var totalDisplays = displays.length,
			count = 0;

		window.alert('You have ' + totalDisplays + ' VR devices. You need to choose one.');

		// May use beauty UI than just confirm/alert in production
		while (!vrDisplay && count < totalDisplays) {
			if (window.confirm(
					'Use "' + displays[count].displayName + 
					'" (ID: ' + displays[count].displayId + ')' +
					' (' + (count+1) + '/' + totalDisplays + ')' + 
					'?')) {
				vrDisplay = displays[count];
				break;
			}
			count++;
		}

		if (!vrDisplay) {
			window.alert('No device choosed. Use "' + displays[0].displayName + '" automatically.');
			vrDisplay = displays[0];
		}

	} else {

		// Just choose the first one
		vrDisplay = displays[0];

	}

	if ( vrDisplay.capabilities !== undefined && vrDisplay.capabilities.canPresent ) {

		$('.enter-vr').on('click', function(){
			// webvr.enterVR(vrDisplay, renderer.domElement); // Don't need effect if we can ignore old WebVR API
			webvr.enterVR(vrDisplay, renderer.domElement, effect);
			$('body').addClass('is-presenting');
			onResize();
		});

		$('.exit-vr').on('click', function(){
			webvr.exitVR(vrDisplay);
			onResize();
		});

		$('.reset-vr-center').on('click', function(){
			webvr.resetPose(vrDisplay);
		});

	} else {

		$('.enter-vr, .exit-vr, .reset-vr-center').hide();
		alert('No VR support. See https://webvr.info/');

	}

});

/************ THREE ************/
var camera, scene, renderer, controls, effect;
var clock = new THREE.Clock();

// Scene objects
var boxMeshes = [],
	skyDomeTexture = '../../images/mountain.jpg';

var faceNodTexture = 'images/nod.png',
	faceShakeTexture = 'images/shake.png',
	faceNodScale = .5, faceShakeScale = .5,
	faceNodBox, faceShakeBox;

// Simple 3D scene
init();
animate();

function init() {
	scene = new THREE.Scene();
	scene.position.set(0, 0, 0);

	camera = new THREE.PerspectiveCamera( 45, window.innerWidth/window.innerHeight, 0.01, 10000 );
	camera.position.set(0, 0, 0);

	// Add an axis helper
	var axis = new THREE.AxisHelper(1000);
	axis.position.set(0, 0.1, -10);
	scene.add(axis);

	// Add ground
	var ground = new THREE.Mesh(
		new THREE.PlaneGeometry( 200, 200, 50, 50 ),
		new THREE.MeshBasicMaterial( { color: 0xdddddd, wireframe: true } )
	);
	ground.position.set(0, 0, 0);
	ground.rotation.x = Math.PI / -2;
	scene.add(ground);

	// Add world dome with texture
	// var skyDomeTextureLoader = new THREE.TextureLoader();
	// skyDomeTextureLoader.load(skyDomeTexture, function ( texture ) {
	// 	var geometry = new THREE.SphereGeometry(1000, 20, 20);
	// 	var material = new THREE.MeshBasicMaterial({map: texture, overdraw: 0.5});
	// 	var mesh = new THREE.Mesh(geometry, material);

	// 	var geometry = new THREE.SphereGeometry( 200, 32, 32 );
	// 	var material = new THREE.MeshBasicMaterial({map: texture, overdraw: 0.5});
	// 	var skyDomeSphere = new THREE.Mesh( geometry, material );
	// 	skyDomeSphere.material.side = THREE.BackSide;
	// 	scene.add( skyDomeSphere );
	// });

	// Add lights
	var lights = [];

	lights[0] = new THREE.PointLight( 0xffffff, 1, 0 );
	lights[1] = new THREE.PointLight( 0xffffff, 1, 0 );
	lights[2] = new THREE.PointLight( 0xffffff, 1, 0 );

	lights[0].position.set( 100, 100, 100 );
	lights[1].position.set( -100, 100, 100 );
	lights[2].position.set( 0, 100, -100 );

	scene.add( lights[0] );
	scene.add( lights[1] );
	scene.add( lights[2] );

	// Init renderer
	renderer = new THREE.WebGLRenderer({antialias: true});
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setClearColor(0xeeeeee);

	// Apply VR stereo rendering to renderer.
	effect = new THREE.VREffect(renderer);
	effect.setSize(window.innerWidth, window.innerHeight);

	// Add user controls
	if (webvr.compatible) {
		// Basic head motion control
		// controls = new THREE.VRControls( camera );

		// wasd + head motion control
		controls = new THREE.FirstPersonVRControls( camera );
		controls.movementSpeed = 10;
		controls.lockUserVertical = true;
		controls.lookSpeed = 0;
	} else {
		controls = new THREE.FirstPersonControls( camera );
		controls.movementSpeed = 10;
		controls.lookSpeed = 0.1;
	}
	
	// Add to DOM
	document.body.appendChild( renderer.domElement );

}

function animate() {
	if (!vrDisplay) {
		vrDisplay = webvr.display;
		window.requestAnimationFrame( animate );
	} else {
		if (!!vrDisplay.requestAnimationFrame) {
			vrDisplay.requestAnimationFrame( animate );
		} else {
			window.requestAnimationFrame( animate );
		}
	}
	render();
}

function render() {
	if (faceNodBox) {
		if (webvr.gesture.head.nod) {
			faceNodBox.rotation.x = Math.sin( clock.elapsedTime ) / .2;
			if (faceNodScale < 1) faceNodScale += 0.1;
			else faceNodScale = 1;
		} else {
			faceNodBox.rotation.x = Math.sin( clock.elapsedTime ) / 2;
			if (faceNodScale > 0.5) faceNodScale -= 0.1
			else faceNodScale = 0.5;
		}

		faceNodBox.scale.set(faceNodScale, faceNodScale, faceNodScale);
	}

	if (faceShakeBox) {
		if (webvr.gesture.head.shake) {
			faceShakeBox.rotation.y = Math.cos( clock.elapsedTime ) / .2;
			if (faceShakeScale < 1) faceShakeScale += 0.1;
			else faceShakeScale = 1;
		} else {
			faceShakeBox.rotation.y = Math.cos( clock.elapsedTime ) / 2;
			if (faceShakeScale > 0.5) faceShakeScale -= 0.1
			else faceShakeScale = 0.5;
		}

		faceShakeBox.scale.set(faceShakeScale, faceShakeScale, faceShakeScale);
	}

	// Update user control
	controls.update( clock.getDelta() );

	// Update rendering
	effect.render( scene, camera );
}

function onResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
}

window.addEventListener('resize', onResize, false);

/************ Smiley face ************/

addFace();
function addFace() {

	var faceNodTextureLoader = new THREE.TextureLoader();
	faceNodTextureLoader.load(faceNodTexture, function ( texture ) {
		var geometry = new THREE.BoxGeometry( 1, 1, 1 );
		var material = new THREE.MeshBasicMaterial({map: texture});
		faceNodBox = new THREE.Mesh( geometry, material );

		faceNodBox.position.set(-0.75, 1.7, -2);

		scene.add( faceNodBox );
	});

	var faceShakeTextureLoader = new THREE.TextureLoader();
	faceShakeTextureLoader.load(faceShakeTexture, function ( texture ) {
		var geometry = new THREE.BoxGeometry( 1, 1, 1 );
		var material = new THREE.MeshBasicMaterial({map: texture});
		faceShakeBox = new THREE.Mesh( geometry, material );

		faceShakeBox.position.set(0.75, 1.7, -2);

		scene.add( faceShakeBox );
	});

}