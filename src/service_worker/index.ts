import _ from "lodash";
import { concatMap, defer, forkJoin, from, iif, mergeMap } from "rxjs";
import { CountDownRequest } from "../common";

function isCountDownRequest(payload: any): boolean {
    return (payload instanceof CountDownRequest) || (
        Object.prototype.hasOwnProperty.call(
            payload,
            'tab_config'
        ) && Object.prototype.hasOwnProperty.call(
            payload,
            'seconds_left'
        ));
}

chrome.runtime.onInstalled.addListener(function () {
    return from(chrome.tabs.query({ url: '*://*/*' })).pipe(
        mergeMap(array => from(array)),
        concatMap(tab => from(chrome.tabs.reload(tab.id as number)))
    ).subscribe();
});

chrome.runtime.onMessage.addListener(function (request, sender) {
    if (sender?.tab?.id != null) {
        const tab_id = sender.tab.id;
        const payload = request.payload;
        if (_.isBoolean(payload)) {
            forkJoin([
                from(chrome.action.setIcon({ tabId: tab_id, path: { "32": payload ? "icons/icong32.png" : "icons/iconb32.png" } })),
                from(chrome.action.setBadgeText({ tabId: tab_id, text: '' }))
            ]).subscribe();
        }
        if (isCountDownRequest(payload)) {
            const seconds_left: number = payload.seconds_left;
            iif(
                () => seconds_left === 0,
                defer(() => from(chrome.tabs.reload(
                    tab_id,
                    { bypassCache: payload.tab_config.bypassCache }
                ))),
                defer(() => forkJoin([
                    from(chrome.action.setBadgeText({ tabId: tab_id, text: (seconds_left < 10) ? seconds_left.toString() : '' })),
                    from(chrome.action.setTitle({ tabId: tab_id, title: `This tab will be reloaded after ${seconds_left.toString()}s` }))
                ]))
            ).subscribe();
        }
    }
});
