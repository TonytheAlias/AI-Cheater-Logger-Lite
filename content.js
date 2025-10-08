// Constants
const BATCH_INTERVAL = 2000; // Send events every 2 seconds
const KEYSTROKE_DEBOUNCE = 500; // Log keystrokes every 500ms
const IDLE_THRESHOLD = 10000; // 10 seconds of no mouse movement

// Event buffer for batching
let eventBuffer = [];
let batchTimer = null;

// Debounce and tracking variables
let lastKeyTime = null;
let keystrokeCount = 0;
let lastKeystrokeLog = Date.now();
let isIdle = false;
let lastMove = Date.now();

// Error logging
function logError(context, error) {
    console.error(`[Content Script Error - ${context}]:`, error);
}

// Get problem name from URL
function getProblemName() {
    try {
        const url = window.location.href;

        if (url.includes("leetcode.com")) {
            return window.location.pathname.split("/problems/")[1]?.split("/")[0] || "leetcode-unknown";
        }
        if (url.includes("hackerrank.com")) {
            return window.location.pathname.split("/challenges/")[1]?.split("/")[0] || "hackerrank-unknown";
        }
        if (url.includes("codesignal.com")) {
            return document.title.split("|")[0].trim() || "codesignal-unknown";
        }
        if (url.includes("codility.com")) {
            return document.title.split("|")[0].trim() || "codility-unknown";
        }
        if (url.includes("hackerearth.com")) {
            return window.location.pathname.split("/problem/")[1]?.split("/")[0] || "hackerearth-unknown";
        }

        return "unknown";
    } catch (error) {
        logError('getProblemName', error);
        return "error-getting-name";
    }
}

// Add event to buffer
function bufferEvent(eventType, data = {}) {
    try {
        const event = {
            e: eventType,
            ...data,
            problem: getProblemName(),
            timestamp: Date.now()
        };
        
        eventBuffer.push(event);

        // Start batch timer if not already running
        if (!batchTimer) {
            batchTimer = setTimeout(flushEventBuffer, BATCH_INTERVAL);
        }
    } catch (error) {
        logError('bufferEvent', error);
    }
}

// Send buffered events to background script
async function flushEventBuffer() {
    if (eventBuffer.length === 0) {
        batchTimer = null;
        return;
    }

    const eventsToSend = [...eventBuffer];
    eventBuffer = [];
    batchTimer = null;

    try {
        await chrome.runtime.sendMessage({
            action: 'batch_log_events',
            events: eventsToSend
        });
    } catch (error) {
        logError('flushEventBuffer', error);
        // Put events back in buffer if send failed
        eventBuffer = [...eventsToSend, ...eventBuffer];
    }
}

// Debounced keystroke tracking
document.addEventListener("keydown", (e) => {
    try {
        const currentTime = Date.now();
        keystrokeCount++;

        // Calculate typing speed if we have a previous keystroke
        let typingSpeed = null;
        if (lastKeyTime !== null) {
            typingSpeed = currentTime - lastKeyTime;
        }
        lastKeyTime = currentTime;

        // Only log keystroke data every KEYSTROKE_DEBOUNCE milliseconds
        if (currentTime - lastKeystrokeLog >= KEYSTROKE_DEBOUNCE) {
            bufferEvent("keystroke_batch", {
                count: keystrokeCount,
                avgTypingSpeed: typingSpeed,
                duration: currentTime - lastKeystrokeLog
            });
            
            keystrokeCount = 0;
            lastKeystrokeLog = currentTime;
        }
    } catch (error) {
        logError('keydown handler', error);
    }
});

// Paste detection
document.addEventListener("paste", () => {
    try {
        bufferEvent("paste");
    } catch (error) {
        logError('paste handler', error);
    }
});

// Tab visibility changes
document.addEventListener("visibilitychange", () => {
    try {
        if (document.hidden) {
            bufferEvent("tab_switch");
            // Flush immediately on tab switch (important event)
            flushEventBuffer();
        } else {
            bufferEvent("tab_return");
        }
    } catch (error) {
        logError('visibilitychange handler', error);
    }
});

// Improved idle detection
document.addEventListener('mousemove', () => {
    try {
        const currentTime = Date.now();
        
        // User was idle and is now active again
        if (isIdle) {
            bufferEvent('active_return', {
                idleDuration: currentTime - lastMove
            });
            isIdle = false;
        }
        
        lastMove = currentTime;
    } catch (error) {
        logError('mousemove handler', error);
    }
});

// Check for idle state periodically
setInterval(() => {
    try {
        const currentTime = Date.now();
        const timeSinceMove = currentTime - lastMove;
        
        // User has been idle for threshold duration
        if (!isIdle && timeSinceMove >= IDLE_THRESHOLD) {
            bufferEvent('idle_detected');
            isIdle = true;
        }
    } catch (error) {
        logError('idle check interval', error);
    }
}, 5000);

// Log session start
bufferEvent('session_start');

// Flush buffer before page unload
window.addEventListener('beforeunload', () => {
    try {
        flushEventBuffer();
    } catch (error) {
        logError('beforeunload handler', error);
    }
});