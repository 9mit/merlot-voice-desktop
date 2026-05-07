// src/hooks/useFileManager.ts
// Manages voice-note files with localStorage persistence

import { useState, useCallback, useEffect } from "react";

export interface VoiceFile {
  id: string;
  name: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = "merlot-voice-files";
const ACTIVE_FILE_KEY = "merlot-voice-active-file";

const generateId = () =>
  `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

const loadFiles = (): VoiceFile[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveFiles = (files: VoiceFile[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
};

const loadActiveFileId = (): string | null => {
  return localStorage.getItem(ACTIVE_FILE_KEY);
};

const saveActiveFileId = (id: string | null) => {
  if (id) {
    localStorage.setItem(ACTIVE_FILE_KEY, id);
  } else {
    localStorage.removeItem(ACTIVE_FILE_KEY);
  }
};

export const useFileManager = () => {
  const [files, setFiles] = useState<VoiceFile[]>(() => loadFiles());
  const [activeFileId, setActiveFileId] = useState<string | null>(() => {
    const savedId = loadActiveFileId();
    const existingFiles = loadFiles();
    // Verify the saved ID still exists
    if (savedId && existingFiles.find((f) => f.id === savedId)) {
      return savedId;
    }
    return existingFiles.length > 0 ? existingFiles[0].id : null;
  });

  // Persist files whenever they change
  useEffect(() => {
    saveFiles(files);
  }, [files]);

  // Persist active file ID
  useEffect(() => {
    saveActiveFileId(activeFileId);
  }, [activeFileId]);

  const activeFile = files.find((f) => f.id === activeFileId) || null;

  const createFile = useCallback((name?: string) => {
    const newFile: VoiceFile = {
      id: generateId(),
      name: name || `Untitled ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`,
      content: "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setFiles((prev) => [newFile, ...prev]);
    setActiveFileId(newFile.id);
    return newFile;
  }, []);

  const deleteFile = useCallback(
    (id: string) => {
      setFiles((prev) => {
        const updated = prev.filter((f) => f.id !== id);
        if (activeFileId === id) {
          setActiveFileId(updated.length > 0 ? updated[0].id : null);
        }
        return updated;
      });
    },
    [activeFileId]
  );

  const renameFile = useCallback((id: string, newName: string) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === id ? { ...f, name: newName, updatedAt: Date.now() } : f
      )
    );
  }, []);

  const updateFileContent = useCallback((id: string, content: string) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === id ? { ...f, content, updatedAt: Date.now() } : f
      )
    );
  }, []);

  const appendToFile = useCallback((id: string, text: string) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === id
          ? {
              ...f,
              content: f.content ? f.content + " " + text : text,
              updatedAt: Date.now(),
            }
          : f
      )
    );
  }, []);

  const downloadFile = useCallback(
    (id: string) => {
      const file = files.find((f) => f.id === id);
      if (!file) return;

      const blob = new Blob([file.content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${file.name}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    [files]
  );

  const selectFile = useCallback((id: string) => {
    setActiveFileId(id);
  }, []);

  return {
    files,
    activeFile,
    activeFileId,
    createFile,
    deleteFile,
    renameFile,
    updateFileContent,
    appendToFile,
    downloadFile,
    selectFile,
  };
};
