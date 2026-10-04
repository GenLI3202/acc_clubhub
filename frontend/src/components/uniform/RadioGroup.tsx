interface RadioOption<T extends string> {
    value: T;
    label: string;
    /** Small colour dot before the label (vest colour). */
    swatch?: 'white' | 'black';
}

interface RadioGroupProps<T extends string> {
    /** Unique per group on the page: native radios are grouped by name. */
    name: string;
    legend: string;
    value: T | null;
    options: readonly RadioOption<T>[];
    onChange: (value: T) => void;
    variant: 'chip' | 'segment';
    disabled?: boolean;
}

/**
 * Native radio inputs, visually restyled. Unlike a row of buttons this gives
 * keyboard users one tab stop per group and arrow-key selection, and screen
 * readers the group name from the <legend>.
 */
export function RadioGroup<T extends string>({
    name,
    legend,
    value,
    options,
    onChange,
    variant,
    disabled = false,
}: RadioGroupProps<T>) {
    return (
        <fieldset class="kit-field" disabled={disabled}>
            <legend class="kit-field-label">{legend}</legend>
            <div class={`kit-radios kit-radios--${variant}`}>
                {options.map((option) => (
                    <label key={option.value} class="kit-radio">
                        <input
                            type="radio"
                            name={name}
                            value={option.value}
                            checked={value === option.value}
                            onChange={() => onChange(option.value)}
                        />
                        <span class="kit-radio-face">
                            {option.swatch && (
                                <span class={`kit-swatch kit-swatch--${option.swatch}`} aria-hidden="true" />
                            )}
                            {option.label}
                        </span>
                    </label>
                ))}
            </div>
        </fieldset>
    );
}
