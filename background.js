chrome.runtime.onMessage.addListener((msg) => {
    if(msg.action === 'log_event') {
        chrome.storage.local.get({logs: []}, results => {
            const updatedLogs = [...results.logs, msg.event]
            chrome.storage.local.set({logs: updatedLogs})
        })
    }
})