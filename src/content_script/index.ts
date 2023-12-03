import { BehaviorSubject, concatMap, filter, forkJoin, from, interval, shareReplay, switchMap, take } from "rxjs";
import { AutoReloadTab, CountDownRequest, Extension } from "../common";

const extension = new Extension();
const url = new URL(location.href);

const renderEvent = new BehaviorSubject<void>(undefined);

const state = renderEvent.pipe(
    concatMap(() => forkJoin([
        extension.enabled,
        AutoReloadTab.get(url)
    ])),
    shareReplay(1)
);

state.pipe(concatMap(array => {
    const payload = array[0] && array[1].enabled;
    return from(chrome.runtime.sendMessage({
        payload
    }));
})).subscribe();

state.pipe(switchMap(array => interval(1000).pipe(
    filter(() => array[0] && array[1].enabled),
    take(array[1].rInterval),
    concatMap((index) => {
        const payload = new CountDownRequest(
            array[1],
            array[1].rInterval - (index + 1)
        );
        return from(chrome.runtime.sendMessage({
            payload
        }));
    })
))).subscribe();

chrome.runtime.onMessage.addListener(() => {
    renderEvent.next();
});