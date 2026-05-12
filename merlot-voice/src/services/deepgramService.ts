// src/services/deepgramService.ts


export const fetchTemporaryToken = async (): Promise<string | null> => {
  const key = import.meta.env.VITE_DEEPGRAM_API_KEY;
  if (!key) {
    console.error("[Deepgram] API key missing in environment variables.");
    return null;
  }
  return key;
};


export const createDeepgramSocket = async (): Promise<WebSocket> => {
  const apiKey = await fetchTemporaryToken();

  if (!apiKey) {
    throw new Error("Unable to connect. Please try again in a moment.");
  }

  const cleanKey = apiKey.trim().replace(/^['"]+|['"]+$/g, '');

  // Use subprotocol-based auth (keeps key out of the URL / network tab address bar)
  const url = `wss://api.deepgram.com/v1/listen?punctuate=true&smart_format=true&model=nova-2&language=en-US`;

  const ws = new WebSocket(url, ['token', cleanKey]);

  ws.onopen = () => {
    console.log("[Deepgram] Connected");
  };

  ws.onerror = () => {
    console.error("[Deepgram] Connection error");
  };

  ws.onclose = (e) => {
    if (e.code === 1006) {
      console.error("[Deepgram] Connection refused — check credentials");
    } else if (e.code === 4001 || e.code === 4003) {
      console.error("[Deepgram] Unauthorized");
    } else if (e.code !== 1000) {
      console.warn("[Deepgram] Disconnected:", e.code);
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
