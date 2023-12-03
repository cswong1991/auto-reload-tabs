import "bootstrap/dist/css/bootstrap.min.css";
import { BehaviorSubject, concat, concatMap, forkJoin, from, fromEvent, map, mergeMap, of, pipe, tap, type Observable, type UnaryFunction } from "rxjs";
import { AutoReloadTab, Extension } from "../common";

const toggle_extension = document.getElementById('toggle_extension') as HTMLButtonElement;
const reset_extension = document.getElementById('reset_extension') as HTMLButtonElement;

const info = document.getElementById("info") as HTMLElement;
const form = document.getElementById("form") as HTMLFormElement;

const r_type = document.getElementsByName("r_type",) as NodeListOf<HTMLInputElement>;
const r_interval = document.getElementById('r_interval') as HTMLInputElement;
const bypass_cache = document.getElementById("bypass_cache",) as HTMLInputElement;

const stop = document.getElementById("stop") as HTMLInputElement;
const close = document.getElementById("close") as HTMLInputElement;
const load_default = document.getElementById("load_default") as HTMLInputElement;

const extension = new Extension();
const renderEvent = new BehaviorSubject<boolean>(false);

renderEvent
    .pipe(
        concatMap((use_default) => forkJoin([
            of(use_default),
            from(chrome.tabs.query({ active: true, lastFocusedWindow: true })).pipe(map(array => new URL(array[0].url as string)))
        ])),
        concatMap((array) => {
            const use_default = array[0];
            const tab_url = array[1];

            return forkJoin([
                extension.enabled,
                AutoReloadTab.get(
                    tab_url,
                    use_default
                )
            ]);
        })
    )
    .subscribe((array) => {
        const extension_enabled = array[0];
        const tab_config = array[1];

        toggle_extension.classList.toggle(
            'bg-success',
            extension_enabled
        );
        toggle_extension.classList.toggle(
            'bg-danger',
            !extension_enabled
        );

        const enabled_on_this_tab = (extension_enabled && tab_config.enabled);
        info.classList.toggle(
            'text-success',
            enabled_on_this_tab
        );
        info.classList.toggle(
            'text-danger',
            !enabled_on_this_tab
        );
        info.innerText = (enabled_on_this_tab) ? 'Auto reload is running on this tab' : 'Auto reload is not running on this tab';

        r_type[tab_config.rType].checked = true;
        r_interval.valueAsNumber = tab_config.rInterval;
        bypass_cache.checked = tab_config.bypassCache;
    });

function renderContentSrc(url: string | string[]): Observable<void> {
    return from(chrome.tabs.query({ url })).pipe(
        mergeMap(array => from(array)),
        concatMap(tab => from(chrome.tabs.sendMessage(
            tab.id as number,
            {}
        )))
    );
}

function toggleTabConfig(enabled: boolean): UnaryFunction<Observable<unknown>, Observable<any>> {
    return pipe(
        concatMap(() => from(chrome.tabs.query({ active: true, lastFocusedWindow: true }))),
        concatMap((array) => {
            const model = new AutoReloadTab();

            model.url = new URL(array[0].url as string);
            model.enabled = enabled;
            model.rType = [...r_type].findIndex((element) => element.checked) as 0 | 1;
            model.rInterval = r_interval.valueAsNumber;
            model.bypassCache = bypass_cache.checked;

            return concat(
                model.save(),
                renderContentSrc((model.rType === 0) ? model.url.href : `*://${model.url.host}/*`)
            );
        })
    );
}

fromEvent(
    toggle_extension,
    'click'
).pipe(
    concatMap(() => concat(
        extension.toggle(),
        renderContentSrc("*://*/*")
    )),
    tap(() => { renderEvent.next(false); })
).subscribe();

fromEvent(
    reset_extension,
    'click'
).pipe(
    concatMap(() => concat(
        extension.reset(),
        renderContentSrc("*://*/*")
    )),
    tap(() => { renderEvent.next(false); })
).subscribe();

fromEvent(
    form,
    "submit"
).pipe(toggleTabConfig(true)).subscribe();

fromEvent(
    stop,
    "click"
).pipe(
    toggleTabConfig(false),
    tap(() => { renderEvent.next(false); })
).subscribe();

fromEvent(
    close,
    "click"
).subscribe(() => { window.close(); });

fromEvent(
    load_default,
    "click"
).pipe(tap(() => { renderEvent.next(true); })).subscribe();