import { concatMap, from, map, pipe, type Observable } from "rxjs";

export class Extension {

    public get enabled(): Observable<boolean> {
        return from(chrome.storage.local.get({ extension_enabled: true })).pipe(map(items => items.extension_enabled));
    }

    public toggle(): Observable<void> {
        return this.enabled.pipe(concatMap(config_value => from(chrome.storage.local.set({ extension_enabled: !config_value }))),);
    }

    public reset(): Observable<void> {
        return from(chrome.storage.local.clear());
    }

}

export interface TabConfig {

    enabled: boolean,
    r_type: 0 | 1,
    r_interval: number,
    bypass_cache: boolean

}

export class AutoReloadTab {

    public url!: URL;

    public enabled: boolean = false;

    public rType: 0 | 1 = 0;

    public rInterval: number = 30;

    public bypassCache: boolean = true;

    public static get(url: URL, use_default = false): Observable<AutoReloadTab> {
        const model = new AutoReloadTab();
        model.url = url;

        return from(chrome.storage.local.get([url.href, url.host])).pipe(map(items => {
            const url_config: TabConfig | undefined = items[url.href];
            const host_config: TabConfig | undefined = items[url.host];

            if (url_config != null) {
                model.enabled = url_config.enabled;
                model.rType = url_config.r_type;
                if (!use_default) {
                    model.rInterval = url_config.r_interval;
                    model.bypassCache = url_config.bypass_cache;
                }
            } else if (host_config != null) {
                model.enabled = host_config.enabled;
                model.rType = host_config.r_type;
                if (!use_default) {
                    model.rInterval = host_config.r_interval;
                    model.bypassCache = host_config.bypass_cache;
                }
            }

            return model;
        }));
    }

    public save(): Observable<void> {
        const new_config: Record<string, TabConfig> = {};
        new_config[(this.rType === 0) ? this.url.href : this.url.host] = {
            enabled: this.enabled,
            r_type: this.rType,
            r_interval: this.rInterval,
            bypass_cache: this.bypassCache
        };

        return from(chrome.storage.local.set(new_config)).pipe((this.rType === 1) ? pipe(concatMap(() => from(chrome.storage.local.remove(this.url.href)))) : pipe());
    }

}

export class CountDownRequest {

    constructor(public tab_config: AutoReloadTab, public seconds_left: number) { }

}