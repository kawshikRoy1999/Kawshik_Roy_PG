import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

// --- Scene Setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020205);
scene.fog = new THREE.Fog(0x020205, 10, 50);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.y = 1.6; // Average eye height

const renderer = new THREE.WebGLRenderer({
    canvas: document.querySelector('#bg'),
    antialias: true
});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0px';
labelRenderer.domElement.style.pointerEvents = 'none';
labelRenderer.domElement.style.zIndex = '5';
document.body.appendChild(labelRenderer.domElement);

// --- Lighting ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
scene.add(ambientLight);

// --- Environment Construction (Neon Cyber Gallery) ---

// Floor
const gridHelper = new THREE.GridHelper(100, 100, 0x00f0ff, 0x00f0ff);
gridHelper.material.opacity = 0.2;
gridHelper.material.transparent = true;
scene.add(gridHelper);

const floorGeometry = new THREE.PlaneGeometry(100, 100);
const floorMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x050505, 
    roughness: 0.8,
    metalness: 0.2
});
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// Gallery Walls (Simple Boundary)
const wallMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x111111, 
    roughness: 0.9 
});

const boundaries = [];

function createWall(w, h, d, x, z) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, wallMaterial);
    mesh.position.set(x, h/2, z);
    scene.add(mesh);
    boundaries.push(mesh);
}

// Room size 40x40
createWall(40, 10, 1, 0, -20); // North
createWall(40, 10, 1, 0, 20);  // South
createWall(1, 10, 40, -20, 0); // West
createWall(1, 10, 40, 20, 0);  // East

// --- Exhibits (Pedestals) ---
const exhibits = [];
const pedestalMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x222222,
    roughness: 0.3,
    metalness: 0.8
});

function createExhibit(x, z, color, targetUIId, labelText) {
    // Pedestal
    const pedGeo = new THREE.BoxGeometry(2, 1, 2);
    const pedestal = new THREE.Mesh(pedGeo, pedestalMaterial);
    pedestal.position.set(x, 0.5, z);
    scene.add(pedestal);

    // Glowing Hologram Object
    const holoGeo = new THREE.OctahedronGeometry(0.8);
    const holoMat = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.8,
        wireframe: true
    });
    const hologram = new THREE.Mesh(holoGeo, holoMat);
    hologram.position.set(x, 2.5, z);
    
    // Add point light for glow effect
    const light = new THREE.PointLight(color, 20, 10);
    hologram.add(light);

    scene.add(hologram);

    // Invisible Hitbox for Raycasting
    const hitboxGeo = new THREE.BoxGeometry(3, 4, 3);
    const hitboxMat = new THREE.MeshBasicMaterial({ visible: false });
    const hitbox = new THREE.Mesh(hitboxGeo, hitboxMat);
    hitbox.position.set(x, 2, z);
    hitbox.userData = { targetUIId, hologram }; // Store UI ID and reference to hologram for animation
    scene.add(hitbox);
    
    // Label
    const div = document.createElement('div');
    div.className = 'exhibit-label';
    div.textContent = labelText;
    div.style.color = '#' + color.toString(16).padStart(6, '0');
    div.style.textShadow = `0 0 10px #${color.toString(16).padStart(6, '0')}`;
    const label = new CSS2DObject(div);
    label.position.set(x, 4, z); // Above the hologram
    scene.add(label);

    exhibits.push(hitbox);
}

// Map the exhibits in the room
createExhibit(0, -10, 0x00f0ff, 'ui-hero', 'PROFILE');       // North (Hero/Intro)
createExhibit(-10, 0, 0x7000ff, 'ui-about', 'SUMMARY');      // West (About)
createExhibit(10, 0, 0xff0055, 'ui-experience', 'EXPERIENCE');  // East (Experience)
createExhibit(-5, 10, 0x00ffaa, 'ui-skills', 'SKILLS');     // South-West (Skills)
createExhibit(5, 10, 0xffdd00, 'ui-education', 'EDUCATION');   // South-East (Education)

// --- Controls Setup ---
const controls = new PointerLockControls(camera, document.body);

const blocker = document.getElementById('blocker');
const instructions = document.getElementById('instructions');

instructions.addEventListener('click', function () {
    controls.lock();
});

controls.addEventListener('lock', function () {
    instructions.style.display = 'none';
    blocker.style.display = 'none';
});

controls.addEventListener('unlock', function () {
    blocker.style.display = 'flex';
    instructions.style.display = '';
});

scene.add(controls.getObject());

// --- Movement Logic ---
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;

const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

const onKeyDown = function (event) {
    switch (event.code) {
        case 'ArrowUp':
        case 'KeyW': moveForward = true; break;
        case 'ArrowLeft':
        case 'KeyA': moveLeft = true; break;
        case 'ArrowDown':
        case 'KeyS': moveBackward = true; break;
        case 'ArrowRight':
        case 'KeyD': moveRight = true; break;
    }
};

const onKeyUp = function (event) {
    switch (event.code) {
        case 'ArrowUp':
        case 'KeyW': moveForward = false; break;
        case 'ArrowLeft':
        case 'KeyA': moveLeft = false; break;
        case 'ArrowDown':
        case 'KeyS': moveBackward = false; break;
        case 'ArrowRight':
        case 'KeyD': moveRight = false; break;
    }
};

document.addEventListener('keydown', onKeyDown);
document.addEventListener('keyup', onKeyUp);

// --- Raycasting for Interaction ---
const raycaster = new THREE.Raycaster();
const centerVector = new THREE.Vector2(0, 0); // Always center of screen
let currentActiveUI = null;

function checkIntersections() {
    raycaster.setFromCamera(centerVector, camera);
    const intersects = raycaster.intersectObjects(exhibits, false);

    let foundTarget = null;

    if (intersects.length > 0) {
        // Ensure we are close enough to the exhibit (distance < 6)
        if (intersects[0].distance < 6) {
            foundTarget = intersects[0].object.userData.targetUIId;
        }
    }

    if (foundTarget !== currentActiveUI) {
        // Hide previous
        if (currentActiveUI) {
            const el = document.getElementById(currentActiveUI);
            if(el) {
                el.classList.remove('visible');
                setTimeout(() => { if(!el.classList.contains('visible')) el.style.display = 'none'; }, 300);
            }
        }
        
        // Show new
        currentActiveUI = foundTarget;
        if (currentActiveUI) {
            const el = document.getElementById(currentActiveUI);
            if(el) {
                el.style.display = 'block';
                // Trigger reflow
                void el.offsetWidth;
                el.classList.add('visible');
            }
        }
    }
}

// --- Animation Loop ---
let prevTime = performance.now();

function animate() {
    requestAnimationFrame(animate);

    const time = performance.now();

    if (controls.isLocked === true) {
        const delta = (time - prevTime) / 1000;

        // Apply friction
        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;

        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize();

        const speed = 40.0;

        if (moveForward || moveBackward) velocity.z -= direction.z * speed * delta;
        if (moveLeft || moveRight) velocity.x -= direction.x * speed * delta;

        // Calculate potential next position for collision check
        const nextX = controls.getObject().position.x + (velocity.x * delta);
        const nextZ = controls.getObject().position.z + (velocity.z * delta);

        // Simple Boundary Collision Check
        const limit = 18.5; // Wall is at 20, camera width ~1.5
        if (nextX < limit && nextX > -limit) {
            controls.moveRight(-velocity.x * delta);
        } else {
            velocity.x = 0;
        }
        
        if (nextZ < limit && nextZ > -limit) {
            controls.moveForward(-velocity.z * delta);
        } else {
            velocity.z = 0;
        }

        checkIntersections();
    }

    // Animate Holograms
    const elapsedTime = time / 1000;
    exhibits.forEach((hitbox, index) => {
        const holo = hitbox.userData.hologram;
        holo.rotation.y += 0.01;
        holo.rotation.x += 0.005;
        // Bobbing effect
        holo.position.y = 2.5 + Math.sin(elapsedTime * 2 + index) * 0.2;
    });

    prevTime = time;
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
}

animate();

// --- Resize Handler ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
});
