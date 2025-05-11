# 🎬 SceneCraft

**SceneCraft** is an interactive storytelling web application that transforms simple prompts into rich, multimedia story experiences. It combines generative AI with dynamic visuals, narration, and ambient sound to bring each scene to life.

This project was built as part of the [Amazon Q Developer "Quack The Code" Challenge](https://dev.to/challenges/aws-amazon-q-v2025-04-30), under the "That's Entertainment!" track.

---

## ✨ Features

- 🧠 **Story Generation** using **Amazon Bedrock** (Anthropic Claude via Titan embeddings)
- 🖼️ **Image Generation per Scene** using **Amazon Bedrock** (Stable Diffusion)
- 🗣️ **Narrated Scenes** with **Amazon Polly**
- 🎵 **Scene-Based Background Music** for immersive atmosphere
- 🎬 **Dynamic Scene Renderer** — each sentence of the story is rendered as a separate scene with image + audio
- ☁️ **All Assets Stored in S3** — images, audio, and metadata
- ⚙️ **Fully Serverless Stack** powered by S3, Bedrock, and more

---

## 📽️ Demo

[![Watch the Demo](https://img.shields.io/badge/🎥-Click%20to%20watch%20demo-blue?logo=youtube)](https://drive.google.com/file/d/1H0zNjQ8SaRXI1uy1aIOfAkVLYnRCYDPX/view?usp=drive_link)

---

## 🧠 How It Works

1. User enters a prompt (e.g., "A knight battles a dragon in a thunderstorm").
2. The backend uses **Amazon Q** to refine and validate the prompt.
3. A full story is generated using **Amazon Bedrock Claude**.
4. The story is broken down into scenes (one sentence = one scene).
5. For each scene:
   - An image is generated (Stable Diffusion via Bedrock).
   - The scene is narrated using **Amazon Polly**.
   - Background music is selected based on mood/emotion detected in text.
6. Frontend renders the scenes as an animated storybook with audio and visuals.

---

## 🧰 Technologies Used

- **Frontend**: React, Tailwind CSS
- **Cloud Services**:
  - **Amazon Bedrock** – for generating stories and images.
  - **Amazon Polly** – for narrating scenes with text-to-speech.
  - **Amazon S3** – for storing generated media (images, audio).
- **Developer Tooling**:
  - **Amazon Q Developer** – helped with debugging, architecture planning, and prompt optimization.

---

## 🧑‍💻 Setup Instructions

1. Clone the repo:
   ```bash
   git clone https://github.com/AbdulrahmanBahri/scenecraft.git
   cd scenecraft

2. Install dependencies:
   ```bash
   npm install

3. Configure your AWS credentials (for local testing or deployment):
   ```bash
   aws configure

4. Start the backend:
   ```bash
   cd scencecraft/backend
   node app.js

5. Start the frontend:
   ```bash
   cd scencecraft
   npm start

---

🔒 License
This project is licensed under the MIT License.

---

🤝 Contributing
PRs welcome! Please fork the repo and submit a pull request. For major changes, open an issue first to discuss what you’d like to change.

---

🙋‍♂️ Author
Made with ❤️ by Abdulrahman Bahri

---

🧠 Submission Info
This project is a submission for the Amazon Q Developer "Quack The Code" Challenge.
