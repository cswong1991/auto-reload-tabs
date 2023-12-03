import { BehaviorSubject, concatMap, filter, forkJoin, from, interval, map, pairwise, shareReplay, switchMap, take, tap } from "rxjs";
import { AutoReloadTab, CountDownRequest, Extension } from "../common";

const extension = new Extension();
const renderEvent = new BehaviorSubject<void>(undefined);

const state = renderEvent.pipe(
    concatMap(() => forkJoin([
        extension.enabled,
        AutoReloadTab.get(new URL(location.href))
    ])),
    shareReplay(1)
);

// change action enabled or disabled icon
state.pipe(concatMap(array => {
    const payload = array[0] && array[1].enabled;
    return from(chrome.runtime.sendMessage({
        payload
    }));
})).subscribe();

// change action count down text
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

// monitor url change, onpopState will not be fired in spa
interval(1000).pipe(
    map(() => location.href),
    pairwise(),
    filter(array => array[0] !== array[1]),
    tap(() => { renderEvent.next(); })
).subscribe();

chrome.runtime.onMessage.addListener(() => {
    renderEvent.next();
});