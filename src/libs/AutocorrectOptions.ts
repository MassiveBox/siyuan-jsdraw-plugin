export interface AutocorrectOptions {
    maxSpeed: number;
    maxRadius: number;
    minTimeSeconds: number;
}

export const defaultAutocorrectOptions: AutocorrectOptions = {
    maxSpeed: 8.5,
    maxRadius: 11,
    minTimeSeconds: 0.5,
};

export const autocorrectParamMeta: {
    key: keyof AutocorrectOptions;
    min: number;
    max: number;
    step: number;
}[] = [
    { key: 'minTimeSeconds', min: 0.1,  max: 3.0,  step: 0.1  },
    { key: 'maxSpeed',       min: 1.0,  max: 50.0, step: 0.5  },
    { key: 'maxRadius',      min: 2,    max: 50,   step: 1    },
];

export function cloneAutocorrectOptions(opts: AutocorrectOptions): AutocorrectOptions {
    return { ...opts };
}
