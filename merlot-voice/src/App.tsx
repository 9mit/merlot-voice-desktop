import React, { useState, useEffect, useRef, useCallback } from "react";
import "./index.css";
import { useTranscription } from "./hooks/useTranscription";
import { useFileManager } from "./hooks/useFileManager";
import { setupPushToTalkListeners, injectText } from "./services/pushToTalkService";
import { Mic, Square, Copy, Check, Sparkles, Keyboard, Send } from "lucide-react";
import FileSidebar from "./components/FileSidebar";
import NotepadEditor from "./components/NotepadEditor";

function App() {
  const [copied, setCopied] = useState(false);
  const [isInserting, setIsInserting] = useState(false);
  const [isPTTMode, setIsPTTMode] = useState(false);
  const [pttStatus, setPttStatus] = useState<"idle" | "recording" | "injecting">("idle");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const {
    isRecording, transcript, interimTranscript, error,
    startRecording, stopRecording, clearTranscript,
  } = useTranscription();

  const {
    files, activeFile, activeFileId,
    createFile, deleteFile, renameFile, updateFileContent,
    appendToFile, downloadFile, selectFile,
  } = useFileManager();

  // Auto-create a file if none exist
  const hasAutoCreated = useRef(false);
  useEffect(() => {
    if (files.length === 0 && !hasAutoCreated.current) {
      hasAutoCreated.current = true;
      createFile("My First Note");
    }
  }, [files.length, createFile]);

  // When transcript updates (final text), append it to the active file
  const prevTranscriptRef = useRef("");
  useEffect(() => {
    if (transcript && transcript !== prevTranscriptRef.current && activeFileId) {
      // Find the new text that was added
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

  // Handle PTT stop - inject text and clear
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

  // Setup push-to-talk listeners on mount
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
    <div className="relative flex h-[100dvh] overflow-hidden bg-gradient-to-br from-[#0a0103] via-[#1a0308] to-[#0a0103]">

      {/* Ambient Background Effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-[#4a0412]/20 rounded-full blur-[128px] pointer-events-none animate-pulse" style={{ animationDuration: '4s' }} />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-[#2e0209]/30 rounded-full blur-[128px] pointer-events-none" />

      {/* Sidebar */}
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
        <header className="flex items-center justify-between px-4 md:px-6 py-3 glass border-b border-rose-900/10 shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile sidebar toggle */}
            <button className="md:hidden p-2 hover:bg-white/5 rounded-lg text-rose-400/60" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <div className="p-2 bg-gradient-to-br from-[#881337] to-[#4c0519] rounded-xl shadow-lg border border-white/10">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight text-white">
                Merlot<span className="text-rose-400">Voice</span>
              </h1>
              <span className="text-[9px] uppercase tracking-[0.2em] text-rose-200/30 font-medium hidden sm:inline">
                Voice Notepad
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* PTT Status */}
            {isPTTMode && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 glass rounded-full border border-rose-500/20">
                <Keyboard className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-[10px] font-medium text-rose-200/50">Alt+G</span>
                <div className={`w-1.5 h-1.5 rounded-full ${pttStatus === "recording" ? "bg-rose-500 animate-pulse" : pttStatus === "injecting" ? "bg-amber-500" : "bg-emerald-500/50"}`} />
              </div>
            )}
          </div>
        </header>

        {/* Error Toast */}
        {error && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 px-5 py-2.5 bg-red-900/90 backdrop-blur-sm text-red-100 text-xs rounded-full border border-red-500/30 shadow-lg animate-fade-in">
            {error}
          </div>
        )}

        {/* Recording Indicator */}
        {isRecording && pttStatus !== "recording" && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-4 py-2 glass rounded-full border border-rose-500/20 animate-fade-in">
            <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
            <span className="text-xs font-medium text-rose-100">Recording...</span>
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
        <div className="shrink-0 flex justify-center pb-4 md:pb-6 pt-2">
          <div className="flex items-center gap-3 px-5 py-3 glass rounded-2xl border border-rose-500/10 shadow-2xl">

            {/* Record Button */}
            <button
              onClick={handleToggleRecording}
              className={`relative w-14 h-14 rounded-full flex items-center justify-center border-[3px] transition-all duration-300 shadow-xl btn ${isRecording
                ? "bg-gradient-to-br from-[#881337] to-[#4c0519] border-rose-700 scale-95 animate-pulse-glow"
                : "bg-gradient-to-br from-[#2a060b] to-[#3f0914] border-rose-900/30 hover:border-rose-700/50 hover:scale-105"
                }`}
              title={isRecording ? "Stop recording" : "Start recording"}
            >
              {isRecording ? (
                <Square className="w-6 h-6 text-white fill-white" />
              ) : (
                <Mic className="w-6 h-6 text-rose-400" />
              )}
            </button>

            {/* Copy */}
            <button
              onClick={handleCopy}
              disabled={!activeFile?.content}
              className="p-2.5 hover:bg-white/5 rounded-xl text-rose-900/40 hover:text-rose-400 transition-all disabled:opacity-20 disabled:cursor-not-allowed btn"
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
              className="p-2.5 hover:bg-white/5 rounded-xl text-rose-900/40 hover:text-rose-400 transition-all disabled:opacity-20 disabled:cursor-not-allowed btn"
              title="Insert into focused app"
            >
              {isInserting ? (
                <div className="w-4 h-4 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {!sidebarCollapsed && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarCollapsed(true)} />
          <div className="relative z-10 animate-fade-in">
            <FileSidebar
              files={files}
              activeFileId={activeFileId}
              onSelectFile={(id) => { selectFile(id); setSidebarCollapsed(true); }}
              onCreateFile={() => { createFile(); setSidebarCollapsed(true); }}
              onDeleteFile={deleteFile}
              onRenameFile={renameFile}
              onDownloadFile={downloadFile}
              collapsed={false}
              onToggleCollapse={() => setSidebarCollapsed(true)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
