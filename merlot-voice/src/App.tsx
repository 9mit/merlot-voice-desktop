import React, { useState, useEffect, useRef, useCallback } from "react";
import "./index.css";
import { useTranscription } from "./hooks/useTranscription";
import { setupPushToTalkListeners, injectText } from "./services/pushToTalkService";
import { Mic, Square, Copy, Trash2, Check, Sparkles, Keyboard, Send } from "lucide-react";

function App() {
  const [copied, setCopied] = useState(false);
  const [isInserting, setIsInserting] = useState(false);
  const [isPTTMode, setIsPTTMode] = useState(false);
  const [pttStatus, setPttStatus] = useState<"idle" | "recording" | "injecting">("idle");

  const {
    isRecording,
    transcript,
    interimTranscript,
    error,
    startRecording,
    stopRecording,
    clearTranscript,
  } = useTranscription();

  // Track transcript for PTT injection
  const transcriptRef = useRef(transcript);
  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  // Handle PTT stop - inject text and clear
  const handlePTTStop = useCallback(async () => {
    console.log("PTT: Stop triggered, stopping recording...");
    stopRecording();
    setPttStatus("injecting");

    // Wait for transcription to complete (poll for up to 2 seconds)
    let attempts = 0;
    const maxAttempts = 20; // 20 * 100ms = 2 seconds

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      attempts++;

      const currentText = transcriptRef.current;
      if (currentText && currentText.trim()) {
        console.log("PTT: Transcript received:", currentText);
        break;
      }
    }

    const textToInject = transcriptRef.current;
    console.log("PTT: Final text to inject:", textToInject);

    if (textToInject && textToInject.trim()) {
      try {
        await injectText(textToInject);
        console.log("PTT: Text injected successfully!");
      } catch (err) {
        console.error("PTT: Failed to inject text:", err);
      }
    } else {
      console.log("PTT: No text to inject (empty transcription)");
    }

    // Clear transcript after injection
    clearTranscript();
    setPttStatus("idle");
  }, [stopRecording, clearTranscript]);

  // Handle PTT start
  const handlePTTStart = useCallback(() => {
    console.log("PTT: Start triggered, starting recording...");
    setPttStatus("recording");
    clearTranscript();
    startRecording();
  }, [startRecording, clearTranscript]);

  // Setup push-to-talk listeners on mount
  useEffect(() => {
    let cleanup: (() => void) | null = null;

    setupPushToTalkListeners({
      onStart: handlePTTStart,
      onStop: handlePTTStop,
    }).then((cleanupFn) => {
      cleanup = cleanupFn;
      setIsPTTMode(true);
      console.log("PTT: Listeners registered, Alt+G hotkey active");
    }).catch((err) => {
      console.error("PTT: Failed to setup listeners:", err);
      setIsPTTMode(false);
    });

    return () => {
      if (cleanup) cleanup();
    };
  }, [handlePTTStart, handlePTTStop]);

  const handleCopy = async () => {
    if (!transcript) return;
    try {
      await navigator.clipboard.writeText(transcript);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  const handleToggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="relative flex flex-col h-[100dvh] overflow-hidden bg-gradient-to-br from-[#0a0103] via-[#1a0308] to-[#0a0103]">

      {/* Ambient Background Effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-[#4a0412]/20 rounded-full blur-[128px] pointer-events-none animate-pulse" style={{ animationDuration: '4s' }} />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-[#2e0209]/30 rounded-full blur-[128px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6 glass border-b border-rose-900/10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-[#881337] to-[#4c0519] rounded-xl shadow-lg border border-white/10">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-xl tracking-tight text-white">
              Merlot<span className="text-rose-400">Voice</span>
            </h1>
            <span className="text-[10px] uppercase tracking-[0.2em] text-rose-200/40 font-medium">
              Voice Transcription
            </span>
          </div>
        </div>

        {/* PTT Status Indicator */}
        {isPTTMode && (
          <div className="flex items-center gap-2 px-3 py-1.5 glass rounded-full border border-rose-500/20">
            <Keyboard className="w-4 h-4 text-rose-400" />
            <span className="text-xs font-medium text-rose-200/60">
              Alt+G PTT
            </span>
            <div className={`w-2 h-2 rounded-full ${pttStatus === "recording"
              ? "bg-rose-500 animate-pulse"
              : pttStatus === "injecting"
                ? "bg-amber-500"
                : "bg-emerald-500/50"
              }`} />
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="relative flex-1 flex flex-col items-center justify-center p-8 z-10 max-w-5xl mx-auto w-full">

        {/* Status Indicator */}
        {isRecording && (
          <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 glass rounded-full border border-rose-500/20 animate-fade-in">
            <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-rose-100">
              {pttStatus === "recording" ? "Recording... Release keys to inject" : "Recording..."}
            </span>
          </div>
        )}

        {/* Injecting Status */}
        {pttStatus === "injecting" && (
          <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 glass rounded-full border border-amber-500/20 animate-fade-in">
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-amber-100">Injecting text...</span>
          </div>
        )}

        {/* Error Toast */}
        {error && (
          <div className="absolute top-8 left-1/2 -translate-x-1/2 px-6 py-3 bg-red-900/90 backdrop-blur-sm text-red-100 text-sm rounded-full border border-red-500/30 shadow-lg animate-fade-in">
            {error}
          </div>
        )}

        {/* Transcript Display */}
        <div className="w-full h-full flex flex-col glass rounded-3xl border border-rose-500/10 shadow-2xl overflow-hidden">

          {/* Empty State */}
          {!transcript && !interimTranscript && (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#881337]/20 to-[#4c0519]/20 flex items-center justify-center mb-6 border border-rose-900/20">
                <Mic className="w-10 h-10 text-rose-900/40" />
              </div>
              <h3 className="text-xl font-semibold text-rose-100/60 mb-2">
                Ready to Transcribe
              </h3>
              <p className="text-sm text-rose-200/30 max-w-md">
                Click the microphone to record, then use the Send button to insert text into any app.
                {isPTTMode && " Or hold Alt+G anywhere for quick voice input."}
              </p>
            </div>
          )}

          {/* Transcript Content */}
          {(transcript || interimTranscript) && (
            <div className="flex-1 p-8 overflow-y-auto">
              <div className="prose prose-invert max-w-none">
                <p className="text-lg leading-relaxed text-rose-50 whitespace-pre-wrap font-light">
                  {transcript}
                  {interimTranscript && (
                    <span className="text-rose-400/60 italic ml-1">
                      {interimTranscript}
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Control Dock */}
      <footer className="relative z-20 pb-8 pt-4 flex flex-col items-center gap-6">

        {/* Main Controls */}
        <div className="flex items-center gap-4 px-6 py-4 glass rounded-3xl border border-rose-500/10 shadow-2xl">

          {/* Clear Button */}
          <button
            onClick={clearTranscript}
            disabled={!transcript}
            className="p-3 hover:bg-white/5 rounded-xl text-rose-900/40 hover:text-rose-400 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed btn"
            title="Clear transcript"
          >
            <Trash2 className="w-5 h-5" />
          </button>

          {/* Record Button */}
          <button
            onClick={handleToggleRecording}
            className={`relative w-16 h-16 rounded-full flex items-center justify-center border-4 transition-all duration-300 shadow-xl btn ${isRecording
              ? "bg-gradient-to-br from-[#881337] to-[#4c0519] border-rose-700 scale-95 animate-pulse-glow"
              : "bg-gradient-to-br from-[#2a060b] to-[#3f0914] border-rose-900/30 hover:border-rose-700/50 hover:scale-105"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            title={isRecording ? "Stop recording" : "Start recording"}
          >
            {isRecording ? (
              <Square className="w-7 h-7 text-white fill-white" />
            ) : (
              <Mic className="w-7 h-7 text-rose-400" />
            )}
          </button>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            disabled={!transcript}
            className="p-3 hover:bg-white/5 rounded-xl text-rose-900/40 hover:text-rose-400 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed btn"
            title="Copy to clipboard"
          >
            {copied ? (
              <Check className="w-5 h-5 text-emerald-500" />
            ) : (
              <Copy className="w-5 h-5" />
            )}
          </button>

          {/* Insert Text Button */}
          <button
            onClick={async () => {
              if (!transcript) return;
              setIsInserting(true);

              // Give user 500ms to switch to target app
              await new Promise(r => setTimeout(r, 500));

              try {
                await injectText(transcript);
                // Brief success feedback
                setTimeout(() => setIsInserting(false), 200);
              } catch (err) {
                console.error("Failed to insert text:", err);
                setIsInserting(false);
              }
            }}
            disabled={!transcript || isInserting}
            className="p-3 hover:bg-white/5 rounded-xl text-rose-900/40 hover:text-rose-400 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed btn"
            title="Insert text into focused app (click, then quickly switch to target app)"
          >
            {isInserting ? (
              <div className="w-5 h-5 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </footer>
    </div>
  );
}

export default App;
