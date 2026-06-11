export interface InputStabilizerOptions {
    mass: number;
    springConstant: number;
    frictionCoefficient: number;
    maxPointDist: number;
    inertiaFraction: number;
    velocityDecayFactor: number;
    minSimilarityToFinalize: number;
}

export const defaultStabilizerOptions: InputStabilizerOptions = {
    mass: 0.4,
    springConstant: 100.0,
    frictionCoefficient: 0.28,
    maxPointDist: 10,
    inertiaFraction: 0.75,
    velocityDecayFactor: 0.1,
    minSimilarityToFinalize: 0.0,
};

export const stabilizerParamMeta: {
    key: keyof InputStabilizerOptions;
    min: number;
    max: number;
    step: number;
}[] = [
    { key: 'mass',                    min: 0.1,  max: 2.0,  step: 0.05 },
    { key: 'springConstant',          min: 10,   max: 500,  step: 5    },
    { key: 'frictionCoefficient',     min: 0.0,  max: 2.0,  step: 0.02 },
    { key: 'maxPointDist',            min: 1,    max: 50,   step: 1    },
    { key: 'inertiaFraction',         min: 0.0,  max: 1.0,  step: 0.05 },
    { key: 'velocityDecayFactor',     min: 0.0,  max: 1.0,  step: 0.05 },
    { key: 'minSimilarityToFinalize', min: -1.0, max: 1.0,  step: 0.1  },
];

export function cloneOptions(opts: InputStabilizerOptions): InputStabilizerOptions {
    return { ...opts };
}
