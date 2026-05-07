import React, { useState, useEffect, useRef, useCallback } from "react";
import "./index.css";
import { useTranscription } from "./hooks/useTranscription";
import { useFileManager } from "./hooks/useFileManager";
import { setupPushToTalkListeners, injectText } from "./services/pushToTalkService";
import { Mic, Square, Copy, Check, Sparkles, Keyboard, Send, Menu } from "lucide-react";
import FileSidebar from "./components/FileSidebar";
import NotepadEditor from "./components/NotepadEditor";

function App() {
  const [copied, setCopied] = useState(false);
  const [isInserting, setIsInserting] = useState(false);
  const [isPTTMode, setIsPTTMode] = useState(false);
  const [pttStatus, setPttStatus] = useState<"idle" | "recording" | "injecting">("idle");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const {
    isRecording, transcript, interimTranscript, error,
    startRecording, stopRecording, clearTranscript,
  } = useTranscription();

  const {
    files, activeFile, activeFileId,
    createFile, deleteFile, renameFile, updateFileContent,
    appendToFile, downloadFile, selectFile,
  } = useFileManager();

  // Auto-create a file if none exist (check localStorage directly to survive StrictMode)
  useEffect(() => {
    const stored = localStorage.getItem("merlot-voice-files");
    const storedFiles = stored ? JSON.parse(stored) : [];
    if (storedFiles.length === 0 && files.length === 0) {
      createFile("My First Note");
    }
  }, []);

  // When transcript updates (final text), append it to the active file
  const prevTranscriptRef = useRef("");
  useEffect(() => {
    if (transcript && transcript !== prevTranscriptRef.current && activeFileId) {
      const newText = transcript.startsWith(prevTranscriptRef.current)
        ? transcript.slice(prevTranscriptRef.current.length).trim()
        : transcript;
      if (newText) {
        appendToFile(activeFileId, newText);
      }
    }
    prevTranscriptRef.current = transcript;
  }, [transcript, activeFileId, appendToFile]);

  // Track transcript for PTT injection
  const transcriptRef = useRef(transcript);
  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  // Handle PTT stop
  const handlePTTStop = useCallback(async () => {
    stopRecording();
    setPttStatus("injecting");
    let attempts = 0;
    while (attempts < 20) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      attempts++;
      if (transcriptRef.current?.trim()) break;
    }
    const textToInject = transcriptRef.current;
    if (textToInject?.trim()) {
      try { await injectText(textToInject); } catch (err) { console.error("PTT inject error:", err); }
    }
    clearTranscript();
    setPttStatus("idle");
  }, [stopRecording, clearTranscript]);

  // Handle PTT start
  const handlePTTStart = useCallback(() => {
    setPttStatus("recording");
    clearTranscript();
    startRecording();
  }, [startRecording, clearTranscript]);

  // Setup push-to-talk listeners
  useEffect(() => {
    let cleanup: (() => void) | null = null;
    setupPushToTalkListeners({ onStart: handlePTTStart, onStop: handlePTTStop })
      .then((cleanupFn) => { cleanup = cleanupFn; setIsPTTMode(true); })
      .catch(() => setIsPTTMode(false));
    return () => { if (cleanup) cleanup(); };
  }, [handlePTTStart, handlePTTStop]);

  const handleCopy = async () => {
    if (!activeFile?.content) return;
    try {
      await navigator.clipboard.writeText(activeFile.content);
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
    <div className="relative flex h-[100dvh] overflow-hidden bg-gradient-to-br from-[#f0f4ff] via-[#e8efff] to-[#f5f3ff]">

      {/* Subtle decorative blurs */}
      <div className="absolute top-[-15%] right-[-5%] w-[500px] h-[500px] bg-blue-200/30 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-indigo-200/20 rounded-full blur-[100px] pointer-events-none" />

      {/* Desktop Sidebar */}
      <div className="relative z-20 hidden md:flex">
        <FileSidebar
          files={files}
          activeFileId={activeFileId}
          onSelectFile={selectFile}
          onCreateFile={() => createFile()}
          onDeleteFile={deleteFile}
          onRenameFile={renameFile}
          onDownloadFile={downloadFile}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <header className="flex items-center justify-between px-4 md:px-6 py-3 bg-white/80 backdrop-blur-md border-b border-slate-200/80 shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile menu */}
            <button className="md:hidden p-2 hover:bg-blue-50 rounded-lg text-slate-500" onClick={() => setMobileSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>
            <div className="p-2 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-md shadow-blue-200 border border-blue-500/20">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight text-slate-800">
                Merlot<span className="text-blue-600">Voice</span>
              </h1>
              <span className="text-[9px] uppercase tracking-[0.2em] text-slate-400 font-semibold hidden sm:inline">
                Voice Notepad
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isPTTMode && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-full border border-slate-200">
                <Keyboard className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-[10px] font-semibold text-slate-500">Alt+G</span>
                <div className={`w-1.5 h-1.5 rounded-full ${pttStatus === "recording" ? "bg-red-500 animate-pulse" : pttStatus === "injecting" ? "bg-amber-500" : "bg-emerald-500"}`} />
              </div>
            )}
          </div>
        </header>

        {/* Error Toast */}
        {error && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 px-5 py-2.5 bg-red-50 text-red-700 text-xs font-medium rounded-full border border-red-200 shadow-lg animate-fade-in">
            {error}
          </div>
        )}

        {/* Recording Indicator */}
        {isRecording && pttStatus !== "recording" && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-red-200 shadow-lg animate-fade-in">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-xs font-semibold text-slate-700">Recording...</span>
          </div>
        )}

        {/* Injecting indicator */}
        {pttStatus === "injecting" && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-amber-200 shadow-lg animate-fade-in">
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
            <span className="text-xs font-semibold text-slate-700">Injecting text...</span>
          </div>
        )}

        {/* Notepad Editor */}
        <NotepadEditor
          file={activeFile}
          interimTranscript={interimTranscript}
          isRecording={isRecording}
          onContentChange={updateFileContent}
          onCopy={handleCopy}
          copied={copied}
          onDownload={downloadFile}
        />

        {/* Control Dock */}
        <div className="shrink-0 flex justify-center pb-4 md:pb-5 pt-2 px-4">
          <div className="flex items-center gap-3 px-5 py-3 bg-white rounded-2xl border border-slate-200 shadow-lg shadow-blue-100/50">

            {/* Record Button */}
            <button
              onClick={handleToggleRecording}
              className={`relative w-14 h-14 rounded-full flex items-center justify-center border-[3px] transition-all duration-300 shadow-lg btn ${isRecording
                ? "bg-gradient-to-br from-red-500 to-red-600 border-red-400 scale-95 animate-pulse-glow"
                : "bg-gradient-to-br from-blue-500 to-blue-700 border-blue-400 hover:scale-105 hover:shadow-blue-300/50"
                }`}
              title={isRecording ? "Stop recording" : "Start recording"}
            >
              {isRecording ? (
                <Square className="w-5 h-5 text-white fill-white" />
              ) : (
                <Mic className="w-6 h-6 text-white" />
              )}
            </button>

            {/* Copy */}
            <button
              onClick={handleCopy}
              disabled={!activeFile?.content}
              className="p-2.5 hover:bg-blue-50 rounded-xl text-slate-400 hover:text-blue-600 transition-all disabled:opacity-20 disabled:cursor-not-allowed btn"
              title="Copy to clipboard"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>

            {/* Insert Text */}
            <button
              onClick={async () => {
                if (!activeFile?.content) return;
                setIsInserting(true);
                await new Promise(r => setTimeout(r, 500));
                try { await injectText(activeFile.content); setTimeout(() => setIsInserting(false), 200); }
                catch { setIsInserting(false); }
              }}
              disabled={!activeFile?.content || isInserting}
              className="p-2.5 hover:bg-blue-50 rounded-xl text-slate-400 hover:text-blue-600 transition-all disabled:opacity-20 disabled:cursor-not-allowed btn"
              title="Insert into focused app"
            >
              {isInserting ? (
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setMobileSidebarOpen(false)} />
          <div className="relative z-10 animate-slide-in shadow-2xl">
            <FileSidebar
              files={files}
              activeFileId={activeFileId}
              onSelectFile={(id) => { selectFile(id); setMobileSidebarOpen(false); }}
              onCreateFile={() => { createFile(); setMobileSidebarOpen(false); }}
              onDeleteFile={deleteFile}
              onRenameFile={renameFile}
              onDownloadFile={downloadFile}
              collapsed={false}
              onToggleCollapse={() => setMobileSidebarOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
