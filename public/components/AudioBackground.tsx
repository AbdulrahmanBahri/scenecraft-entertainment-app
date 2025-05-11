// components/AudioBackground.tsx
import { useState, useEffect, useRef } from 'react';
import { detectEmotion, emotionToTrack } from '../utils/emotionDetection';
import React from 'react';

interface AudioBackgroundProps {
  sceneText: string;
  isActive: boolean;
  volume?: number;
  crossFadeDuration?: number; // Duration for crossfade in milliseconds
}

const AudioBackground: React.FC<AudioBackgroundProps> = ({
  sceneText,
  isActive,
  volume = 0.2, // Default low volume for background
  crossFadeDuration = 2000 // Default 2 second crossfade
}) => {
  const [emotion, setEmotion] = useState<string>('default');
  const [audioTrack, setAudioTrack] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  
  // Use two audio elements for crossfading
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const nextAudioRef = useRef<HTMLAudioElement | null>(null);
  
  // Fade controller references
  const fadeOutId = useRef<number | null>(null);
  const fadeInId = useRef<number | null>(null);
  
  // Add reference to store current volume to avoid interrupting during volume changes
  const currentVolumeRef = useRef<number>(volume);
  
  // Add reference to track loading state
  const isLoadingTrack = useRef<boolean>(false);

  // Detect emotion when scene text changes
  useEffect(() => {
    if (sceneText) {
      const detectedEmotion = detectEmotion(sceneText);
      setEmotion(detectedEmotion);
    }
  }, [sceneText]);

  // Update audio track when emotion changes
  useEffect(() => {
    if (emotion) {
      const track = emotionToTrack[emotion as keyof typeof emotionToTrack] || emotionToTrack.default;
      setAudioTrack(track);
    }
  }, [emotion]);

  // Initialize audio elements only once
  useEffect(() => {
    if (!currentAudioRef.current) {
      const audioElement = new Audio();
      audioElement.loop = true;
      audioElement.volume = 0;
      audioElement.preload = 'auto';
      currentAudioRef.current = audioElement;
    }
    
    if (!nextAudioRef.current) {
      const audioElement = new Audio();
      audioElement.loop = true;
      audioElement.volume = 0;
      audioElement.preload = 'auto';
      nextAudioRef.current = audioElement;
    }
    
    // Cleanup on unmount
    return () => {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current.src = '';
      }
      
      if (nextAudioRef.current) {
        nextAudioRef.current.pause();
        nextAudioRef.current.src = '';
      }
      
      if (fadeOutId.current) {
        cancelAnimationFrame(fadeOutId.current);
      }
      
      if (fadeInId.current) {
        cancelAnimationFrame(fadeInId.current);
      }
    };
  }, []);

  // Update volume when volume prop changes
  useEffect(() => {
    currentVolumeRef.current = volume;
    
    // Only update if audio is already playing
    if (isPlaying && currentAudioRef.current) {
      // Only adjust volume, don't reload
      fadeIn(currentAudioRef.current, currentAudioRef.current.volume, volume, crossFadeDuration / 2);
    }
  }, [volume, crossFadeDuration]);

  // Handle track changes with crossfade
  useEffect(() => {
    if (!audioTrack || !isActive) return;
    if (isLoadingTrack.current) return; // Prevent multiple simultaneous track changes
    
    // If both audio elements exist, proceed with logic
    if (currentAudioRef.current && nextAudioRef.current) {
      // For first track initialization
      if (currentAudioRef.current.src === '') {
        isLoadingTrack.current = true;
        currentAudioRef.current.src = audioTrack;
        
        // Add event listener for when audio is ready
        const handleCanPlay = () => {
          if (isActive && currentAudioRef.current) {
            currentAudioRef.current.play()
              .then(() => {
                setIsPlaying(true);
                fadeIn(currentAudioRef.current!, 0, currentVolumeRef.current, crossFadeDuration);
                isLoadingTrack.current = false;
              })
              .catch(error => {
                console.error("Audio playback prevented:", error);
                isLoadingTrack.current = false;
              });
          } else {
            isLoadingTrack.current = false;
          }
          
          currentAudioRef.current?.removeEventListener('canplaythrough', handleCanPlay);
        };
        
        currentAudioRef.current.addEventListener('canplaythrough', handleCanPlay);
        currentAudioRef.current.load();
      }
      // For subsequent track changes
      else if (currentAudioRef.current.src !== audioTrack && currentAudioRef.current.src !== '') {
        isLoadingTrack.current = true;
        
        // Set up next audio with new track
        nextAudioRef.current.src = audioTrack;
        
        // Add event listener for when next audio is ready
        const handleCanPlay = () => {
          if (isActive) {
            // Start crossfade only if scene is active
            crossFade()
              .finally(() => {
                isLoadingTrack.current = false;
              });
          } else {
            isLoadingTrack.current = false;
          }
          
          nextAudioRef.current?.removeEventListener('canplaythrough', handleCanPlay);
        };
        
        nextAudioRef.current.addEventListener('canplaythrough', handleCanPlay);
        nextAudioRef.current.load();
      }
    }
  }, [audioTrack, isActive, crossFadeDuration]);

  // Handle scene active state changes
  useEffect(() => {
    // If scene becomes active and we have audio loaded but not playing
    if (isActive && currentAudioRef.current && currentAudioRef.current.src !== '' && !isPlaying) {
      currentAudioRef.current.play()
        .then(() => {
          setIsPlaying(true);
          fadeIn(currentAudioRef.current!, currentAudioRef.current!.volume, currentVolumeRef.current, crossFadeDuration);
        })
        .catch(error => {
          console.error("Audio playback prevented:", error);
        });
    } 
    // If scene becomes inactive and we have audio playing
    else if (!isActive && currentAudioRef.current && isPlaying) {
      fadeOut(currentAudioRef.current, crossFadeDuration)
        .then(() => {
          currentAudioRef.current?.pause();
          setIsPlaying(false);
        });
    }
  }, [isActive, crossFadeDuration]);

  // Crossfade between audio tracks
  const crossFade = async (): Promise<void> => {
    if (!currentAudioRef.current || !nextAudioRef.current) {
      return Promise.resolve();
    }
    
    return new Promise((resolve, reject) => {
        try {
          // Start playing next track at volume 0
          if (nextAudioRef.current) {
            nextAudioRef.current.volume = 0;
            const playPromise = nextAudioRef.current.play();
      
            if (playPromise !== undefined) {
              playPromise
                .then(() => {
                  // Fade out current track while fading in next track
                  fadeOut(currentAudioRef.current!, crossFadeDuration);
                  fadeIn(nextAudioRef.current!, 0, currentVolumeRef.current, crossFadeDuration);
      
                  // After crossfade duration, swap references and clean up
                  setTimeout(() => {
                    if (currentAudioRef.current) {
                      currentAudioRef.current.pause();
                      currentAudioRef.current.currentTime = 0;
                    }
      
                    // Swap references
                    const temp = currentAudioRef.current;
                    currentAudioRef.current = nextAudioRef.current;
                    nextAudioRef.current = temp;
      
                    // Reset old audio
                    if (nextAudioRef.current) {
                      nextAudioRef.current.pause();
                      nextAudioRef.current.currentTime = 0;
                      nextAudioRef.current.volume = 0;
                      nextAudioRef.current.src = ''; // Clear the source to prevent conflicts
                    }
      
                    resolve();
                  }, crossFadeDuration);
                })
                .catch(error => {
                  console.error("Crossfade play error:", error);
                  reject(error);
                });
            } else {
              resolve();
            }
          } else {
            resolve(); // If nextAudioRef is null or undefined
          }
        } catch (error) {
          console.error("Crossfade error:", error);
          reject(error);
        }
      });      
  };

  // Fade in audio element
  const fadeIn = (
    audioElement: HTMLAudioElement, 
    startVolume: number, 
    targetVolume: number, 
    duration: number
  ) => {
    if (fadeInId.current) {
      cancelAnimationFrame(fadeInId.current);
    }
    
    const startTime = performance.now();
    audioElement.volume = startVolume;
    
    const updateVolume = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Calculate new volume with easing
      audioElement.volume = startVolume + (targetVolume - startVolume) * easeInOutQuad(progress);
      
      if (progress < 1) {
        fadeInId.current = requestAnimationFrame(updateVolume);
      } else {
        fadeInId.current = null;
      }
    };
    
    fadeInId.current = requestAnimationFrame(updateVolume);
  };

  // Fade out audio element
  const fadeOut = (
    audioElement: HTMLAudioElement, 
    duration: number
  ): Promise<void> => {
    return new Promise(resolve => {
      if (fadeOutId.current) {
        cancelAnimationFrame(fadeOutId.current);
      }
      
      const startTime = performance.now();
      const startVolume = audioElement.volume;
      
      const updateVolume = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Calculate new volume with easing
        audioElement.volume = startVolume * (1 - easeInOutQuad(progress));
        
        if (progress < 1) {
          fadeOutId.current = requestAnimationFrame(updateVolume);
        } else {
          fadeOutId.current = null;
          resolve();
        }
      };
      
      fadeOutId.current = requestAnimationFrame(updateVolume);
    });
  };

  // Easing function for smoother volume transitions
  const easeInOutQuad = (t: number): number => {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  };

  return (
    <div className="audio-background-component">
      {/* Optional UI for debugging or feedback */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-gray-400 mt-1">
          Background: {emotion}
        </div>
      )}
    </div>
  );
};

export default AudioBackground;