import { useEffect, useRef, useState } from 'preact/hooks';

import { fill, getUniformCopy } from '../../lib/uniform/copy';
import {
    SIZE_CHARTS,
    VEST_MEASUREMENTS,
    findCell,
    recommendSize,
    type ChartCell,
    type Sex,
} from '../../lib/uniform/sizes';
import type { Locale } from '../../lib/i18n';
import { RadioGroup } from './RadioGroup';
import './uniform.css';

interface SizeGuideProps {
    lang: Locale;
}

interface ChartTableProps {
    sex: Sex;
    caption: string;
    hint: string;
    corner: string;
    highlight: ChartCell | null;
}

function ChartTable({ sex, caption, hint, corner, highlight }: ChartTableProps) {
    const chart = SIZE_CHARTS[sex];
    const wrapRef = useRef<HTMLDivElement>(null);

    // On a phone the matching cell can sit off to the right of the table.
    useEffect(() => {
        const wrap = wrapRef.current;
        const hit = wrap?.querySelector<HTMLElement>('.is-hit');
        if (!wrap || !hit) return;
        wrap.scrollLeft = hit.offsetLeft - (wrap.clientWidth - hit.offsetWidth) / 2;
    }, [highlight?.row, highlight?.col]);

    return (
        <figure class="kit-chart-figure">
            <figcaption>
                <strong>{caption}</strong>
                <span>{hint}</span>
            </figcaption>
            <div class="kit-table-wrap" ref={wrapRef} tabIndex={0} role="region" aria-label={caption}>
                <table class="kit-table">
                    <thead>
                        <tr>
                            <th scope="col">{corner}</th>
                            {chart.heights.map(([lo, hi]) => (
                                <th scope="col" key={lo}>
                                    {lo}–{hi}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {chart.rows.map((row, r) => (
                            <tr key={row.weight[0]}>
                                <th scope="row">
                                    {row.weight[0]}–{row.weight[1]}
                                </th>
                                {row.sizes.map((size, c) => (
                                    <td
                                        key={c}
                                        class={highlight && highlight.row === r && highlight.col === c ? 'is-hit' : undefined}
                                    >
                                        {size ?? ''}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </figure>
    );
}

export function SizeGuide({ lang }: SizeGuideProps) {
    const { sizes } = getUniformCopy(lang);
    const [sex, setSex] = useState<Sex>('men');
    const [height, setHeight] = useState('');
    const [weight, setWeight] = useState('');

    const h = Number(height);
    const w = Number(weight);
    const entered = height !== '' && weight !== '' && Number.isFinite(h) && Number.isFinite(w);
    const cell = entered ? findCell(sex, h, w) : null;
    const suggested = entered ? recommendSize(sex, h, w) : null;

    return (
        <div class="kit-sizes">
            <header class="kit-section-head">
                <h2 class="kit-h2" id="kit-size-title">
                    {sizes.title}
                </h2>
                <p class="kit-lede">{sizes.intro}</p>
            </header>

            <section class="kit-panel kit-finder" aria-labelledby="kit-finder-title">
                <h3 class="kit-panel-title" id="kit-finder-title">
                    {sizes.finderTitle}
                </h3>
                <div class="kit-finder-fields">
                    <RadioGroup
                        name="kit-finder-sex"
                        legend={sizes.finderTitle}
                        value={sex}
                        onChange={setSex}
                        variant="segment"
                        options={[
                            { value: 'men', label: sizes.sexMen },
                            { value: 'women', label: sizes.sexWomen },
                        ]}
                    />
                    <label class="kit-input">
                        <span>{sizes.height}</span>
                        <input
                            type="number"
                            inputMode="numeric"
                            min="100"
                            max="230"
                            value={height}
                            onInput={(event) => setHeight(event.currentTarget.value)}
                        />
                    </label>
                    <label class="kit-input">
                        <span>{sizes.weight}</span>
                        <input
                            type="number"
                            inputMode="numeric"
                            min="30"
                            max="200"
                            value={weight}
                            onInput={(event) => setWeight(event.currentTarget.value)}
                        />
                    </label>
                </div>
                <p class="kit-finder-result" role="status" aria-live="polite">
                    {entered && (suggested ? fill(sizes.result, { size: suggested }) : sizes.noResult)}
                </p>
                <a class="kit-link" href="#kit-shop">
                    ← {sizes.back}
                </a>
            </section>

            <div class="kit-charts">
                <ChartTable
                    sex="men"
                    caption={sizes.men}
                    hint={sizes.sharedNote}
                    corner={sizes.heightWeight}
                    highlight={sex === 'men' ? cell : null}
                />
                <ChartTable
                    sex="women"
                    caption={sizes.women}
                    hint={sizes.sharedNote}
                    corner={sizes.heightWeight}
                    highlight={sex === 'women' ? cell : null}
                />
            </div>
            <p class="kit-note">{sizes.gapNote}</p>
            <p class="kit-note">{sizes.vestNote}</p>

            <figure class="kit-chart-figure">
                <figcaption>
                    <strong>{sizes.vestTableTitle}</strong>
                    <span>{sizes.tolerance}</span>
                </figcaption>
                <div class="kit-table-wrap" tabIndex={0} role="region" aria-label={sizes.vestTableTitle}>
                    <table class="kit-table kit-table--vest">
                        <thead>
                            <tr>
                                {sizes.vestColumns.map((label) => (
                                    <th scope="col" key={label}>
                                        {label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {VEST_MEASUREMENTS.map((row) => (
                                <tr key={row.size}>
                                    <th scope="row">{row.size}</th>
                                    <td>{row.chest}</td>
                                    <td>{row.collar}</td>
                                    <td>{row.hem}</td>
                                    <td>{row.frontLength}</td>
                                    <td>{row.backLength}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </figure>
        </div>
    );
}
