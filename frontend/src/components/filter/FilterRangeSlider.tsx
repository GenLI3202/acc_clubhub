import { useState, useEffect } from 'preact/hooks';
import type { VNode } from 'preact';

interface FilterRangeSliderProps {
    min: number;
    max: number;
    value: [number | string, number | string];
    unit?: string;
    step?: number;
    onChange: (range: [number, number]) => void;
}

export function FilterRangeSlider({ min, max, value, unit = '', step = 1, onChange }: FilterRangeSliderProps): VNode {
    const toNumber = (nextValue: number | string, fallback: number): number => {
        const parsed = Number(nextValue);
        return Number.isFinite(parsed) ? parsed : fallback;
    };

    const clamp = (nextValue: number): number => {
        return Math.min(max, Math.max(min, nextValue));
    };

    const normalizeRange = (range: [number | string, number | string]): [number, number] => {
        const nextMin = clamp(toNumber(range[0], min));
        const nextMax = clamp(toNumber(range[1], max));

        return nextMin <= nextMax ? [nextMin, nextMax] : [nextMax, nextMin];
    };

    const [localValue, setLocalValue] = useState<[number, number]>(() => normalizeRange(value));

    useEffect(() => {
        setLocalValue(normalizeRange(value));
    }, [value[0], value[1], min, max]);

    const handleInput = (index: 0 | 1, nextValue: number) => {
        const newValue: [number, number] = [...localValue];
        newValue[index] = clamp(nextValue);

        if (index === 0 && newValue[0] > newValue[1]) {
            newValue[0] = newValue[1];
        }
        if (index === 1 && newValue[1] < newValue[0]) {
            newValue[1] = newValue[0];
        }

        setLocalValue(newValue);
        onChange(newValue);
    };

    const handleBlur = () => {
        const normalized = normalizeRange(localValue);
        setLocalValue(normalized);
        onChange(normalized);
    };

    const getPercent = (val: number) => {
        if (max === min) {
            return 0;
        }

        return Math.round(((val - min) / (max - min)) * 100);
    };
    const minPercent = getPercent(localValue[0]);
    const maxPercent = getPercent(localValue[1]);

    return (
        <div className="filter-slider-container filter-slider-container--range">
            <div className="slider-value-row">
                <label className="slider-value-box">
                    <input
                        type="number"
                        min={min}
                        max={max}
                        step={step}
                        value={localValue[0]}
                        onInput={(e) => handleInput(0, Number((e.target as HTMLInputElement).value))}
                        onBlur={handleBlur}
                        aria-label="Minimum value"
                    />
                    {unit ? <span className="slider-value-unit">{unit}</span> : null}
                </label>
                <span className="slider-value-separator" aria-hidden="true">-</span>
                <label className="slider-value-box">
                    <input
                        type="number"
                        min={min}
                        max={max}
                        step={step}
                        value={localValue[1]}
                        onInput={(e) => handleInput(1, Number((e.target as HTMLInputElement).value))}
                        onBlur={handleBlur}
                        aria-label="Maximum value"
                    />
                    {unit ? <span className="slider-value-unit">{unit}</span> : null}
                </label>
            </div>

            <div className="range-slider">
                <div
                    className="slider-track"
                    style={{
                        background: `linear-gradient(to right, var(--filter-border-color) ${minPercent}%, var(--filter-active-color) ${minPercent}%, var(--filter-active-color) ${maxPercent}%, var(--filter-border-color) ${maxPercent}%)`
                    }}
                ></div>
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={localValue[0]}
                    onInput={(e) => handleInput(0, Number((e.target as HTMLInputElement).value))}
                    onChange={handleBlur}
                    className="thumb thumb-left"
                    aria-label="Minimum value"
                />
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={localValue[1]}
                    onInput={(e) => handleInput(1, Number((e.target as HTMLInputElement).value))}
                    onChange={handleBlur}
                    className="thumb thumb-right"
                    aria-label="Maximum value"
                />
            </div>
        </div>
    );
}
