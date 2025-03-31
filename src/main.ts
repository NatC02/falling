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

// Preload all 3D models before starting the scene
function preloadAllModels() {
  // Create an interactive loading screen with progress bar
  // ... (loading screen creation logic)
  const loadingScreen = document.createElement('div');
  loadingScreen.id = 'loading-screen';
  loadingScreen.style.position = 'fixed';
  loadingScreen.style.top = '0';
  loadingScreen.style.left = '0';
  loadingScreen.style.width = '100%';
  loadingScreen.style.height = '100%';
  loadingScreen.style.background = 'rgba(0, 0, 0, 0.8)';
  loadingScreen.style.display = 'flex';
  loadingScreen.style.flexDirection = 'column';
  loadingScreen.style.justifyContent = 'center';
  loadingScreen.style.alignItems = 'center';
  loadingScreen.style.zIndex = '1000';

  const loadingText = document.createElement('div');
  loadingText.textContent = 'Loading assets...';
  loadingText.style.color = 'white';
  loadingText.style.fontSize = '24px';
  loadingText.style.marginBottom = '20px';

  const progressBarContainer = document.createElement('div');
  progressBarContainer.style.width = '70%';
  progressBarContainer.style.height = '20px';
  progressBarContainer.style.border = '1px solid white';
  progressBarContainer.style.borderRadius = '5px';

  const progressBar = document.createElement('div');
  progressBar.style.width = '0%';
  progressBar.style.height = '100%';
  progressBar.style.background = '#447EFF';
  progressBar.style.borderRadius = '4px';
  progressBar.style.transition = 'width 0.3s ease-in-out';

  progressBarContainer.appendChild(progressBar);
  loadingScreen.appendChild(loadingText);
  loadingScreen.appendChild(progressBarContainer);
  document.body.appendChild(loadingScreen);

  // Update progress bar function
  function updateProgress() {
    const progress = (loadedModelsCount / totalModelsToLoad) * 100;
    progressBar.style.width = progress + '%';
    loadingText.textContent = `Loading assets... ${Math.round(progress)}%`;

    // When all models are loaded, hide the loading screen and start the animation
    if (loadedModelsCount >= totalModelsToLoad) {
      setTimeout(() => {
        loadingScreen.style.opacity = 0;
        loadingScreen.style.transition = 'opacity 0.5s ease-in-out';
        setTimeout(() => {
          document.body.removeChild(loadingScreen);
        }, 500);
        preloadingComplete = true;
        console.log('All models preloaded successfully');
      }, 500); // Give a slight delay for user to see 100%
    }
  }

  // Start preloading all models
  const loader = new GLTFLoader();

  // First load the main model
  loader.load('/falling.glb', (gltf) => {
    // Store the preloaded model
    preloadedModels['/falling.glb'] = gltf;
    loadedModelsCount++;
    mainModelLoaded = true;

    // Add it to the scene immediately since it's the main model
    const gltfModel = gltf.scene;
    mainModel = gltfModel;
    scene.add(gltfModel);

    // Store the position of the main model for orbiting
    mainModelPosition.copy(gltfModel.position);

    if (gltf.animations && gltf.animations.length > 0) {
      mixer = new THREE.AnimationMixer(gltf.scene);
      const animationClip = gltf.animations[0];

      const action = mixer.clipAction(animationClip);
      action.setLoop(THREE.LoopRepeat); // Loop the animation repeatedly
      action.play();

      // Store the original time scale to maintain consistent speed
      originalAnimationTimeScale = action.getEffectiveTimeScale();

      // Ensure the time scale is preserved even after circuit shader initialization
      mixer.timeScale = originalAnimationTimeScale;
    }


    updateProgress();

    // Now preload all the character models
    const modelKeys = Object.keys(orbitConfig);
    modelKeys.forEach((key) => {
      const config = orbitConfig[key];
      loader.load(config.fileName, (gltf) => {
        // Store the preloaded model
        preloadedModels[config.fileName] = gltf;
        loadedModelsCount++;
        updateProgress();
      },
        // Progress callback
        (xhr) => {
          // We could show individual model loading progress here if needed
        },
        // Error callback
        (error) => {
          console.error(`Error loading ${config.fileName}:`, error);
          // Still increment to avoid hanging the loading screen
          loadedModelsCount++;
          updateProgress();
        });
    });
  },
    // Progress callback for main model
    (xhr) => {
      // We could show main model loading progress here if needed
    },
    // Error callback for main model 
    (error) => {
      console.error('Error loading main model:', error);
      loadedModelsCount++;
      updateProgress();
    });
}

// Load new models when camera reaches specific position
function loadNewModels() {
  if (newModelsLoaded) return;

  newModelsLoaded = true;
  console.log('Preparing orbital character models...');

  // Start background music with fade-in
  audioManager.play();

  // Prepare and position orbital models
  // Store initial camera position for calculations
  previousCameraPosition.copy(camera.position);

  // Use preloaded models instead of loading them again
  const modelKeys = Object.keys(orbitConfig);

  modelKeys.forEach((key, index) => {
    const config = orbitConfig[key];

    // Check if we have this model preloaded
    if (preloadedModels[config.fileName]) {
      const gltf = preloadedModels[config.fileName];

      // Initial position on the orbit (spaced evenly around the circle)
      const angle = (index / modelKeys.length) * Math.PI * 2;
      const x = Math.cos(angle) * config.radius + mainModelPosition.x;
      const z = Math.sin(angle) * config.radius + mainModelPosition.z;

      // Clone the preloaded model to avoid modifying the original
      const model = gltf.scene.clone();

      // Set initial position on the orbit path
      model.position.set(x, config.height, z);
      model.scale.set(1.8, 1.8, 1.8); // Adjust scale as needed

      // Store orbit parameters and collision parameters in userData for animation
      model.userData.orbitRadius = config.radius;
      model.userData.orbitSpeed = config.speed;
      model.userData.orbitHeight = config.height;
      model.userData.orbitAngle = angle; // Starting angle
      model.userData.collisionRadius = config.collisionRadius;
      model.userData.fadeState = config.fadeState;
      model.userData.fadeProgress = config.fadeProgress;
      model.userData.lastCollisionTime = config.lastCollisionTime;
      model.userData.configKey = key; // Store reference to the config key

      // Make all materials translucent with 0 opacity initially (for fade in)
      model.traverse((node) => {
        if (node.isMesh && node.material) {
          if (Array.isArray(node.material)) {
            node.material.forEach(material => {
              material = material.clone();
              material.transparent = true;
              material.opacity = 0;
            });
          } else {
            node.material = node.material.clone();
            node.material.transparent = true;
            node.material.opacity = 0;
          }
        }
      });

      // Add model to scene and to our tracking array
      scene.add(model);
      newModels.push(model);

      // Set up animation if it exists
      if (gltf.animations && gltf.animations.length > 0) {
        const newMixer = new THREE.AnimationMixer(model);
        const animationClip = gltf.animations[0];

        const action = newMixer.clipAction(animationClip);
        action.setLoop(THREE.LoopRepeat);
        action.play();

        // Store the mixer in the model for updating
        model.userData.mixer = newMixer;
      }
    } else {
      console.error(`Model ${config.fileName} was not preloaded`);
    }
  });
}

// Detect potential collisions between models
function checkCollision(modelA, modelB) {
  const posA = modelA.position.clone();
  const posB = modelB.position.clone();

  // Calculate distance between models and determine if they're too close
  posA.y = 0;
  posB.y = 0;
  const distance = posA.distanceTo(posB);

  // Get combined collision radius
  const combinedRadius = modelA.userData.collisionRadius + modelB.userData.collisionRadius;

  // Return true if they are colliding or about to collide
  return distance < combinedRadius;
}

// Handle model interactions when collision occurs
function handleCollision(modelA, modelB) {
  // Determine which model is moving faster
  const speedA = Math.abs(modelA.userData.orbitSpeed);
  const speedB = Math.abs(modelB.userData.orbitSpeed);

  // Select the faster model to fade out
  const fasterModel = speedA > speedB ? modelA : modelB;

  // Calculate time since last collision
  const currentTime = clock.getElapsedTime();
  const timeSinceLastCollision = currentTime - fasterModel.userData.lastCollisionTime;

  // Only fade out if the model has been visible for minimum time
  if (fasterModel.userData.fadeState === 'visible' && timeSinceLastCollision > minVisibilityTime) {
    fasterModel.userData.fadeState = 'fading-out';
    fasterModel.userData.fadeProgress = 0;
    fasterModel.userData.lastCollisionTime = currentTime;
    console.log(`Collision detected! ${fasterModel.userData.configKey} is fading out.`);
  }
}

// Manage model visibility and fade animations
function updateModelFade(model, deltaTime) {
  const fadeState = model.userData.fadeState;
  let opacity = newModelsOpacity; // Default opacity when fully visible

  if (fadeState === 'fading-out') {
    // Progress the fade-out animation
    model.userData.fadeProgress += deltaTime / fadeOutDuration;

    if (model.userData.fadeProgress >= 1.0) {
      // Fade out complete, now invisible
      model.userData.fadeState = 'invisible';
      model.userData.fadeProgress = 0;
      opacity = 0;

      // Ensure it's completely hidden by removing from scene temporarily
      if (model.parent) {
        model.userData.originalParent = model.parent;
        model.parent.remove(model);
      }
    } else {
      // Interpolate opacity from visible to invisible
      opacity = newModelsOpacity * (1.0 - model.userData.fadeProgress);
    }
  }
  else if (fadeState === 'invisible') {
    // Stay invisible until collision is resolved
    // We don't automatically transition to fading-in here
    // The collision detection system will determine when to start fading back in
    opacity = 0;
  }
  else if (fadeState === 'fading-in') {
    // If the model was completely removed from the scene, add it back first
    if (model.userData.originalParent && !model.parent) {
      model.userData.originalParent.add(model);
      model.userData.originalParent = null;
    }

    // Progress the fade-in animation
    model.userData.fadeProgress += deltaTime / fadeInDuration;

    if (model.userData.fadeProgress >= 1.0) {
      // Fade in complete, now visible
      model.userData.fadeState = 'visible';
      model.userData.fadeProgress = 0;
      opacity = newModelsOpacity;
    } else {
      // Interpolate opacity from invisible to visible
      opacity = newModelsOpacity * model.userData.fadeProgress;
    }
  }

  // Apply the calculated opacity to all materials in the model
  // If model is supposed to be invisible, hide it completely by toggling visibility
  const shouldBeVisible = opacity > 0;
  model.visible = shouldBeVisible;

  // Still update the opacity for smooth transitions when visible
  if (shouldBeVisible) {
    model.traverse((node) => {
      if (node.isMesh && node.material) {
        if (Array.isArray(node.material)) {
          node.material.forEach(material => {
            material.opacity = opacity;
          });
        } else {
          node.material.opacity = opacity;
        }
      }
    });
  }
}

// Add lighting to create depth and atmosphere
const blueLight = new THREE.DirectionalLight(0x447EFF, 2); // Blue color approximating 1000K
blueLight.position.set(2, 3, 2); // Diagonal position from top
scene.add(blueLight);

// Add ambient light to prevent complete darkness
const ambientLight = new THREE.AmbientLight(0x404040, 0.5); // Soft ambient light
scene.add(ambientLight);

// Set up animation mixers
let mixer = null; // For animations
let mainModel = null;

// Start preloading all models
preloadAllModels();

