// components/Scene.tsx
import { useState, useEffect, useRef } from "react";
import AudioControls from "./AudioControls";
import React from 'react';
import AudioBackground from "./AudioBackground"; 

interface SceneProps {
  script: string;
  userPrompt: string;
  selectedVoice?: string;
  enableBackgroundMusic?: boolean;
}

interface SceneData {
  text: string;
  imageUrl: string | null;
  audioUrl: string | null;
  imageLoading: boolean;
  audioLoading: boolean;
  imageError: boolean;
  audioError: boolean;
  imageReady: boolean;
}

export default function Scene({ 
  script, 
  userPrompt, 
  selectedVoice = "Matthew",
  enableBackgroundMusic = true
}: SceneProps) {
  const [currentScene, setCurrentScene] = useState(0);
  const [scenes, setScenes] = useState<SceneData[]>([]);
  const [generating, setGenerating] = useState(false);
  const [autoplayAudio, setAutoplayAudio] = useState(true);
  const [navBlocked, setNavBlocked] = useState(false);
  const [audioReadyToPlay, setAudioReadyToPlay] = useState(false);
  
  // Background music control state
  const [backgroundMusicVolume, setBackgroundMusicVolume] = useState(0.2);
  // Add a ref to track volume changes
  const volumeChangeTimeoutRef = useRef<number | null>(null);
  
  useEffect(() => {
    if (script) {
      // Split by double line breaks or periods for basic scenes
      const rawScenes = script.split(/\n\n|(?<=\.) /).filter((s) => s.trim() !== "");
      
      // Initialize scene data with text but no images or audio yet
      const initialScenes = rawScenes.map(text => ({
        text,
        imageUrl: null,
        audioUrl: null,
        imageLoading: false,
        audioLoading: false,
        imageError: false,
        audioError: false,
        imageReady: false
      }));
      
      setScenes(initialScenes);
      setCurrentScene(0); // Reset scene on new script
      setAudioReadyToPlay(false); // Reset audio ready state
    }
  }, [script]);

  // This effect runs when the current scene changes
  useEffect(() => {
    // Reset audio ready state when changing scenes
    setAudioReadyToPlay(false);
    
    // Handle image and audio generation for new scene
    handleSceneResources();
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentScene]);
  
  // Separate effect to detect changes in generating state
  useEffect(() => {
    if (!generating && scenes[currentScene]) {
      handleSceneResources();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generating]);
  
  // Extract the resource handling logic to a separate function
  const handleSceneResources = () => {
    const currentSceneData = scenes[currentScene];
    if (!currentSceneData) return;
    
    // Generate image if needed
    if (!currentSceneData.imageUrl && !currentSceneData.imageLoading && !generating) {
      generateImageForScene(currentScene);
    } else if (currentSceneData.imageUrl && !currentSceneData.imageLoading && !currentSceneData.imageReady) {
      // If image is already generated but not marked ready, handle it
      setScenes(prev => {
        // Only update if it's not already marked as ready to avoid loops
        const needsUpdate = !prev[currentScene].imageReady;
        return needsUpdate ? 
          prev.map((scene, idx) => idx === currentScene ? { ...scene, imageReady: true } : scene) : 
          prev;
      });
      setAudioReadyToPlay(true);
    }
    
    // Generate audio if needed
    if (!currentSceneData.audioUrl && !currentSceneData.audioLoading) {
      generateAudioForScene(currentScene);
    }
  };

  const generateImageForScene = async (sceneIndex: number) => {
    if (sceneIndex >= scenes.length) return;
    
    // Block navigation while generating image
    setNavBlocked(true);
    
    // Update state to show loading for this scene's image
    setGenerating(true);
    setScenes(prev => prev.map((scene, idx) => 
      idx === sceneIndex ? { ...scene, imageLoading: true, imageReady: false } : scene
    ));

    try {
      // Create a prompt that combines the user's original prompt with this specific scene
      const sceneText = scenes[sceneIndex].text;
      const combinedPrompt = `${userPrompt} - Scene: ${sceneText}`;
      
      const response = await fetch("http://localhost:3001/generate-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: combinedPrompt }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate image for scene");
      }

      const data = await response.json();
      
      // Update this scene with the generated image URL
      setScenes(prev => prev.map((scene, idx) => 
        idx === sceneIndex ? { 
          ...scene, 
          imageUrl: data.imageUrl, 
          imageLoading: false,
          imageError: false,
          imageReady: true
        } : scene
      ));
      
      // Now that the image is ready, we can allow audio to play
      setAudioReadyToPlay(true);
    } catch (error) {
      console.error(`❌ Error generating image for scene ${sceneIndex}:`, error);
      setScenes(prev => prev.map((scene, idx) => 
        idx === sceneIndex ? { 
          ...scene, 
          imageLoading: false, 
          imageError: true,
          imageReady: false 
        } : scene
      ));
      // Even if image fails, we should allow audio to play
      setAudioReadyToPlay(true);
    } finally {
      setGenerating(false);
      // Unblock navigation now that image is loaded or failed
      setNavBlocked(false);
    }
  };

  const generateAudioForScene = async (sceneIndex: number) => {
    if (sceneIndex >= scenes.length) return;
    
    // Update state to show loading for this scene's audio
    setScenes(prev => prev.map((scene, idx) => 
      idx === sceneIndex ? { ...scene, audioLoading: true } : scene
    ));

    try {
      const sceneText = scenes[sceneIndex].text;
      
      const response = await fetch("http://localhost:3001/generate-audio", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          text: sceneText,
          voiceId: selectedVoice
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate audio for scene");
      }

      const data = await response.json();
      
      // Update this scene with the generated audio URL
      setScenes(prev => prev.map((scene, idx) => 
        idx === sceneIndex ? { 
          ...scene, 
          audioUrl: data.audioUrl, 
          audioLoading: false,
          audioError: false
        } : scene
      ));
    } catch (error) {
      console.error(`❌ Error generating audio for scene ${sceneIndex}:`, error);
      setScenes(prev => prev.map((scene, idx) => 
        idx === sceneIndex ? { ...scene, audioLoading: false, audioError: true } : scene
      ));
    }
  };

  const handleImageError = () => {
    setScenes(prev => {
      // Only update if there's a change to avoid loops
      const scene = prev[currentScene];
      const needsUpdate = !scene.imageError || scene.imageReady;
      return needsUpdate ? 
        prev.map((s, idx) => idx === currentScene ? { ...s, imageError: true, imageReady: false } : s) : 
        prev;
    });
    // Only set audioReadyToPlay if it's not already true
    if (!audioReadyToPlay) {
      setAudioReadyToPlay(true);
    }
  };

  // Function to handle image load completion
  const handleImageLoad = () => {
    // When image is fully loaded, mark it as ready
    setScenes(prev => {
      // Only update if it's not already marked as ready to avoid loops
      const needsUpdate = !prev[currentScene].imageReady;
      return needsUpdate ? 
        prev.map((scene, idx) => idx === currentScene ? { ...scene, imageReady: true } : scene) : 
        prev;
    });
    // Only set audioReadyToPlay if it's not already true
    if (!audioReadyToPlay) {
      setAudioReadyToPlay(true);
    }
  };

  const nextScene = () => {
    if (currentScene < scenes.length - 1 && !navBlocked) {
      const nextSceneIndex = currentScene + 1;
      const nextSceneData = scenes[nextSceneIndex];
      
      // If the next scene doesn't have an image yet, we'll need to load it
      if (!nextSceneData.imageUrl && !nextSceneData.imageError) {
        setNavBlocked(true);
      }
      
      setCurrentScene(nextSceneIndex);
      setAudioReadyToPlay(false); // Reset audio ready state for new scene
    }
  };

  const prevScene = () => {
    if (currentScene > 0 && !navBlocked) {
      setCurrentScene((prev) => prev - 1);
      setAudioReadyToPlay(false); // Reset audio ready state for new scene
    }
  };

  // Debounce background music volume change to prevent rapid audio track reloading
  const handleBackgroundVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    
    // Clear any existing timeout
    if (volumeChangeTimeoutRef.current) {
      window.clearTimeout(volumeChangeTimeoutRef.current);
    }
    
    // Set the volume state after a short delay
    volumeChangeTimeoutRef.current = window.setTimeout(() => {
      setBackgroundMusicVolume(newVolume);
      volumeChangeTimeoutRef.current = null;
    }, 100);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (volumeChangeTimeoutRef.current) {
        window.clearTimeout(volumeChangeTimeoutRef.current);
      }
    };
  }, []);

  if (!script || scenes.length === 0) return null;
  
  const currentSceneData = scenes[currentScene];
  const isLoading = currentSceneData.imageLoading || navBlocked;

  return (
    <div className="mt-12 max-w-3xl mx-auto p-6 bg-white rounded-xl shadow-lg relative">
      {/* Background music component - only active for current scene */}
      {enableBackgroundMusic && scenes[currentScene]?.text && (
        <AudioBackground 
          sceneText={scenes[currentScene].text}
          isActive={true}
          volume={backgroundMusicVolume}
          crossFadeDuration={1500}
        />
      )}
      
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center z-10 rounded-xl">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-800 font-medium">Preparing your scene...</p>
          </div>
        </div>
      )}
      
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800">🎬 Scene {currentScene + 1} of {scenes.length}</h2>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Autoplay audio</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={autoplayAudio}
              onChange={() => setAutoplayAudio(!autoplayAudio)}
            />
            <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
          </label>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Scene text */}
        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-3">📝 Scene Text</h3>
          <p className="text-lg text-gray-700 whitespace-pre-line mb-4">
            {currentSceneData.text}
          </p>
          
          {/* Audio Controls */}
          <div className="mt-4">
            <AudioControls 
              audioUrl={currentSceneData.audioUrl}
              isLoading={currentSceneData.audioLoading}
              hasError={currentSceneData.audioError}
              onRetry={() => generateAudioForScene(currentScene)}
              autoplay={autoplayAudio && audioReadyToPlay} // Only autoplay if image is ready
            />
          </div>
        </div>
        
        {/* Scene image */}
        <div className="min-h-40 flex items-center justify-center">
          <div className="w-full">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">🎨 Scene Visualization</h3>
            {currentSceneData.imageLoading ? (
              <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg">
                <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-gray-600">Creating scene image...</p>
              </div>
            ) : currentSceneData.imageError ? (
              <div className="bg-gray-100 p-4 rounded-lg text-center w-full">
                <p className="text-red-500">Failed to load image for this scene.</p>
                <button
                  onClick={() => generateImageForScene(currentScene)}
                  className="mt-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                >
                  Try Again
                </button>
              </div>
            ) : currentSceneData.imageUrl ? (
              <img 
                src={currentSceneData.imageUrl} 
                alt={`Scene ${currentScene + 1}`} 
                className="w-full h-auto rounded-lg shadow-md"
                onError={handleImageError}
                onLoad={handleImageLoad} // Add handler for image load completion
              />
            ) : (
              <div className="bg-gray-100 p-8 rounded-lg text-center w-full">
                <p className="text-gray-500">Image will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-between items-center">
        <button
          onClick={prevScene}
          disabled={currentScene === 0 || isLoading}
          className={`px-4 py-2 rounded-lg transition ${
            currentScene === 0 || isLoading
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
              : 'bg-purple-600 text-white hover:bg-purple-700'
          }`}
        >
          ← Previous
        </button>
        
        <div className="text-sm text-gray-600">
          {currentScene + 1} / {scenes.length}
        </div>
        
        {currentScene < scenes.length - 1 ? (
          <button
            onClick={nextScene}
            disabled={isLoading}
            className={`px-4 py-2 rounded-lg transition ${
              isLoading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                : 'bg-purple-600 text-white hover:bg-purple-700'
            }`}
          >
            Next →
          </button>
        ) : (
          <p className="text-green-700 font-medium px-4 py-2">🌟 End of story</p>
        )}
      </div>
    </div>
  );
}