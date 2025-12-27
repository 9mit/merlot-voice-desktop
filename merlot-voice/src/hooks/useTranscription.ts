// src/hooks/useTranscription.ts
// Updated to use MediaRecorder

import { useState, useRef, useCallback, useEffect } from "react";
import { getMicrophoneStream, createMediaRecorder } from "../services/audioService";
import { createDeepgramSocket, parseTranscript } from "../services/deepgramService";

export const useTranscription = (apiKey: string | undefined) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Clean up all resources
  const cleanup = useCallback(() => {
    // Stop MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn("MediaRecorder stop error:", e);
      }
    }
    mediaRecorderRef.current = null;

    // Close WebSocket
    if (socketRef.current) {
      if (socketRef.current.readyState === WebSocket.OPEN ||
        socketRef.current.readyState === WebSocket.CONNECTING) {
        try {
          socketRef.current.send(JSON.stringify({ type: "CloseStream" }));
          socketRef.current.close(1000, "User stopped recording");
        } catch (e) {
          console.warn("WebSocket close error:", e);
        }
      }
    }
    socketRef.current = null;

    // Stop microphone tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    streamRef.current = null;
  }, []);

  const stopRecording = useCallback(() => {
    console.log("Stopping recording...");
    setIsRecording(false);
    setInterimTranscript("");
    cleanup();
  }, [cleanup]);

  const startRecording = useCallback(async () => {
    if (!apiKey) {
      setError("API Key is missing. Check your .env file.");
      return;
    }

    if (isRecording) return;

    // Reset state
    setError(null);
    setInterimTranscript("");

    try {
      console.log("Starting recording...");

      // 1. Create WebSocket to Deepgram
      const socket = createDeepgramSocket(apiKey);
      socketRef.current = socket;

      // 2. Handle socket open - then start microphone
      socket.addEventListener("open", async () => {
        console.log("Socket open, requesting microphone...");

        try {
          // Get microphone access
          const stream = await getMicrophoneStream();
          streamRef.current = stream;
          console.log("Microphone access granted.");

          // Start MediaRecorder
          const recorder = createMediaRecorder(stream, (blob: Blob) => {
            if (socket.readyState === WebSocket.OPEN) {
              socket.send(blob);
            }
          });

          mediaRecorderRef.current = recorder;
          recorder.start(250); // Send chunks every 250ms
          setIsRecording(true);
          console.log("Recording started.");
        } catch (err) {
          console.error("Microphone Access Error:", err);
          setError("Microphone access denied");
          socket.close();
        }
      });

      // 3. Handle incoming transcripts
      let lastFinalText = ""; // Track last final to prevent duplicates

      socket.addEventListener("message", (event: MessageEvent<string>) => {
        const result = parseTranscript(event.data);
        if (result && result.text) {
          if (result.isFinal) {
            // Prevent duplicate finals (Deepgram sometimes sends the same text twice)
            if (result.text !== lastFinalText) {
              lastFinalText = result.text;
              setTranscript((prev) => (prev ? prev + " " + result.text : result.text).trim());
            }
            setInterimTranscript("");
          } else {
            setInterimTranscript(result.text);
          }
        }
      });

      // 4. Handle socket errors
      socket.addEventListener("error", () => {
        setError("Connection error with Deepgram API.");
        stopRecording();
      });

      // 5. Handle socket close
      socket.addEventListener("close", (event) => {
        console.log("Socket closed:", event.code, event.reason);

        // Only set error for abnormal closures
        if (event.code === 1006) {
          setError("Connection Refused. Invalid API Key?");
        } else if (event.code === 4001 || event.code === 4003) {
          setError("Invalid API Key / Unauthorized");
        } else if (event.code !== 1000) {
          setError(`Connection closed: ${event.reason || "Unknown reason"} (Code: ${event.code})`);
        }

        // Ensure we clean up
        setIsRecording(false);
        setInterimTranscript("");
      });

    } catch (err: unknown) {
      const e = err as Error & { name?: string };
      console.error("Recording error:", e);
      setError(e.message || "An unexpected error occurred.");
      cleanup();
    }
  }, [apiKey, isRecording, stopRecording, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const clearTranscript = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
  }, []);

  return {
    isRecording,
    transcript,
    interimTranscript,
    error,
    startRecording,
    stopRecording,
    clearTranscript,
  };
};
