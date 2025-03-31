/**
 * AudioManager class for handling background music with fade-in effects
 */
export class AudioManager {
    private audioContext: AudioContext | null = null;
    private audioElement: HTMLAudioElement | null = null;
    private gainNode: GainNode | null = null;
    private audioSource: MediaElementAudioSourceNode | null = null;
    private fadeInterval: number | null = null;
    private isPlaying: boolean = false;
    private audioLoaded: boolean = false;
    private volume: number = 0;
    private maxVolume: number = 0.7; // Maximum volume to reach (0-1)
    private fadeInDuration: number = 5000; // Duration of fade-in in milliseconds
  
    /**
     * Initialize the audio manager with the provided audio file
     * @param audioFile - Path to the audio file
     * @param maxVolume - Optional maximum volume (0-1)
     * @param fadeInDuration - Optional fade-in duration in milliseconds
     */
    constructor(
      private audioFile: string,
      options?: { maxVolume?: number; fadeInDuration?: number }
    ) {
      if (options?.maxVolume !== undefined) {
        this.maxVolume = Math.max(0, Math.min(1, options.maxVolume)); // Clamp between 0-1
      }
      
      if (options?.fadeInDuration !== undefined) {
        this.fadeInDuration = options.fadeInDuration;
      }
      
      // Preload the audio file
      this.preloadAudio();
    }
  
    /**
     * Preload the audio file to minimize delay when playback is triggered
     */
    private preloadAudio(): void {
      try {
        this.audioElement = new Audio();
        this.audioElement.src = this.audioFile;
        this.audioElement.loop = true;
        this.audioElement.load();
        
        // Set up event listener for when audio is loaded
        this.audioElement.addEventListener('canplaythrough', () => {
          this.audioLoaded = true;
          console.log('Audio file loaded and ready to play');
        });
        
        // Error handling
        this.audioElement.addEventListener('error', (e) => {
          console.error('Error loading audio file:', e);
        });
      } catch (error) {
        console.error('Error preloading audio:', error);
      }
    }
  
    /**
     * Initialize the Web Audio API context
     */
    private initAudio(): void {
      if (this.audioContext) return; // Already initialized
      
      try {
        // Create audio context
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        if (!this.audioElement || !this.audioContext) {
          throw new Error('Audio initialization failed');
        }
        
        // Create gain node for volume control
        this.gainNode = this.audioContext.createGain();
        
        // Connect audio element to the audio context
        this.audioSource = this.audioContext.createMediaElementSource(this.audioElement);
        
        // Connect nodes: source -> gain -> output
        this.audioSource.connect(this.gainNode);
        this.gainNode.connect(this.audioContext.destination);
        
        // Set initial volume to 0
        this.volume = 0;
        if (this.gainNode) {
          this.gainNode.gain.value = 0;
        }
        
        console.log('Audio context initialized successfully');
      } catch (error) {
        console.error('Failed to initialize audio context:', error);
      }
    }
  
    /**
     * Start playing the audio with a gradual fade-in effect
     */
    public play(): void {
      if (this.isPlaying) return; // Already playing
      
      // Wait until audio is loaded
      if (!this.audioLoaded) {
        console.log('Audio not loaded yet, waiting...');
        const checkLoaded = setInterval(() => {
          if (this.audioLoaded) {
            clearInterval(checkLoaded);
            this.startPlayback();
          }
        }, 100);
        return;
      }
      
      this.startPlayback();
    }
    
    /**
     * Internal method to start playback and fade-in
     */
    private startPlayback(): void {
      // Initialize audio context (needs to be done after user interaction in some browsers)
      this.initAudio();
      
      if (!this.audioElement || !this.gainNode || !this.audioContext) {
        console.error('Audio system not properly initialized');
        return;
      }
      
      // Resume audio context if it's suspended (browser autoplay policy)
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      
      // Start playback
      this.audioElement.play().catch(error => {
        console.error('Error starting audio playback:', error);
        return;
      });
      
      this.isPlaying = true;
      
      // Start fade-in effect
      this.volume = 0;
      this.gainNode.gain.value = 0;
      
      // Calculate fade interval step
      const steps = Math.ceil(this.fadeInDuration / 1000); // Update every 50ms
      const volumeIncrement = this.maxVolume / steps;
      
      // Clear any existing fade interval
      if (this.fadeInterval !== null) {
        clearInterval(this.fadeInterval);
      }
      
      // Start new fade interval
      this.fadeInterval = window.setInterval(() => {
        if (this.volume < this.maxVolume) {
          this.volume = Math.min(this.maxVolume, this.volume + volumeIncrement);
          if (this.gainNode) {
            this.gainNode.gain.value = this.volume;
          }
        } else {
          // Clear interval once we've reached the target volume
          if (this.fadeInterval !== null) {
            clearInterval(this.fadeInterval);
            this.fadeInterval = null;
          }
        }
      }, 50);
      
      console.log('Audio playback started with fade-in');
    }
  
    /**
     * Pause the audio playback
     */
    public pause(): void {
      if (!this.isPlaying || !this.audioElement) return;
      
      this.audioElement.pause();
      this.isPlaying = false;
      
      // Clear fade interval if active
      if (this.fadeInterval !== null) {
        clearInterval(this.fadeInterval);
        this.fadeInterval = null;
      }
      
      console.log('Audio playback paused');
    }
  
    /**
     * Stop the audio playback and reset
     */
    public stop(): void {
      if (!this.audioElement) return;
      
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
      this.isPlaying = false;
      
      // Clear fade interval if active
      if (this.fadeInterval !== null) {
        clearInterval(this.fadeInterval);
        this.fadeInterval = null;
      }
      
      // Reset volume to 0
      this.volume = 0;
      if (this.gainNode) {
        this.gainNode.gain.value = 0;
      }
      
      console.log('Audio playback stopped');
    }
  
    /**
     * Set the volume immediately (0-1)
     */
    public setVolume(value: number): void {
      this.volume = Math.max(0, Math.min(1, value)); // Clamp between 0-1
      
      if (this.gainNode) {
        this.gainNode.gain.value = this.volume;
      }
    }
  
    /**
     * Clean up resources when no longer needed
     */
    public dispose(): void {
      this.stop();
      
      // Disconnect audio nodes
      if (this.audioSource) {
        this.audioSource.disconnect();
      }
      
      if (this.gainNode) {
        this.gainNode.disconnect();
      }
      
      // Close audio context
      if (this.audioContext && this.audioContext.state !== 'closed') {
        this.audioContext.close();
      }
      
      // Remove references
      this.audioSource = null;
      this.gainNode = null;
      this.audioContext = null;
      this.audioElement = null;
      
      console.log('Audio manager resources cleaned up');
    }
  }