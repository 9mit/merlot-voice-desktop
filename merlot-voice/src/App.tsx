// src/App.tsx
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
      clearTranscript();
      startRecording();
    }
  };

  return (
    <div className="relative flex h-[100dvh] overflow-hidden bg-gradient-to-br from-[#FAF8F5] via-[#FCFAF7] to-[#FAF6EE] select-none">

      {/* Subtle decorative champagne and gold blurs */}
      <div className="absolute top-[-10%] right-[-5%] w-[450px] h-[450px] bg-[#C5A059]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[380px] h-[380px] bg-[#0A2540]/3 rounded-full blur-[100px] pointer-events-none" />

      {/* Desktop Sidebar (Cream system) */}
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
      <div className="relative z-10 flex-1 flex flex-col overflow-hidden h-full">

        {/* Global Header (Developer's Black with Gold trim) */}
        <header className="flex items-center justify-between px-5 md:px-7 py-3.5 bg-[#111111] border-b border-[#C5A059]/30 shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            {/* Mobile menu button */}
            <button 
              className="md:hidden p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors" 
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="p-2.5 bg-[#1E1E1E] rounded-xl border border-[#C5A059]/35 shadow-sm shadow-black flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-[#C5A059]" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-widest text-[#FAF8F5] editorial-sans uppercase flex items-center gap-1">
                Merlot<span className="text-[#C5A059] font-normal">Voice</span>
              </h1>
              <span className="text-[8px] uppercase tracking-[0.3em] text-slate-500 font-bold block">
                Premium Dictation Suite
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isPTTMode && (
              <div className="hidden sm:flex items-center gap-2.5 px-3.5 py-1.5 bg-[#1E1E1E] rounded-full border border-[#C5A059]/25 shadow-sm">
                <Keyboard className="w-3.5 h-3.5 text-[#C5A059]" />
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">PTT HOTKEY:</span>
                <span className="text-[9px] font-bold text-white uppercase tracking-wider px-1.5 py-0.5 bg-[#0A2540] rounded-md border border-[#C5A059]/20 font-mono">Alt+G</span>
                <div className={`w-1.5 h-1.5 rounded-full ${
                  pttStatus === "recording" 
                    ? "bg-red-500 animate-pulse" 
                    : pttStatus === "injecting" 
                      ? "bg-amber-500" 
                      : "bg-[#C5A059]"
                }`} />
              </div>
            )}
          </div>
        </header>

        {/* Global Error Banner */}
        {error && (
          <div className="absolute top-18 left-1/2 -translate-x-1/2 z-30 px-6 py-3 bg-[#FAF6EE] text-[#111111] text-xs font-bold rounded-xl border border-[#C5A059] shadow-2xl animate-luxury-fade uppercase tracking-widest flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
            <span>{error}</span>
          </div>
        )}

        {/* Standard Recording Banner */}
        {isRecording && pttStatus !== "recording" && (
          <div className="absolute top-18 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2.5 px-5 py-2.5 bg-[#111111] rounded-xl border border-[#C5A059]/40 shadow-2xl animate-luxury-fade">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
            <span className="text-[10px] uppercase tracking-widest font-bold text-red-400">Recording Audio Live</span>
          </div>
        )}

        {/* PTT Injection Banner */}
        {pttStatus === "injecting" && (
          <div className="absolute top-18 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2.5 px-5 py-2.5 bg-[#111111] rounded-xl border border-[#C5A059]/40 shadow-2xl animate-luxury-fade">
            <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
            <span className="text-[10px] uppercase tracking-widest font-bold text-[#C5A880]">Injecting Into Focused App</span>
          </div>
        )}

        {/* Notepad Editor Wrapper */}
        <div className="flex-1 overflow-hidden relative">
          <NotepadEditor
            file={activeFile}
            interimTranscript={interimTranscript}
            isRecording={isRecording}
            onContentChange={updateFileContent}
            onCopy={handleCopy}
            copied={copied}
            onDownload={downloadFile}
          />
        </div>

        {/* Luxury Control Dock (Developer's Black + Gold border) */}
        <div className="shrink-0 flex justify-center pb-5 md:pb-6 pt-3 px-4 bg-gradient-to-t from-[#F3ECE0]/30 to-transparent">
          <div className="flex items-center gap-4 px-6 py-3.5 bg-[#111111] rounded-2xl border border-[#C5A059]/35 shadow-xl shadow-black/20">

            {/* Record / Stop Toggle (Royal Blue and Red active status) */}
            <button
              onClick={handleToggleRecording}
              className={`relative w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all duration-300 shadow-md luxury-btn ${
                isRecording
                  ? "bg-red-600 hover:bg-red-700 border-red-400 scale-95 animate-luxury-glow"
                  : "bg-[#0A2540] hover:bg-[#C5A059] border-[#C5A059]/40 hover:scale-105 hover:shadow-[#C5A059]/10"
              }`}
              title={isRecording ? "Stop dictation" : "Start dictation"}
            >
              {isRecording ? (
                <Square className="w-4 h-4 text-white fill-white" />
              ) : (
                <Mic className="w-5.5 h-5.5 text-white group-hover:text-[#111111]" />
              )}
            </button>

            {/* Premium Copy */}
            <button
              onClick={handleCopy}
              disabled={!activeFile?.content}
              className="p-3 hover:bg-[#1E1E1E] border border-transparent hover:border-[#C5A059]/20 rounded-xl text-[#C5A059] hover:text-[#FAF8F5] transition-all disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              title="Copy all note text"
            >
              {copied ? <Check className="w-4.5 h-4.5 text-emerald-500" /> : <Copy className="w-4.5 h-4.5" />}
            </button>

            {/* Direct Injection Control */}
            <button
              onClick={async () => {
                if (!activeFile?.content) return;
                setIsInserting(true);
                await new Promise(r => setTimeout(r, 500));
                try { 
                  await injectText(activeFile.content); 
                  setTimeout(() => setIsInserting(false), 200); 
                } catch { 
                  setIsInserting(false); 
                }
              }}
              disabled={!activeFile?.content || isInserting}
              className="p-3 hover:bg-[#1E1E1E] border border-transparent hover:border-[#C5A059]/20 rounded-xl text-[#C5A059] hover:text-[#FAF8F5] transition-all disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              title="Insert note text into currently focused application window"
            >
              {isInserting ? (
                <div className="w-4.5 h-4.5 border-2 border-[#C5A059] border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-4.5 h-4.5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar overlay (Rich frosted backdrop) */}
      {mobileSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div 
            className="absolute inset-0 bg-[#111111]/30 backdrop-blur-md transition-opacity duration-300" 
            onClick={() => setMobileSidebarOpen(false)} 
          />
          <div className="relative z-10 animate-luxury-slide shadow-2xl h-full">
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
