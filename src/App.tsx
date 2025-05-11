//App.tsx
import { useState } from "react";
import Scene from "./components/Scene";
import PromptInput from "./components/PromptInput";
import React from 'react';

// Polly voice options - these can be expanded based on AWS Polly's available voices
interface VoiceOption {
  id: string;
  name: string;
  gender: string;
  language: string;
}

const voices: VoiceOption[] = [
  { id: "Matthew", name: "Matthew", gender: "Male", language: "US English" },
  { id: "Joanna", name: "Joanna", gender: "Female", language: "US English" },
  { id: "Emma", name: "Emma", gender: "Female", language: "British English" },
  { id: "Brian", name: "Brian", gender: "Male", language: "British English" },
  { id: "Olivia", name: "Olivia", gender: "Female", language: "Australian English" },
  { id: "Amy", name: "Amy", gender: "Female", language: "British English" }
];

export default function App() {
  const [userPrompt, setUserPrompt] = useState<string>("");
  const [generatedScript, setGeneratedScript] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedVoice, setSelectedVoice] = useState<string>("Matthew");

  const callBedrockAPI = async (prompt: string): Promise<string> => {
    try {
      const response = await fetch("http://localhost:3001/generate-story", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });
  
      if (!response.ok) {
        throw new Error("Failed to fetch story from backend.");
      }
  
      const data = await response.json();
      console.log("📖 Story response:", data);
  
      // Simply return the story string directly
      return data.story || "No story generated.";
    } catch (error) {
      console.error("❌ Error fetching story:", error);
      return "An error occurred while generating the story.";
    }
  };

  const handleSubmit = async (prompt: string) => {
    setUserPrompt(prompt);
    setLoading(true);
  
    try {
      const script = await callBedrockAPI(prompt);
      setGeneratedScript(script);
    } catch (error) {
      console.error("❌ Error during story generation:", error);
      setGeneratedScript("An error occurred while generating the story.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-4xl font-bold text-center mb-8 text-purple-700">SceneCraft 🎭</h1>
      <p className="text-center text-gray-600 mb-8">Create interactive stories with AI-generated scenes, images, and narration</p>

      <div className="max-w-2xl mx-auto mb-8">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2">
              Narrator Voice
            </label>
            <select
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {voices.map((voice) => (
                <option key={voice.id} value={voice.id}>
                  {voice.name} ({voice.gender}, {voice.language})
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-500 mt-1">
              Select the voice that will narrate your story
            </p>
          </div>

          <PromptInput
            onSubmit={async (prompt) => {
              await handleSubmit(prompt);
            }}
          />
        </div>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center mt-8 p-6 bg-white rounded-xl shadow-md max-w-3xl mx-auto">
          <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-700">Creating your story...</p>
        </div>
      )}

      {!loading && generatedScript && (
        <div className="p-4 bg-white shadow-md rounded-md mt-8 max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">📝 Generated Story</h2>
          <p className="whitespace-pre-line text-gray-700">{generatedScript}</p>
        </div>
      )}

      {!loading && generatedScript && (
        <Scene 
          userPrompt={userPrompt} 
          script={generatedScript} 
          selectedVoice={selectedVoice}
        />
      )}

      <footer className="mt-12 text-center text-gray-500 text-sm">
        <p>Powered by AWS Bedrock, Stable Diffusion, Claude, and Polly</p>
        <p className="mt-1">© 2025 SceneCraft</p>
      </footer>
    </div>
  );
}