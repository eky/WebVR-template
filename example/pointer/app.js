/************ WebVR ************/
var vrDisplay = null;

var webvr = new WebVR();

webvr.init();

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
	var skyDomeTextureLoader = new THREE.TextureLoader();
	skyDomeTextureLoader.load(skyDomeTexture, function ( texture ) {
		var geometry = new THREE.SphereGeometry(1000, 20, 20);
		var material = new THREE.MeshBasicMaterial({map: texture, overdraw: 0.5});
		var mesh = new THREE.Mesh(geometry, material);

		var geometry = new THREE.SphereGeometry( 200, 32, 32 );
		var material = new THREE.MeshBasicMaterial({map: texture, overdraw: 0.5});
		var skyDomeSphere = new THREE.Mesh( geometry, material );
		skyDomeSphere.material.side = THREE.BackSide;
		scene.add( skyDomeSphere );
	});

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

	// Pointer plugin setting, init
	webvr.pointer.indicator.color = 0xff3300;
	webvr.pointer.init(scene, camera);

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
	boxAnimation();

	// Update pointer plugin
	webvr.pointer.update();

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

/************ Basic boxes sample ************/
var isBoxMove = false;

addBoxes(500);

// Init pointer plugin events
webvr.pointer.on(boxMeshes, 'enter', function(objects){
	for (var index in objects) {
		objects[index].userData.entering = true;
	}
});

webvr.pointer.on(boxMeshes, 'leave', function(objects){
	for (var index in objects) {
		objects[index].userData.entering = false;
	}
});

webvr.pointer.on(boxMeshes, 'selected', function(objects){
	for (var index in objects) {
		objects[index].userData.selected = true;
	}
}, 1000);

function addBoxes(boxCount) {
	
	boxCount = boxCount === undefined ? 1000 : boxCount;

	// Random color box
	var materials = [
		new THREE.MeshLambertMaterial( { color: 0xdddddd } ),
		new THREE.MeshLambertMaterial( { color: 0xff6698 } ),
		new THREE.MeshLambertMaterial( { color: 0xffb366 } ),
		new THREE.MeshLambertMaterial( { color: 0xffff66 } ),
		new THREE.MeshLambertMaterial( { color: 0x98ff66 } ),
		new THREE.MeshLambertMaterial( { color: 0x6698ff } ),
		new THREE.MeshLambertMaterial( { color: 0xff9866 } ),
		new THREE.MeshLambertMaterial( { color: 0x333333 } )
	];

	var boxGeometry = new THREE.BoxGeometry(1, 1, 1);

	// Add boxes
	for (var i = 0; i < boxCount; i++) {
		var x = (Math.random() - 0.5) * 400,
			y = (Math.random() - 0.5) * 20,
			z = (Math.random() - 0.5) * 200 - 100;

		var boxMesh = new THREE.Mesh( boxGeometry, materials[(Math.floor(Math.random()*8))] );
		boxMesh.position.set(x,y,z);
		boxMesh.castShadow = true;
		boxMesh.receiveShadow = true;

		boxMeshes.push(boxMesh);

		scene.add(boxMesh);
	}
}

function boxAnimation() {
	// Simple boxes animation
	for (var boxId = 0, total = boxMeshes.length; boxId < total; boxId ++) {
		var box = boxMeshes[boxId];
		switch (boxId % 6) {
			case 0:
				box.rotation.x += 0.01;
				break;
			case 1:
				box.rotation.y += 0.01;
				break;
			case 2:
				box.rotation.z += 0.01;
				break;
			case 3:
				box.rotation.x -= 0.01;
				box.rotation.z -= 0.01;
				break;
			case 4:
				box.rotation.y -= 0.01;
				box.rotation.z -= 0.01;
				box.position.x = 10 * Math.sin(box.position.z / 10);
				box.position.y = 10 * Math.cos(box.position.z / 10);
				break;
			case 5:
				box.rotation.x -= 0.01;
				box.rotation.y -= 0.01;
				box.position.x = 10 * Math.sin(-box.position.z / 10);
				box.position.y = 10 * Math.cos(-box.position.z / 10);
				break;
		}

		if (isBoxMove) {
			box.position.z += 0.05;
			if (box.position.z >= 200) {
				box.position.z = -200;
			}
		}

		// Update boxes using userData
		if (box.userData.selected) {
			var scale = box.scale.x;
			scale = scale < 10 ? scale + 0.5 : 10;
			box.scale.set(scale, (Math.abs(scale-10)), (Math.abs(scale-10)));

			if (scale >= 10) {
				scene.remove(box);
			}
		} else {
			if (box.userData.entering) {
				var scale = box.scale.x;
				scale = scale < 5 ? scale + 0.5 : 5;
				box.scale.set(scale, scale, scale);
			} else {
				var scale = box.scale.x;
				if (scale > 1) {
					scale = scale > 1 ? scale - 0.5 : 1;
					box.scale.set(scale, scale, scale);
				}
			}
		}
	}
}