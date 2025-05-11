// components/AudioControls.tsx
import React from 'react';
import { useState, useEffect, useRef } from 'react';

interface AudioControlsProps {
  audioUrl: string | null;
  isLoading: boolean;
  hasError: boolean;
  onRetry: () => void;
  autoplay?: boolean;
}

const AudioControls = ({ audioUrl, isLoading, hasError, onRetry, autoplay = false }: AudioControlsProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [autoplayAttempted, setAutoplayAttempted] = useState(false);
  
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const animationRef = useRef<number | undefined>(undefined);

  // Create or update audio element when URL changes
  useEffect(() => {
    // If we don't have a URL, clean up any existing audio element
    if (!audioUrl) {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        setIsPlaying(false);
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      }
      return;
    }

    // Create new audio element for this URL
    const audioElement = new Audio(audioUrl);
    audioElement.volume = volume;
    
    // Set up event listeners
    audioElement.addEventListener('loadedmetadata', () => {
      setDuration(audioElement.duration);
    });
    
    audioElement.addEventListener('timeupdate', () => {
      setCurrentTime(audioElement.currentTime);
    });
    
    audioElement.addEventListener('ended', () => {
      setIsPlaying(false);
      setCurrentTime(0);
    });
    
    audioElement.addEventListener('play', () => {
      setIsPlaying(true);
    });
    
    audioElement.addEventListener('pause', () => {
      setIsPlaying(false);
    });
    
    // Store reference to audio element
    audioElementRef.current = audioElement;
    
    // Reset autoplay attempted flag when URL changes
    setAutoplayAttempted(false);
    
    // Clean up function
    return () => {
      audioElement.pause();
      audioElement.remove();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [audioUrl]);

  // Update volume when it changes
  useEffect(() => {
    if (audioElementRef.current) {
      audioElementRef.current.volume = volume;
    }
  }, [volume]);

  // Handle autoplay state changes
  useEffect(() => {
    // Only attempt autoplay if we have an audio element, autoplay is enabled,
    // we haven't already attempted autoplay for this audio URL, and we're not loading
    if (audioElementRef.current && audioUrl && autoplay && !autoplayAttempted && !isLoading) {
      // We're about to attempt autoplay, so mark it as attempted first to prevent re-triggering
      setAutoplayAttempted(true);
      
      // Short timeout to ensure state update completes before playing
      setTimeout(() => {
        if (audioElementRef.current) {
          const playPromise = audioElementRef.current.play();
          
          // Handle play promise safely
          if (playPromise !== undefined) {
            playPromise.catch(error => {
              console.log('Autoplay prevented:', error);
            });
          }
        }
      }, 10);
    }
  // Simplified dependency array to prevent excessive re-renders
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUrl, autoplay]);

  const togglePlayPause = () => {
    if (!audioUrl || isLoading || hasError) {
      onRetry();
      return;
    }

    if (!audioElementRef.current) return;
    
    if (isPlaying) {
      audioElementRef.current.pause();
    } else {
      // Use a safe way to handle play
      const playPromise = audioElementRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error("Error playing audio:", error);
        });
      }
    }
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioElementRef.current) return;
    
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    audioElementRef.current.currentTime = newTime;
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 rounded-md bg-gray-100">
        <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm text-gray-600">Generating audio...</span>
      </div>
    );
  }

  if (hasError) {
    return (
      <button 
        onClick={onRetry}
        className="flex items-center space-x-2 px-3 py-2 rounded-md bg-red-50 text-red-600 hover:bg-red-100"
      >
        <span>🔄</span>
        <span className="text-sm">Retry Audio Generation</span>
      </button>
    );
  }

  if (!audioUrl) {
    return (
      <button 
        onClick={onRetry}
        className="flex items-center space-x-2 px-3 py-2 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100"
      >
        <span>🔊</span>
        <span className="text-sm">Generate Narration</span>
      </button>
    );
  }

  return (
    <div className="w-full bg-gray-50 rounded-md p-3 shadow-sm">
      <div className="flex items-center space-x-3 mb-2">
        <button
          onClick={togglePlayPause}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-purple-600 text-white hover:bg-purple-700"
        >
          {isPlaying ? '⏸️' : '▶️'}
        </button>
        
        <div className="flex-1">
          <input
            type="range"
            min="0"
            max={duration || 100}
            value={currentTime}
            onChange={handleTimeChange}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${(currentTime / (duration || 1)) * 100}%, #e5e7eb ${(currentTime / (duration || 1)) * 100}%, #e5e7eb 100%)`
            }}
          />
        </div>
        
        <span className="text-xs text-gray-500 w-16 text-right">
          {formatTime(currentTime)} / {formatTime(duration || 0)}
        </span>
      </div>
      
      <div className="flex items-center space-x-2">
        <span className="text-xs">🔈</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={volume}
          onChange={handleVolumeChange}
          className="w-24 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${volume * 100}%, #e5e7eb ${volume * 100}%, #e5e7eb 100%)`
          }}
        />
        <span className="text-xs">🔊</span>
      </div>
    </div>
  );
};

export default AudioControls;