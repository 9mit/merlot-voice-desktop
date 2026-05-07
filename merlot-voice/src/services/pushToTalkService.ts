// src/services/pushToTalkService.ts
// Service for handling system-wide push-to-talk functionality

export interface PushToTalkCallbacks {
    onStart: () => void;
    onStop: () => void;
}

const isTauri = (): boolean => {
    return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
};

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
    if (!isTauri()) {
        console.warn("PTT: Running in browser, Tauri hotkeys not available.");
        return () => {};
    }

    try {
        const { listen } = await import("@tauri-apps/api/event");
        const unlisteners: (() => void)[] = [];

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
    } catch (e) {
        console.error("PTT: Failed to load Tauri event API", e);
        return () => {};
    }
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

    if (!isTauri()) {
        console.warn("PTT: Running in browser, text injection not available. Copying to clipboard instead.");
        try {
            await navigator.clipboard.writeText(text);
            console.log("PTT: Text copied to clipboard fallback");
        } catch (e) {
            console.error("PTT: Clipboard copy failed", e);
        }
        return;
    }

    try {
        const { invoke } = await import("@tauri-apps/api/core");
        console.log("PTT: Injecting text:", text.substring(0, 50) + "...");
        await invoke("inject_text", { text });
        console.log("PTT: Text injected successfully");
    } catch (error) {
        console.error("PTT: Failed to inject text:", error);
        throw error;
    }
}
