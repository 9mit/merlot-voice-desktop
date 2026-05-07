// src/services/deepgramService.ts

export const fetchTemporaryToken = async (): Promise<string | null> => {
  try {
    // Attempt to fetch from our secure Netlify Function proxy
    const res = await fetch("/.netlify/functions/deepgram-token");
    if (!res.ok) {
      console.warn("Failed to fetch temporary token from backend, falling back to local env key if available.");
      return import.meta.env.VITE_DEEPGRAM_API_KEY || null;
    }
    const data = await res.json();
    return data.token;
  } catch (err) {
    console.error("Error fetching Deepgram token:", err);
    // Fallback to local development key
    return import.meta.env.VITE_DEEPGRAM_API_KEY || null;
  }
};

export const createDeepgramSocket = async (): Promise<WebSocket> => {
  const apiKey = await fetchTemporaryToken();

  if (!apiKey) {
    throw new Error("No Deepgram API key available. Please configure the backend or .env file.");
  }

  // 1. Clean the API key (remove quotes, spaces, newlines)
  const cleanKey = apiKey.trim().replace(/^['"]+|['"]+$/g, '');

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
