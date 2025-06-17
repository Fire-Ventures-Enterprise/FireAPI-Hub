const axios = require("axios");

class ElevenLabsService {
  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY;
    this.baseURL = "https://api.elevenlabs.io/v1";
    this.voiceId = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";
  }

  // Generate natural speech for AI Companion
  async generateCoachSpeech(text, emotion = "supportive") {
    try {
      const response = await axios.post(
        `${this.baseURL}/text-to-speech/${this.voiceId}`,
        {
          text: this.addEmotionalTone(text, emotion),
          voice_settings: {
            stability: parseFloat(process.env.VOICE_STABILITY) || 0.75,
            similarity_boost:
              parseFloat(process.env.VOICE_SIMILARITY_BOOST) || 0.8,
            style: parseFloat(process.env.VOICE_STYLE) || 0.5,
          },
        },
        {
          headers: {
            "xi-api-key": this.apiKey,
            "Content-Type": "application/json",
            Accept: "audio/mpeg",
          },
          responseType: "arraybuffer",
        }
      );

      return response.data;
    } catch (error) {
      console.error("ElevenLabs API Error:", error.message);
      throw error;
    }
  }

  // Add emotional context to text
  addEmotionalTone(text, emotion) {
    const emotionalPrefixes = {
      concerned: "*speaks with genuine concern* ",
      excited: "*voice filled with excitement* ",
      supportive: "*warm, encouraging tone* ",
      firm: "*serious but caring tone* ",
      proud: "*beaming with pride* ",
      worried: "*voice shows deep concern* ",
    };

    return (emotionalPrefixes[emotion] || "") + text;
  }

  // Companion coaching responses
  async speakToUser(message, userContext, emotion = "supportive") {
    const personalizedMessage = this.personalizeMessage(message, userContext);
    return await this.generateCoachSpeech(personalizedMessage, emotion);
  }

  // Personalize messages based on user context
  personalizeMessage(message, userContext) {
    if (userContext.name) {
      message = message.replace(/\buser\b/gi, userContext.name);
    }
    return message;
  }
}

module.exports = { ElevenLabsService };
