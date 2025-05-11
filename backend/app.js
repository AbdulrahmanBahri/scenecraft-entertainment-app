// backend/app.js
const express = require("express");
const cors = require("cors");
const { generateStory, generateImage, generateAudio } = require("./bedrockService");

const app = express();

// Allow requests from http://localhost:3000
app.use(cors({
  origin: "http://localhost:3000",
}));

app.use(express.json()); // For parsing application/json

// Endpoint for generating the story
app.post("/generate-story", async (req, res) => {
  const { prompt } = req.body;
  try {
    const story = await generateStory(prompt);
    res.json({ story });
  } catch (error) {
    console.error("❌ Error generating story:", error);
    res.status(500).json({ error: "Failed to generate story." });
  }
});

// Endpoint for generating the image
app.post("/generate-image", async (req, res) => {
  const { prompt } = req.body;
  try {
    const imageUrl = await generateImage(prompt);
    res.json({ imageUrl }); // Send image URL to frontend
  } catch (error) {
    console.error("❌ Error generating image:", error);
    res.status(500).json({ error: "Failed to generate image." });
  }
});

// Endpoint for generating audio narration
app.post("/generate-audio", async (req, res) => {
  const { text, voiceId } = req.body;
  
  // Validate input
  if (!text || text.trim() === '') {
    return res.status(400).json({ error: "Text is required for audio generation." });
  }
  
  try {
    const audioUrl = await generateAudio(text, voiceId || "Joanna");
    if (audioUrl) {
      res.json({ audioUrl });
    } else {
      res.status(500).json({ error: "Failed to generate audio." });
    }
  } catch (error) {
    console.error("❌ Error generating audio:", error);
    res.status(500).json({ error: "Failed to generate audio: " + error.message });
  }
});

// Endpoint to get available Polly voices
app.get("/available-voices", async (req, res) => {
  try {
    const voices = await getAvailableVoices();
    res.json({ voices });
  } catch (error) {
    console.error("❌ Error fetching available voices:", error);
    res.status(500).json({ error: "Failed to fetch available voices." });
  }
});

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend is running on http://localhost:${PORT}`);
});
