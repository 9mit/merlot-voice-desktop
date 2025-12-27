// src/services/pushToTalkService.ts
// Service for handling system-wide push-to-talk functionality

import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";

export interface PushToTalkCallbacks {
    onStart: () => void;
    onStop: () => void;
}

/**
 * Sets up listeners for push-to-talk events from the Tauri backend.
 * When Ctrl+Shift+Space is pressed, onStart is called.
 * When Ctrl+Shift+Space is released, onStop is called.
 * 
 * @returns A cleanup function to unsubscribe from events
 */
export async function setupPushToTalkListeners(
    callbacks: PushToTalkCallbacks
): Promise<() => void> {
    const unlisteners: UnlistenFn[] = [];

    // Listen for push-to-talk start event (hotkey pressed)
    const unlistenStart = await listen("ptt-start", () => {
        console.log("PTT: Received start event from backend");
        callbacks.onStart();
    });
    unlisteners.push(unlistenStart);

    // Listen for push-to-talk stop event (hotkey released)
    const unlistenStop = await listen("ptt-stop", () => {
        console.log("PTT: Received stop event from backend");
        callbacks.onStop();
    });
    unlisteners.push(unlistenStop);

    // Return cleanup function
    return () => {
        unlisteners.forEach((unlisten) => unlisten());
    };
}

/**
 * Injects text into the currently focused text input by:
 * 1. Writing text to system clipboard
 * 2. Simulating Ctrl+V paste
 * 
 * @param text The text to inject
 */
export async function injectText(text: string): Promise<void> {
    if (!text || text.trim() === "") {
        console.log("PTT: No text to inject, skipping");
        return;
    }

    try {
        console.log("PTT: Injecting text:", text.substring(0, 50) + "...");
        await invoke("inject_text", { text });
        console.log("PTT: Text injected successfully");
    } catch (error) {
        console.error("PTT: Failed to inject text:", error);
        throw error;
    }
}
