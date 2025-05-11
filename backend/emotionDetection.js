// backend/emotionDetection.js
const express = require('express');
const router = express.Router();

// Simple emotion detection keywords (same as frontend for consistency)
const emotionKeywords = {
  joy: [
    'happy', 'happiness', 'delighted', 'joy', 'joyful', 'smile', 'smiling', 'laugh', 'laughing',
    'excited', 'celebration', 'cheerful', 'pleased', 'thrilled', 'elated', 'jubilant', 'gleeful',
    'content', 'delight', 'ecstasy', 'victory', 'triumph', 'success', 'giggle', 'celebrate'
  ],
  sadness: [
    'sad', 'sadness', 'cry', 'crying', 'tear', 'tears', 'grief', 'sorrow', 'mourn', 'mourning',
    'depressed', 'depression', 'upset', 'gloomy', 'heartbroken', 'miserable', 'melancholy',
    'somber', 'downcast', 'despair', 'despairing', 'weep', 'weeping', 'unhappy', 'regret'
  ],
  fear: [
    'fear', 'afraid', 'scared', 'terrified', 'frightened', 'horrified', 'panic', 'dread',
    'terror', 'horror', 'anxious', 'anxiety', 'worry', 'worried', 'alarmed', 'startled',
    'nightmare', 'tremble', 'trembling', 'shiver', 'shivering', 'scream', 'screaming', 'shock'
  ],
  anger: [
    'anger', 'angry', 'rage', 'furious', 'mad', 'outraged', 'upset', 'irritated', 'annoyed',
    'frustrated', 'enraged', 'hostile', 'hatred', 'hate', 'bitter', 'fury', 'wrath', 'indignant',
    'irate', 'fuming', 'seething', 'livid', 'offended', 'resentful', 'explode'
  ],
  surprise: [
    'surprise', 'surprised', 'amazed', 'astonished', 'shocked', 'startled', 'unexpected',
    'sudden', 'wonder', 'awe', 'bewildered', 'astounded', 'speechless', 'stunned', 'dumbfounded',
    'jaw-dropping', 'incredible', 'unbelievable', 'wow', 'gasp', 'revelation', 'disbelief'
  ],
  calm: [
    'calm', 'peaceful', 'serene', 'tranquil', 'quiet', 'silent', 'still', 'gentle', 'relaxed',
    'relaxing', 'soothing', 'meditative', 'composed', 'collected', 'unruffled', 'placid',
    'undisturbed', 'rest', 'resting', 'harmonious', 'zen', 'balanced', 'steady', 'stable'
  ],
  tension: [
    'tense', 'tension', 'suspense', 'strained', 'stress', 'stressed', 'nervous', 'alert',
    'vigilant', 'uneasy', 'anticipation', 'edge', 'edgy', 'apprehensive', 'waiting',
    'uncertain', 'cautious', 'hesitant', 'reluctant', 'restless', 'fidget', 'fidgeting'
  ],
  mystery: [
    'mystery', 'mysterious', 'unknown', 'secret', 'hidden', 'enigmatic', 'puzzling',
    'cryptic', 'curious', 'investigation', 'detective', 'clue', 'riddle', 'question',
    'suspicious', 'strange', 'odd', 'peculiar', 'eerie', 'supernatural', 'shadow', 'shadows'
  ],
  adventure: [
    'adventure', 'explore', 'exploring', 'journey', 'quest', 'discovery', 'discovered',
    'expedition', 'travel', 'traveling', 'wandering', 'wander', 'trek', 'trekking',
    'expedition', 'exciting', 'challenge', 'challenging', 'daring', 'bold', 'brave'
  ],
  romance: [
    'love', 'loving', 'romance', 'romantic', 'passion', 'passionate', 'desire', 'affection',
    'intimate', 'intimacy', 'embrace', 'embracing', 'kiss', 'kissing', 'tender', 'sweet',
    'gentle', 'warm', 'warmth', 'chemistry', 'connection', 'attraction', 'attracted'
  ]
};

// Map emotions to appropriate ambient tracks
const emotionToTrack = {
  joy: "/audio/ambient/joy.mp3",  
  sadness: "/audio/ambient/sadness.mp3",
  fear: "/audio/ambient/fear.mp3",
  anger: "/audio/ambient/anger.mp3",
  surprise: "/audio/ambient/surprise.mp3",
  calm: "/audio/ambient/calm.mp3",
  tension: "/audio/ambient/tension.mp3",
  mystery: "/audio/ambient/mystery.mp3",
  adventure: "/audio/ambient/adventure.mp3",
  romance: "/audio/ambient/romance.mp3",
  default: "/audio/ambient/neutral.mp3"
};

/**
 * Detect emotion in a text and return appropriate audio track
 * POST /detect-emotion
 */
router.post('/detect-emotion', (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ 
        error: 'Text is required' 
      });
    }
    
    const normalizedText = text.toLowerCase();
    const emotionScores = {};
    
    // Calculate score for each emotion based on keyword matches
    Object.entries(emotionKeywords).forEach(([emotion, keywords]) => {
      let score = 0;
      
      keywords.forEach(keyword => {
        // Count occurrences of the keyword in the text
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = normalizedText.match(regex);
        
        if (matches) {
          score += matches.length;
        }
      });
      
      emotionScores[emotion] = score;
    });
    
    // Find emotion with highest score
    let highestScore = 0;
    let dominantEmotion = 'default';
    
    Object.entries(emotionScores).forEach(([emotion, score]) => {
      if (score > highestScore) {
        highestScore = score;
        dominantEmotion = emotion;
      }
    });
    
    // Use default if no emotion is strongly detected
    const detectedEmotion = highestScore > 0 ? dominantEmotion : 'default';
    const audioTrack = emotionToTrack[detectedEmotion];
    
    // Return detected emotion and associated track
    return res.json({
      emotion: detectedEmotion,
      audioTrack: audioTrack,
      confidence: highestScore,
      emotionScores
    });
    
  } catch (error) {
    console.error('Error in emotion detection:', error);
    return res.status(500).json({ 
      error: 'Error processing emotion detection',
      details: error.message
    });
  }
});

module.exports = router;
