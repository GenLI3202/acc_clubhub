import { useState, useEffect, useRef } from 'preact/hooks';
import type { VNode } from 'preact';

interface FilterRangeSliderProps {
    min: number;
    max: number;
    value: [number, number];
    unit?: string;
    step?: number;
    onChange: (range: [number, number]) => void;
}

export function FilterRangeSlider({ min, max, value, unit = '', step = 1, onChange }: FilterRangeSliderProps): VNode {
    // Local state for smooth dragging
    const [localValue, setLocalValue] = useState<[number, number]>(value);

    useEffect(() => {
        setLocalValue(value);
    }, [value[0], value[1]]);

    const handleInput = (index: 0 | 1, val: number) => {
        const newValue: [number, number] = [...localValue];
        newValue[index] = val;

        // Ensure handles don't cross
        if (index === 0 && val > newValue[1]) newValue[0] = newValue[1];
        if (index === 1 && val < newValue[0]) newValue[1] = newValue[0];

        setLocalValue(newValue);
    };

    const handleChange = () => {
        onChange(localValue);
    };

    // Calculate percentage for track background
    const getPercent = (val: number) => Math.round(((val - min) / (max - min)) * 100);
    const minPercent = getPercent(localValue[0]);
    const maxPercent = getPercent(localValue[1]);

    return (
        <div className="filter-slider-container">
            <div className="slider-inputs">
                <span>{localValue[0]} {unit}</span>
                <span>{localValue[1]} {unit}</span>
            </div>

            <div className="range-slider">
                <div
                    className="slider-track"
                    style={{
                        background: `linear-gradient(to right, #dadae5 ${minPercent}%, var(--color-primary) ${minPercent}%, var(--color-primary) ${maxPercent}%, #dadae5 ${maxPercent}%)`
                    }}
                ></div>
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={localValue[0]}
                    onInput={(e) => handleInput(0, Number((e.target as HTMLInputElement).value))}
                    onChange={handleChange}
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
                    onChange={handleChange}
                    className="thumb thumb-right"
                    aria-label="Maximum value"
                />
            </div>

            <style>{`
                .range-slider {
                    position: relative;
                    height: 5px;
                    width: 100%;
                    margin: 10px 0;
                }
                .slider-track {
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    background-color: #dadae5;
                    border-radius: 4px;
                }
                .thumb {
                    position: absolute;
                    width: 100%;
                    height: 5px;
                    background: none;
                    pointer-events: none;
                    appearance: none;
                    -webkit-appearance: none;
                }
                /* Thumb Styles */
                .thumb::-webkit-slider-thumb {
                    pointer-events: all;
                    width: 18px;
                    height: 18px;
                    -webkit-appearance: none;
                    background-color: #fff;
                    border: 2px solid var(--color-primary);
                    border-radius: 50%;
                    cursor: pointer;
                    margin-top: -7px; /* center thumb */
                    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                    z-index: 2;
                }
                .thumb::-moz-range-thumb {
                    pointer-events: all;
                    width: 18px;
                    height: 18px;
                    background-color: #fff;
                    border: 2px solid var(--color-primary);
                    border-radius: 50%;
                    cursor: pointer;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                    z-index: 2;
                }
                /* Higher Z-index for active thumb if needed, usually right sits on top */
            `}</style>
        </div>
    );
}
