// backend/bedrockService.js
const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { PollyClient, SynthesizeSpeechCommand, DescribeVoicesCommand } = require("@aws-sdk/client-polly");
const sharp = require("sharp");
require("dotenv").config();

const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const s3Client = new S3Client({ 
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const pollyClient = new PollyClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

async function generateStory(prompt) {
  const input = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 600,
    temperature: 0.8,
    top_p: 0.9,
    messages: [
      {
        role: "user",
        content: [{ type: "text", text: `Write a short, dramatic story based on this prompt:\n\n${prompt}` }],
      }
    ]
  };

  const command = new InvokeModelCommand({
    modelId: "anthropic.claude-3-haiku-20240307-v1:0",
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify(input)
  });

  const response = await client.send(command);
  const responseBody = JSON.parse(Buffer.from(response.body).toString("utf8"));

  console.log("📝 Story responseBody:", JSON.stringify(responseBody, null, 2));

  // Extract just the text from the response
  if (responseBody.content && responseBody.content.length > 0) {
    return responseBody.content[0].text;
  } else {
    return "No story generated.";
  }
}

async function uploadToS3(buffer, filename, contentType) {
  const bucketName = process.env.S3_BUCKET_NAME;

  const uploadParams = {
    Bucket: bucketName,
    Key: filename,
    Body: buffer,
    ContentType: contentType,
  };

  try {
    await s3Client.send(new PutObjectCommand(uploadParams));
    const url = `https://${bucketName}.s3.amazonaws.com/${filename}`;
    console.log(`✅ Uploaded to S3 (${contentType}):`, url);
    return url;
  } catch (err) {
    console.error(`❌ Error uploading to S3 (${contentType}):`, err);
    return "";
  }
}

async function uploadBase64ImageToS3(base64Image, filename) {
  const buffer = Buffer.from(base64Image, "base64");
  return uploadToS3(buffer, filename, "image/png");
}  

async function generateImage(prompt) {
  const input = {
    text_prompts: [{ text: prompt }],
    cfg_scale: 7.5,
    seed: 0,
    steps: 50,
    width: 512,
    height: 512,
    samples: 1,
  };

  const command = new InvokeModelCommand({
    modelId: "stability.stable-diffusion-xl-v1",
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify(input),
  });

  try {
    const response = await client.send(command);
    const responseBody = JSON.parse(Buffer.from(response.body).toString("utf8"));

    console.log("🖼️ Image generation response:", responseBody);

    const base64Image = responseBody.artifacts?.[0]?.base64;
    if (base64Image) {
      // Upload to S3 and get the image URL
      const imageUrl = await uploadBase64ImageToS3(base64Image, `image-${Date.now()}.png`);
      return imageUrl;
    } else {
      console.error("⚠️ No base64 image data found.");
      return null;
    }
  } catch (error) {
    console.error("❌ Error in generateImage:", error);
    throw error;
  }
}    

// Helper function to check if a voice ID is valid
async function getAvailableVoices() {
  try {
    const command = new DescribeVoicesCommand({ Engine: "neural" });
    const response = await pollyClient.send(command);
    return response.Voices || [];
  } catch (error) {
    console.error("❌ Error fetching available voices:", error);
    return [];
  }
}

// Cache for available voices
let availableVoiceIds = null;

async function validateVoiceId(voiceId) {
  if (!availableVoiceIds) {
    const voices = await getAvailableVoices();
    availableVoiceIds = voices.map(voice => voice.Id);
  }
  
  return availableVoiceIds.includes(voiceId);
}

async function generateAudio(text, voiceId = "Joanna") {
  try {
    // Validate text
    if (!text || text.trim() === "") {
      throw new Error("Text content is required for audio generation");
    }
    
    // Text length limitations for Polly (check AWS docs for current limits)
    const MAX_TEXT_LENGTH = 3000;
    if (text.length > MAX_TEXT_LENGTH) {
      console.warn(`⚠️ Text exceeds Polly's ${MAX_TEXT_LENGTH} character limit. Truncating...`);
      text = text.substring(0, MAX_TEXT_LENGTH);
    }

    // Validate voice ID (optional)
    const isValidVoice = await validateVoiceId(voiceId);
    if (!isValidVoice) {
      console.warn(`⚠️ Invalid voice ID "${voiceId}". Falling back to Joanna.`);
      voiceId = "Joanna";
    }

    // Prepare the parameters for the synthesize speech command
    const params = {
      Engine: "neural",
      OutputFormat: "mp3",
      Text: text,
      TextType: "text",
      VoiceId: voiceId
    };

    // Create the command
    const command = new SynthesizeSpeechCommand(params);
    
    // Send the command to Polly
    console.log(`🔊 Sending request to Polly with voice: ${voiceId}...`);
    const response = await pollyClient.send(command);
    
    // The response contains the audio stream
    console.log("🔊 Received audio from Polly");
    
    // Upload the audio to S3
    if (response.AudioStream) {
      const filename = `audio-${Date.now()}.mp3`;
      const chunks = [];
      
      for await (const chunk of response.AudioStream) {
        chunks.push(chunk);
      }
      
      const buffer = Buffer.concat(chunks);
      const audioUrl = await uploadToS3(buffer, filename, "audio/mpeg");
      return audioUrl;
    } else {
      throw new Error("No audio stream found in Polly response");
    }
  } catch (error) {
    console.error("❌ Error in generateAudio:", error);
    throw error;
  }
}

async function resizeBase64Image(base64Image, width, height) {
  const buffer = Buffer.from(base64Image, "base64");

  try {
    // Resize the image using sharp
    const resizedBuffer = await sharp(buffer)
      .resize(width, height)
      .toBuffer();

    // Convert the resized buffer back to base64
    const resizedBase64 = resizedBuffer.toString("base64");

    return `data:image/png;base64,${resizedBase64}`;
  } catch (error) {
    console.error("❌ Error resizing image:", error);
    throw error;
  }
}

module.exports = { 
  generateStory, 
  generateImage, 
  generateAudio, 
  uploadToS3,
  getAvailableVoices 
};
