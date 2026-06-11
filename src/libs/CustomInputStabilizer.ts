import {
    InputMapper,
    InputEvtType,
    isPointerEvt,
    Viewport,
} from 'js-draw';
import { Vec2 } from '@js-draw/math';
import type { InputEvt, PointerEvt, GestureCancelEvt } from 'js-draw';
import { InputStabilizerOptions, defaultStabilizerOptions } from './InputStabilizerOptions';

const untilNextAnimationFrame = () =>
    new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

class PerStrokeStabilizer {
    private runLoop = true;
    private lastUpdateTime = 0;
    private velocity = Vec2.zero;
    private strokePoint: Vec2;
    private targetPoint: Vec2;
    private readonly targetInterval = 10;

    constructor(
        start: Vec2,
        private readonly updatePointer: (screenPoint: Vec2, timeStamp: number) => boolean,
        private readonly options: InputStabilizerOptions,
    ) {
        this.strokePoint = start;
        this.targetPoint = start;
        void this.loop();
    }

    private async loop() {
        this.lastUpdateTime = performance.now();
        while (this.runLoop) {
            this.update(false);
            await untilNextAnimationFrame();
        }
    }

    setTarget(point: Vec2) {
        this.targetPoint = point;
    }

    private getNextVelocity(deltaTimeMs: number): Vec2 {
        const toTarget = this.targetPoint.minus(this.strokePoint);
        const springForce = toTarget.times(this.options.springConstant);
        const gravityAccel = 10;
        const normalForceMagnitude = this.options.mass * gravityAccel;
        const frictionForce = this.velocity
            .normalizedOrZero()
            .times(-this.options.frictionCoefficient * normalForceMagnitude);
        const acceleration = springForce.plus(frictionForce).times(1 / this.options.mass);
        const decayFactor = this.options.velocityDecayFactor;
        const springVelocity = this.velocity
            .times(1 - decayFactor)
            .plus(acceleration.times(deltaTimeMs / 1000));
        const toTargetVelocity = toTarget.normalizedOrZero().times(springVelocity.length());
        return toTargetVelocity.lerp(springVelocity, this.options.inertiaFraction);
    }

    update(force: boolean): boolean {
        const nowTime = performance.now();
        const deltaTime = nowTime - this.lastUpdateTime;
        const reachedTarget = this.strokePoint.eq(this.targetPoint);

        if (deltaTime > this.targetInterval || force) {
            if (!reachedTarget) {
                let velocity: Vec2;
                let deltaX: Vec2;
                let parts = 1;
                do {
                    velocity = this.getNextVelocity(deltaTime / parts);
                    deltaX = velocity.times(deltaTime / 1000);
                    parts++;
                } while (deltaX.magnitude() > this.options.maxPointDist && parts < 10);

                for (let i = 0; i < parts; i++) {
                    this.velocity = this.getNextVelocity(deltaTime / parts);
                    deltaX = this.velocity.times(deltaTime / 1000);
                    this.strokePoint = this.strokePoint.plus(deltaX);
                    if (i < parts - 1) {
                        this.updatePointer(this.strokePoint, nowTime);
                    }
                }
            }

            this.lastUpdateTime = nowTime;
            if (force || !reachedTarget) {
                return this.updatePointer(this.strokePoint, nowTime);
            }
        }
        return false;
    }

    finish() {
        this.runLoop = false;
        const toTarget = this.targetPoint.minus(this.strokePoint);
        if (this.velocity.dot(toTarget) > this.options.minSimilarityToFinalize) {
            this.updatePointer(this.targetPoint, performance.now());
        }
    }

    cancel() {
        this.runLoop = false;
    }
}

export default class CustomInputStabilizer extends InputMapper {
    private stabilizer: PerStrokeStabilizer | null = null;
    private lastPointerEvent: PointerEvt | null = null;
    private options: InputStabilizerOptions;

    constructor(
        private readonly viewport: Viewport,
        options: InputStabilizerOptions = defaultStabilizerOptions,
    ) {
        super();
        this.options = { ...options };
    }

    getOptions(): InputStabilizerOptions {
        return { ...this.options };
    }

    setOptions(options: InputStabilizerOptions) {
        this.options = { ...options };
    }

    private mapPointerEvent(event: PointerEvt | GestureCancelEvt) {
        if (isPointerEvt(event) && event.kind !== InputEvtType.PointerUpEvt) {
            this.lastPointerEvent = event;
        }

        if (
            !isPointerEvt(event) ||
            event.allPointers.length > 1 ||
            this.stabilizer === null
        ) {
            return this.emit(event);
        }

        this.stabilizer.setTarget(event.current.screenPos as unknown as Vec2);

        if (event.kind === InputEvtType.PointerMoveEvt) {
            return this.stabilizer.update(true);
        } else if (event.kind === InputEvtType.PointerUpEvt) {
            this.stabilizer.finish();
            return this.emit(event);
        } else {
            return this.emit(event);
        }
    }

    private emitPointerMove(screenPoint: Vec2, timeStamp: number): boolean {
        if (!this.lastPointerEvent) {
            return false;
        }
        const pointer = this.lastPointerEvent.current
            .withScreenPosition(screenPoint as any, this.viewport)
            .withTimestamp(timeStamp);
        const event = {
            kind: InputEvtType.PointerMoveEvt,
            current: pointer,
            allPointers: [pointer],
        };
        return this.emit(event as any);
    }

    onEvent(event: InputEvt): boolean {
        if (isPointerEvt(event) || event.kind === InputEvtType.GestureCancelEvt) {
            if (isPointerEvt(event) && event.kind === InputEvtType.PointerDownEvt) {
                if (event.allPointers.length > 1) {
                    this.stabilizer?.cancel();
                    this.stabilizer = null;
                } else {
                    this.stabilizer?.cancel();
                    this.stabilizer = new PerStrokeStabilizer(
                        event.current.screenPos as unknown as Vec2,
                        (screenPoint, timeStamp) => this.emitPointerMove(screenPoint, timeStamp),
                        this.options,
                    );
                }
            }

            const handled = this.mapPointerEvent(event);

            if (
                (isPointerEvt(event) && event.kind === InputEvtType.PointerUpEvt) ||
                event.kind === InputEvtType.GestureCancelEvt
            ) {
                this.stabilizer?.cancel();
                this.stabilizer = null;
            }

            return handled;
        }

        return this.emit(event);
    }
}
