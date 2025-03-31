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
