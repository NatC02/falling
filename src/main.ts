import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import { AudioManager } from './audioManager';

import { circuitShader } from './circuitShader';

// Tracks the interactive background with circuit-like shader effect
let circuitBackground: THREE.Mesh | null = null;
let circuitMaterial: THREE.ShaderMaterial | null = null;
let circuitBackgroundEnabled = false;
let circuitBackgroundOpacity = 0.0; // Tracks fade-in progress of background

// Stores the original animation speed to maintain consistent playback
let originalAnimationTimeScale = 1.0;

// Initialize the dynamic, shader-based circuit background
function setupCircuitBackground() {
  if (circuitBackground) return; // Prevent creating multiple backgrounds

  console.log('Setting up interactive circuit background shader');

  // Create a custom shader material with time and opacity controls
  circuitMaterial = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 }, // Animates shader over time
      resolution: { value: new THREE.Vector2(sizes.width, sizes.height) }, // Adapts to screen size
      opacity: { value: 0.0 } // Starts completely transparent
    },
    vertexShader: circuitShader.vertexShader,
    fragmentShader: circuitShader.fragmentShader,
    side: THREE.BackSide, // Renders inside a box for immersive effect
    transparent: true, // Enables smooth fade-in/out
    depthWrite: false  // Prevents visual artifacts with other scene elements
  });

  // Use a box geometry to create a fully surrounding background
  const geometry = new THREE.BoxGeometry(20, 20, 20);
  circuitBackground = new THREE.Mesh(geometry, circuitMaterial);

  // Add to scene but initially invisible
  scene.add(circuitBackground);
  circuitBackgroundEnabled = true;

  // Ensures background always follows the camera
  circuitBackground.onBeforeRender = function () {
    this.position.copy(camera.position);
  };

  console.log('Circuit background shader successfully initialized');
}

// Manages background music with fade-in effect
const audioManager = new AudioManager('/theme.mp3', {
  maxVolume: 0.5,        // Sets a moderate maximum volume
  fadeInDuration: 10000  // Gradually increases volume over 10 seconds
});

// Get the canvas element for rendering
const canvas = document.querySelector('canvas.webgl');

// Set up the 3D scene with camera, renderer, and initial configuration
const scene = new THREE.Scene();

// Define screen sizes for responsive rendering
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

// Create perspective camera with wide field of view
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100);
camera.position.z = 3;
camera.position.x = 0;
camera.position.y = 6;
scene.add(camera);

// Set up WebGL renderer for high-quality graphics
const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Configure orbit controls for interactive camera movement
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// Restrict camera interaction for a more controlled experience
controls.enablePan = false; // Disable panning
controls.minPolarAngle = Math.PI * 0.5 - THREE.MathUtils.degToRad(15); // Limit vertical rotation
controls.maxPolarAngle = Math.PI * 0.5 + THREE.MathUtils.degToRad(15);
controls.minAzimuthAngle = -Math.PI * 0.5; // Limit horizontal rotation
controls.maxAzimuthAngle = Math.PI * 0.5;
controls.minDistance = 3;  // Minimum zoom distance
controls.maxDistance = 4;  // Maximum zoom distance

// Tracking variables for scene loading and model management
let newModelsLoaded = false;
let newModelsOpacity = 0;
let newModels = [];
let mainModelPosition = new THREE.Vector3(); // Stores main model's position for orbital calculations
let previousCameraPosition = new THREE.Vector3();

// Preloading state management
let preloadingComplete = false;
let mainModelLoaded = false;
let totalModelsToLoad = 8; // Main model + 7 character models
let loadedModelsCount = 0;
let preloadedModels = {}; // Stores preloaded 3D models by filename

// Parameters for model interactions and visibility
const collisionThreshold = 2.0; // Distance to consider models as colliding
const fadeOutDuration = 0.5; // Time to fade out a model
const fadeInDuration = 0.5; // Time to fade in a model
const minVisibilityTime = 1.0; // Minimum time a model should remain visible

// Configuration for orbital model behaviors
const orbitConfig = {
  model1: {
    radius: 2,    // Distance from center
    speed: 0.3,   // Rotation speed
    height: 1,   // Vertical offset from center
    fileName: '/character/colin2.glb', // Different model file
    collisionRadius: 0.6, // Collision radius for this model
    fadeState: 'visible', // Current fade state: 'visible', 'fading-out', 'invisible', 'fading-in'
    fadeProgress: 0,      // Progress of current fade (0-1)
    lastCollisionTime: 0  // Timestamp of last collision
  },
  model2: {
    radius: 2,
    speed: 0.4,
    height: 1,
    fileName: '/character/mr-toad2.glb', // Different model file
    collisionRadius: 0.6,
    fadeState: 'visible',
    fadeProgress: 0,
    lastCollisionTime: 0
  },
  model3: {
    radius: 2,
    speed: 0.2,
    height: 1,
    fileName: '/character/snow-white2.glb', // Different model file
    collisionRadius: 0.6,
    fadeState: 'visible',
    fadeProgress: 0,
    lastCollisionTime: 0
  },
  // Added new models
  model4: {
    radius: 2.2,   // Slightly different radius to create varied orbits
    speed: 0.35,  // Speed within limit of 3
    height: 1,
    fileName: '/character/beauty2.glb', // New model file
    collisionRadius: 0.6,
    fadeState: 'visible',
    fadeProgress: 0,
    lastCollisionTime: 0
  },
  model5: {
    radius: 2.4,
    speed: 0.45,  // Speed within limit of 3
    height: 1,
    fileName: '/character/bufkin2.glb', // New model file
    collisionRadius: 0.6,
    fadeState: 'visible',
    fadeProgress: 0,
    lastCollisionTime: 0
  },
  model6: {
    radius: 2.6,
    speed: 0.25,  // Speed within limit of 3
    height: 1,
    fileName: '/character/beast2.glb', // New model file
    collisionRadius: 0.6,
    fadeState: 'visible',
    fadeProgress: 0,
    lastCollisionTime: 0
  },
  model7: {
    radius: 2.8,
    speed: 0.5,   // Speed within limit of 3
    height: 1,
    fileName: '/character/bloody-mary2.glb', // New model file
    collisionRadius: 0.6,
    fadeState: 'visible',
    fadeProgress: 0,
    lastCollisionTime: 0
  }
};

