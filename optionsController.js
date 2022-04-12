class OptionsController {
    constructor() {
        $(window).on('hashchange ', this.renderContent.bind(this));
        $("#extension_toggle").on("click", this.extensionToggle.bind(this));
        $("#extension_reset").on("click", this.extensionReset.bind(this));
    }

    init() {
        this.settings_controller = new SettingsController();
        this.table_controller = new TablesController();
        this.renderContent();
    }

    renderContent(event) {
        $('#content > div').attr('class', 'd-none');
        $('#content > div:not(#general)').html("");

        let url_hash = event ? event.target.location.hash : window.location.hash;
        switch (url_hash) {
            case '':
            case '#general':
                this.renderGeneral();
                break;
            case '#enabled_urls':
                this.renderEnabledURLs();
                break;
            case '#enabled_domains':
                this.renderEnabledDomains();
                break;
            default:
                alert('Fail to load unknown page: ' + window.location.href);
                return;
        }
        $(url_hash === '' ? '#general' : url_hash).attr('class', 'd-block');

    }

    async renderGeneral() {
        let data = await chrome.storage.local.get('extension_on');
        this.extension_on = data['extension_on'];
        $('#extension_toggle').html(this.extension_on !== false ? "Extension: ON" : "Extension: OFF");
        $('#extension_toggle').attr('class', this.extension_on !== false ? "btn btn-block btn-success" : "btn btn-block btn-danger");
    }

    extensionToggle() {
        this.settings_controller
            .saveSettings({ extension_on: !this.extension_on })
            .then(() => location.reload());
    }

    extensionReset() {
        let agree = confirm('All settings will be reset to default value. Are you sure to continue?');
        if (agree) {
            chrome.storage.local.clear(() => location.reload());
        }
    }

    async renderEnabledURLs() {
        let data = await chrome.storage.local.get(null);
        let enabled_urls = Object.keys(data).filter(e1 => (e1.includes('http://') || e1.includes('https://')) && data[e1]?.['enable']);
        this.table_controller.setData(enabled_urls);
        $('#enabled_urls').html(this.table_controller.renderTable());
        this.addTBLEvtListener();
    }

    async renderEnabledDomains() {
        let data = await chrome.storage.local.get(null);
        let enabled_domains = Object.keys(data).filter(e1 => e1 !== 'extension_on' && !e1.includes('http://') && !e1.includes('https://') && data[e1]?.['enable']);
        this.table_controller.setData(enabled_domains);
        $('#enabled_domains').html(this.table_controller.renderTable());
        this.addTBLEvtListener();
    }

    addTBLEvtListener() {
        $('.select-element').on('change', this.selectTBLElement.bind(this));
        $('#select-all').on('change', this.selectTBLAll.bind(this));
        $('.delete-btn').on('click', this.deleteTBLElement.bind(this));
        $('#delete-multi').on('click', this.deleteTBLAll.bind(this));
    }

    selectTBLElement(event) {
        if (event.target.checked) {
            this.table_controller.selected_elements.push(event.target.dataset.key);
        } else {
            this.table_controller.selected_elements.filter(e1 => e1 !== event.target.dataset.key);
        }
        this.table_controller.selected_elements = [...new Set(this.table_controller.selected_elements)];
    }

    selectTBLAll(event) {
        this.table_controller.selected_elements = event.target.checked ? this.table_controller.data : [];
        $('.select-element').prop('checked', event.target.checked === true);
    }

    async deleteTBLElement(event) {
        await chrome.storage.local.remove(event.target.dataset.key);
        this.settings_controller.activateSettings().then(() => location.reload());
    }

    async deleteTBLAll() {
        await chrome.storage.local.remove(this.table_controller.data);
        this.settings_controller.activateSettings().then(() => location.reload());
    }
}

let Controller = new OptionsController();
Controller.init();