import { createClient } from "@deepgram/sdk";
import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // Only allow POST requests for better security semantic (or GET if we just want to fetch)
  if (event.httpMethod !== "GET" && event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  // Basic CORS/Origin check (optional, but good for public APIs)
  // Ensure the request comes from our own Netlify site, preventing random apps from using our endpoint
  const referer = event.headers.referer || event.headers.origin || "";
  // In a real prod app, you can enforce this:
  // if (!referer.includes("your-app-name.netlify.app") && process.env.NODE_ENV !== "development") {
  //   return { statusCode: 403, body: "Forbidden" };
  // }

  const apiKey = process.env.DEEPGRAM_API_KEY;
  const projectId = process.env.DEEPGRAM_PROJECT_ID; // Required for project keys

  if (!apiKey || !projectId) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server configuration missing API key or Project ID" }),
    };
  }

  try {
    const deepgram = createClient(apiKey);
    
    // We create a temporary project key that expires in 120 seconds.
    // This way, if a malicious user extracts the token from the browser, it dies almost immediately.
    const { result, error } = await deepgram.manage.createProjectKey(projectId, {
      comment: "Temporary token for frontend WebSocket",
      scopes: ["usage:write"], 
      time_to_live_in_seconds: 120, // 2 minutes max
    });

    if (error) {
      console.error("Deepgram API Error:", error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Failed to generate Deepgram token" }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*", // Or lock this down to your specific URL
      },
      body: JSON.stringify({ token: result.key }),
    };
  } catch (err) {
    console.error("Token Generation Error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};

export { handler };
