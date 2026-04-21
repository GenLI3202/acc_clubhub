// components/routes/RouteCard.tsx
// Data-first route card for the interactive routes grid.
import { h } from 'preact';
import './RouteCard.css';
import type { Locale } from '../../lib/i18n';
import { getFilterLabel } from '../../lib/i18n/filterTranslations';

type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

interface RouteCardProps {
  href: string;
  name: string;
  cover?: string;
  difficulty: Difficulty;
  region?: string;
  distance: number;
  elevation: number;
  surface?: string;
  lang: Locale;
}

export function RouteCard({
  href,
  name,
  cover,
  difficulty,
  region,
  distance,
  elevation,
  surface,
  lang,
}: RouteCardProps) {
  const difficultyLabel = getFilterLabel('difficulty', difficulty, lang);
  const regionLabel = region ? getFilterLabel('region', region, lang) : '';
  const surfaceLabel = surface ? getFilterLabel('surface', surface, lang) : '';

  return (
    <a href={href} class="article-card route-card">
      <div class="article-card__cover">
        {cover
          ? <img src={cover} alt="" loading="lazy" />
          : <div class="article-card__cover-placeholder" />
        }
      </div>
      <div class="article-card__body">
        <div class="route-card__meta-row">
          <span class={`route-card__difficulty route-card__difficulty--${difficulty}`}>
            {difficultyLabel}
          </span>
          {regionLabel && <span class="route-card__region">{regionLabel}</span>}
        </div>
        <h3 class="article-card__title">{name}</h3>
        <div class="route-card__stats">
          <span>{distance} km</span>
          <span>{elevation} m ↑</span>
        </div>
        {surfaceLabel && <div class="route-card__surface">{surfaceLabel}</div>}
      </div>
    </a>
  );
}
