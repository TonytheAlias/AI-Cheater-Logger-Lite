// Error logging helper
function logError(context, error) {
    console.error(`[Background Error - ${context}]:`, error);
}

// Handle incoming messages from content script
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'log_event') {
        handleLogEvent(msg.event, sendResponse);
        return true; // Keep channel open for async response
    } else if (msg.action === 'batch_log_events') {
        handleBatchLogEvents(msg.events, sendResponse);
        return true;
    }
});

// Handle single event logging
async function handleLogEvent(event, sendResponse) {
    try {
        const result = await chrome.storage.local.get({logs: []});
        const updatedLogs = [...result.logs, event];
        await chrome.storage.local.set({logs: updatedLogs});
        sendResponse({success: true});
    } catch (error) {
        logError('handleLogEvent', error);
        sendResponse({success: false, error: error.message});
    }
}

// Handle batch event logging (more efficient)
async function handleBatchLogEvents(events, sendResponse) {
    try {
        if (!events || events.length === 0) {
            sendResponse({success: true, count: 0});
            return;
        }

        const result = await chrome.storage.local.get({logs: []});
        const updatedLogs = [...result.logs, ...events];
        
        // Check storage size (Chrome has ~10MB limit for local storage)
        const storageSize = JSON.stringify(updatedLogs).length;
        const maxSize = 9 * 1024 * 1024; // 9MB to leave buffer
        
        if (storageSize > maxSize) {
            console.warn('Storage approaching limit, consider clearing old logs');
            // Keep only the most recent 80% of logs
            const logsToKeep = Math.floor(updatedLogs.length * 0.8);
            await chrome.storage.local.set({
                logs: updatedLogs.slice(-logsToKeep)
            });
            sendResponse({success: true, count: events.length, warning: 'storage_limit'});
        } else {
            await chrome.storage.local.set({logs: updatedLogs});
            sendResponse({success: true, count: events.length});
        }
    } catch (error) {
        logError('handleBatchLogEvents', error);
        sendResponse({success: false, error: error.message});
    }
}