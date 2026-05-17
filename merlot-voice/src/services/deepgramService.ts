// src/services/deepgramService.ts


const isDev = import.meta.env.DEV;

export const fetchTemporaryToken = async (): Promise<string | null> => {
  try {
    // Attempt to fetch from our secure Vercel API proxy
    const res = await fetch("/api/deepgram-token");
    if (!res.ok) {
      console.warn("[Deepgram] Token endpoint unavailable, using local key.");
      return import.meta.env.VITE_DEEPGRAM_API_KEY || null;
    }
    const data = await res.json();
    return data.token;
  } catch (err) {
    console.warn("[Deepgram] Token endpoint unreachable, using local key.");
    return import.meta.env.VITE_DEEPGRAM_API_KEY || null;
  }
};


export const createDeepgramSocket = async (): Promise<WebSocket> => {
  const apiKey = await fetchTemporaryToken();

  if (!apiKey) {
    throw new Error("Unable to connect. Please try again in a moment.");
  }

  const cleanKey = apiKey.trim().replace(/^['"]+|['"]+$/g, '');

  // Use subprotocol-based auth (keeps key out of the URL / network tab address bar)
  const url = `wss://api.deepgram.com/v1/listen?punctuate=true&smart_format=true&model=nova-2&language=en-US&interim_results=true`;

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
