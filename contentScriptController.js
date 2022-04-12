class ContentScriptController {
    constructor() {
        this.timers = [];
    }

    async init() {
        // clear all timers
        if (this.timers.length > 0) {
            this.timers.forEach(el => clearTimeout(el));
            this.timers = [];
        }

        // get saved settings
        let saved_settings = await chrome.storage.local.get(['extension_on', window.location.href, window.location.host]);
        let active_settings = {
            extension_on: saved_settings['extension_on'] !== false,
            url_settings: saved_settings[window.location.href] ?? SettingsController.defaultSettings(),
            domain_settings: saved_settings[window.location.host] ?? SettingsController.defaultSettings()
        }

        // start new timer or not
        if (active_settings['extension_on'] && (
            active_settings['url_settings']['enable'] ||
            (active_settings['domain_settings']['enable'] && active_settings['url_settings']['enable'] !== false)
        )) {
            let use_settings = active_settings['url_settings']['enable'] ? active_settings['url_settings'] : active_settings['domain_settings'];
            // scrollrestoration
            if (use_settings['scrollrestoration']['enable']) {
                let x_pos = sessionStorage.getItem('x_pos');
                let y_pos = sessionStorage.getItem('y_pos');
                setTimeout(() => {
                    window.scrollTo(x_pos ?? 0, y_pos ?? 0);
                }, use_settings['scrollrestoration']['restore_delay'] * 1000);
            }
            // start timer
            this.startTimer(use_settings);
        } else {
            // reset countdown icon and text
            await chrome.runtime.sendMessage({ extension_on: false, seconds_left: '', new_title: '' });
        }
    }

    startTimer(use_settings) {
        let next_reload = [];
        let now_timestamp = new Date();

        if (use_settings['byinterval']['enable']) {
            next_reload.push(use_settings['byinterval']['interval_val'] * 1000);
        }
        if (use_settings['bytime']['enable']) {
            use_settings['bytime']['time_val'].map(el => {
                let target_arr = el.split(':');
                let target_timestamp = new Date(now_timestamp.getFullYear(), now_timestamp.getMonth(), now_timestamp.getDate(), parseInt(target_arr[0]), parseInt(target_arr[1]));
                if (now_timestamp.getTime() > target_timestamp.getTime()) {
                    target_timestamp.setDate(target_timestamp.getDate() + 1);
                }
                next_reload.push(target_timestamp.getTime() - now_timestamp.getTime());
            });
        }

        // sort and get the first one, set reload and countdown function for this
        if (next_reload.length > 0) {
            next_reload.sort((a, b) => a - b);
            this.setCountdown(next_reload[0], 10);
            this.timers.push(setTimeout(this.requestReload.bind(this), next_reload[0], use_settings));
            chrome.runtime.sendMessage({
                extension_on: true,
                new_title: 'This page will be reloaded on ' + new Date(now_timestamp.getTime() + next_reload[0]).toString()
            });
        }
    }

    setCountdown(total_ms_time, countdown_seconds) {
        let countdown_arr = [...Array(countdown_seconds).keys()];
        countdown_arr.forEach(e1 => {
            let minus_ms = e1 * 1000;
            if (total_ms_time > minus_ms) {
                this.timers.push(setTimeout(this.requestCountdown.bind(this), total_ms_time - minus_ms, e1.toString()));
            }
        })
    }

    requestCountdown(seconds_left) {
        chrome.runtime.sendMessage({ seconds_left: seconds_left });
    }

    requestReload(use_settings) {
        if (use_settings['scrollrestoration']['enable']) {
            sessionStorage.setItem('x_pos', window.pageXOffset);
            sessionStorage.setItem('y_pos', window.pageYOffset);
        }
        chrome.runtime.sendMessage({ reload_page: true, nocache: use_settings['nocache']['enable'] });
    }
}

let Controller = new ContentScriptController();
Controller.init();

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    sendResponse();
    Controller.init();
});
