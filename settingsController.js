class SettingsController {
    static defaultSettings() {
        // default settings for url_settings & domain_settings
        return {
            byinterval: {
                enable: true,
                interval_val: 60,
            },
            bytime: {
                enable: false,
                time_val: []
            },
            nocache: {
                enable: false
            },
            scrollrestoration: {
                enable: false,
                restore_delay: 3
            }
        };
    }

    static isValidURL(url) {
        try {
            let testURL = new URL(url);
            return testURL.protocol === "http:" || testURL.protocol === "https:";
        } catch {
            return false;
        }
    }

    static async overrideURLSettings(domain) {
        let data = await chrome.storage.local.get(null);
        let required_urls = Object.keys(data).filter(e1 => (e1.includes('http://') || e1.includes('https://')) && e1.includes(domain) && data[e1]['enable']);

        let new_data = {};
        required_urls.forEach(e1 => {
            new_data[e1] = data[e1];
            new_data[e1]['enable'] = null;
        });
        await chrome.storage.local.set(new_data);
    }

    async saveSettings(new_data) {
        await chrome.storage.local.set(new_data);
        this.activateSettings();
    }

    async activateSettings() {
        let tabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] });
        tabs.forEach(el => chrome.tabs.sendMessage(el['id'], {}));
    }
}