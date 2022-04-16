class PopupController {
    constructor() {
        document.getElementById("extension_toggle").addEventListener("click", this.extensionToggle.bind(this));
        document.getElementById("extension_reset").addEventListener("click", this.extensionReset.bind(this));
        document.getElementById("this_url").addEventListener("change", this.changeTarget.bind(this, "this_url"));
        document.getElementById("this_domain").addEventListener("change", this.changeTarget.bind(this, "this_domain"));
        document.getElementById("override_url_settings").addEventListener("change", this.preferenceToggle.bind(this));
        document.getElementById("rs_form").addEventListener("submit", this.start.bind(this));
        document.getElementById("stop").addEventListener("click", this.stop.bind(this));
        document.getElementById("load_default").addEventListener("click", this.loadDefault.bind(this));

        // init SettingsController
        this.settings_controller = new SettingsController();
    }

    async init() {
        // get current tab url & domain
        let current_tab = await chrome.tabs.query({ currentWindow: true, active: true });
        let required_url = new URL(current_tab[0]['url']);
        this.url = required_url.href;
        this.domain = required_url.host;
        if (!SettingsController.isValidURL(this.url)) {
            window.close();
        }

        // get and parse saved settings
        let saved_settings = await chrome.storage.local.get(['extension_on', 'override_url_settings', this.url, this.domain]);
        this.active_settings = {
            extension_on: saved_settings['extension_on'] !== false,
            override_url_settings: saved_settings['override_url_settings'] !== false,
            url_settings: saved_settings[this.url] ?? SettingsController.defaultSettings(),
            domain_settings: saved_settings[this.domain] ?? SettingsController.defaultSettings()
        }
        this.renderView();
    }

    extensionToggle() {
        this.settings_controller
            .saveSettings({ extension_on: !this.active_settings['extension_on'] })
            .then(() => location.reload());
    }

    async extensionReset() {
        let agree = confirm('All settings will be reset to default value. Are you sure to continue?');
        if (agree) {
            await chrome.storage.local.clear();
            this.settings_controller
                .activateSettings()
                .then(() => location.reload());
        }
    }

    preferenceToggle(event) {
        let new_data = {};
        new_data[event.target.id] = event.target.checked;
        chrome.storage.local.set(new_data);
    }

    changeTarget(new_target) {
        this.renderView(new_target === "this_url" ? this.active_settings['url_settings'] : this.active_settings['domain_settings']);
    }

    renderView(target_settings) {
        // toggle button & reset button
        document.getElementById("extension_toggle").textContent = this.active_settings['extension_on'] ? "Extension: ON" : "Extension: OFF";
        document.getElementById("extension_toggle").className = this.active_settings['extension_on'] ? "btn btn-block btn-success" : "btn btn-block btn-danger";

        // choose display settings
        let render_settings = {};
        if (target_settings) {
            render_settings = target_settings;
        } else if (
            this.active_settings['domain_settings']['enable'] &&
            this.active_settings['url_settings']['enable'] !== true
        ) {
            render_settings = this.active_settings['domain_settings'];
            document.getElementById("this_domain").checked = true;
        } else {
            render_settings = this.active_settings['url_settings'];
            document.getElementById("this_url").checked = true;
        }
        document.getElementById('override_url_settings').checked = this.active_settings['override_url_settings'];

        // byinterval data
        let interval_val = render_settings['byinterval']['interval_val'];
        let interval_hour = Math.floor(interval_val / 60 / 60);
        let interval_minute = Math.floor((interval_val - interval_hour * 60 * 60) / 60);
        let interval_second = interval_val - interval_minute * 60 - interval_hour * 60 * 60;
        document.getElementById("byinterval").checked = render_settings['byinterval']['enable'];
        document.getElementById("interval_hour").value = interval_hour;
        document.getElementById("interval_minute").value = interval_minute;
        document.getElementById("interval_second").value = interval_second;

        // bytime data
        document.getElementById("bytime").checked = render_settings['bytime']['enable'];
        document.getElementById("time_val").value = render_settings['bytime']['time_val'].join(',');

        // nocache data
        document.getElementById("nocache").checked = render_settings['nocache']['enable'];

        // scrollrestoration data
        document.getElementById("scrollrestoration").checked = render_settings['scrollrestoration']['enable'];
        document.getElementById("restore_delay").value = render_settings['scrollrestoration']['restore_delay'];

        // extension status on this page
        if (this.active_settings['extension_on'] && (
            this.active_settings['url_settings']['enable'] ||
            (this.active_settings['domain_settings']['enable'] && this.active_settings['url_settings']['enable'] !== false)
        )) {
            document.getElementById("extension_status").textContent = "Extension is enabled on this page";
            document.getElementById("extension_status").className = "text-success";
        } else {
            document.getElementById("extension_status").textContent = "Extension is disabled on this page";
            document.getElementById("extension_status").className = "text-danger";
        }
    }

    start(event) {
        event.preventDefault();
        let validate_result = this.validateSettings();
        if (validate_result.success) {
            let new_data = {};
            if (document.getElementById("this_url").checked) {
                new_data[this.url] = validate_result.new_settings;
            } else {
                if (document.getElementById('override_url_settings').checked) {
                    SettingsController.overrideURLSettings(this.domain);
                }
                new_data[this.domain] = validate_result.new_settings;
            }
            this.settings_controller
                .saveSettings(new_data, document.getElementById("this_url").checked ? this.url : this.domain)
                .then(() => location.reload());
        } else {
            document.getElementById('error').innerHTML = validate_result.error;
        }
    }

    validateSettings() {
        if (!document.getElementById("byinterval").checked && !document.getElementById("bytime").checked) {
            return { success: false, error: 'Error: At least one refresh mode must be set to start' };
        }

        let interval_regExp = new RegExp("^\\d+$");
        let interval_hour = document.getElementById("interval_hour").value;
        let interval_minute = document.getElementById("interval_minute").value;
        let interval_second = document.getElementById("interval_second").value;
        if (!interval_regExp.test(interval_hour) || !interval_regExp.test(interval_minute) || !interval_regExp.test(interval_second) || (parseInt(interval_hour) === 0 && parseInt(interval_minute) === 0 && parseInt(interval_second) === 0)) {
            return { success: false, error: 'Error: Contain invalid interval value' };
        }

        let time_val = document.getElementById('time_val').value;
        if (document.getElementById("bytime").checked && time_val.length === 0) {
            return { success: false, error: 'Error: Contain invalid time value' };
        }
        let time_arr = time_val.length > 0 ? time_val.split(',') : [];
        if (time_val.length > 0) {
            let time_regExp = new RegExp("^([01]\\d|2[0-3]):([0-5]\\d)$");
            if (time_arr.some(e1 => time_regExp.test(e1) === false)) {
                return { success: false, error: 'Error: Contain invalid time value' };
            } else if (new Set(time_arr).size !== time_arr.length) {
                return { success: false, error: "Error: Contain identical values" };
            }
        }

        let delay_regExp = new RegExp("^\\d+$");
        let restore_delay = document.getElementById('restore_delay').value;
        if (!delay_regExp.test(restore_delay)) {
            return { success: false, error: "Error: Contain invalid values" };
        }

        return {
            success: true,
            new_settings: {
                enable: true,
                byinterval: {
                    enable: document.getElementById("byinterval").checked,
                    interval_val: parseInt(interval_hour) * 60 * 60 + parseInt(interval_minute) * 60 + parseInt(interval_second)
                },
                bytime: {
                    enable: document.getElementById("bytime").checked,
                    time_val: time_arr
                },
                nocache: {
                    enable: document.getElementById('nocache').checked
                },
                scrollrestoration: {
                    enable: document.getElementById('scrollrestoration').checked,
                    restore_delay: parseInt(restore_delay)
                }
            }
        };
    }

    stop() {
        let new_data = {};
        if (document.getElementById("this_url").checked) {
            new_data[this.url] = { ...this.active_settings['url_settings'], enable: false };
        } else {
            new_data[this.domain] = { ...this.active_settings['domain_settings'], enable: false };
        }
        this.settings_controller
            .saveSettings(new_data, document.getElementById("this_url").checked ? this.url : this.domain)
            .then(() => location.reload());
    }

    loadDefault() {
        this.renderView(SettingsController.defaultSettings());
    }
}

let Controller = new PopupController();
Controller.init();