// components/PromptInput.tsx
import React, { useState } from "react";

type PromptInputProps = {
  onSubmit: (prompt: string) => void;
};

const PromptInput: React.FC<PromptInputProps> = ({ onSubmit }) => {
  const [prompt, setPrompt] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      onSubmit(prompt);
      setPrompt("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 p-4">
      <input
        type="text"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe a scene..."
        className="flex-1 border border-gray-300 rounded px-3 py-2"
      />
      <button
        type="submit"
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Submit
      </button>
    </form>
  );
};

export default PromptInput;
