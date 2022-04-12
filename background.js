chrome.runtime.onInstalled.addListener(function () {
    chrome.tabs.query({ url: '<all_urls>' }, function (tabs) {
        tabs.forEach(el => chrome.tabs.reload(el['id']))
    });
});

chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        sendResponse();
        if (request.hasOwnProperty('extension_on')) {
            chrome.action.setIcon({ tabId: sender.tab.id, path: { "32": request.extension_on ? "icons/icong32.png" : "icons/iconb32.png" } });
        }
        if (request.hasOwnProperty('seconds_left')) {
            chrome.action.setBadgeText({ tabId: sender.tab.id, text: request.seconds_left });
        }
        if (request.hasOwnProperty('new_title')) {
            chrome.action.setTitle({ tabId: sender.tab.id, title: request.new_title })
        }
        if (request.reload_page) {
            chrome.tabs.reload(sender.tab.id, { bypassCache: request.nocache === true });
        }
    }
);
