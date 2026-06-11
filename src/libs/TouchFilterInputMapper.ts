import { InputMapper, isPointerEvt, PointerDevice } from 'js-draw';
import type { InputEvt } from 'js-draw';

export default class TouchFilterInputMapper extends InputMapper {
    private _enabled = false;
    private _shouldAllowTouch: () => boolean = () => false;

    setEnabled(enabled: boolean) {
        this._enabled = enabled;
    }

    isEnabled(): boolean {
        return this._enabled;
    }

    setShouldAllowTouch(fn: () => boolean) {
        this._shouldAllowTouch = fn;
    }

    onEvent(event: InputEvt): boolean {
        if (this._enabled && isPointerEvt(event)) {
            const allTouch = event.allPointers.every(
                (p) => p.device === PointerDevice.Touch,
            );
            if (allTouch && !this._shouldAllowTouch()) return true;
        }
        return this.emit(event);
    }
}
