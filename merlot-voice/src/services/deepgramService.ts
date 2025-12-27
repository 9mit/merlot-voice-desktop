// src/services/deepgramService.ts
// Fixed version based on working reference code

export const createDeepgramSocket = (apiKey: string): WebSocket => {
  // 1. Clean the API key (remove quotes, spaces, newlines)
  const cleanKey = apiKey.trim().replace(/^['"]+|['"]+$/g, '');

  if (!cleanKey) {
    throw new Error("API Key is empty after cleanup");
  }

  console.log(`[Deepgram] Connecting with Key (Length: ${cleanKey.length})`);

  // 2. Construct URL with access_token (URL-encoded for safety)
  const encodedKey = encodeURIComponent(cleanKey);
  const url = `wss://api.deepgram.com/v1/listen?access_token=${encodedKey}&punctuate=true&smart_format=true&model=nova-2&language=en-US`;

  console.log("Connecting to Deepgram...");

  // 3. Create WebSocket with protocol parameter (important for auth)
  const ws = new WebSocket(url, ['token', cleanKey]);

  ws.onopen = () => {
    console.log("✅ Deepgram WebSocket Connected");
  };

  ws.onerror = (e) => {
    console.error("❌ Deepgram Connection Error:", e);
  };

  ws.onclose = (e) => {
    console.log(`Deepgram Connection Closed: Code ${e.code}, Reason: ${e.reason || 'None'}`);

    if (e.code === 1006) {
      console.error("❌ Connection Refused (1006) - Likely Invalid API Key");
    } else if (e.code === 4001 || e.code === 4003) {
      console.error("❌ Unauthorized (4001/4003) - Invalid API Key");
    }
  };

  return ws;
};

export const parseTranscript = (
  message: string
): { isFinal: boolean; text: string } | null => {
  try {
    const data = JSON.parse(message);
    const alternative = data.channel?.alternatives?.[0];

    if (alternative) {
      return {
        isFinal: Boolean(data.is_final),
        text: alternative.transcript || '',
      };
    }
    return null;
  } catch (err) {
    console.error("Error parsing Deepgram message:", err);
    return null;
  }
};
