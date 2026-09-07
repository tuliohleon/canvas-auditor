chrome.runtime.onMessage.addListener((message, sender) => {
    if (message.action === 'logError' && sender.tab) {
        const tabId = sender.tab.id;
        chrome.storage.local.get({errors: {}}, (data) => {
            if (!data.errors[tabId]) data.errors[tabId] = [];
            data.errors[tabId].push(message.error);
            chrome.storage.local.set({errors: data.errors});
        });
    }
    return true;
});

// Limpiar al recargar o cambiar de URL
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === 'loading') {
        chrome.storage.local.get({errors: {}}, (data) => {
            if (data.errors[tabId]) {
                delete data.errors[tabId];
                chrome.storage.local.set({errors: data.errors});
            }
        });
    }
});

// Limpiar al cerrar pestaña
chrome.tabs.onRemoved.addListener((tabId) => {
    chrome.storage.local.get({errors: {}}, (data) => {
        if (data.errors[tabId]) {
            delete data.errors[tabId];
            chrome.storage.local.set({errors: data.errors});
        }
    });
});