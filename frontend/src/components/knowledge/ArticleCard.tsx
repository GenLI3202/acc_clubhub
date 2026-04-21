// components/knowledge/ArticleCard.tsx
// Preact version of ArticleCard for use in TrainingLibraryPage's interactive all-articles grid.
// CSS is shared with ArticleCard.astro via ArticleCard.css.
import { h } from 'preact';
import './ArticleCard.css';
import type { Locale } from '../../lib/i18n';

interface ArticleCardProps {
  href: string;
  title: string;
  description?: string;
  cover?: string;
  date?: string;
  tagLabel?: string;
  lang?: Locale;
}

export function ArticleCard({ href, title, description, cover, date, tagLabel, lang = 'zh' }: ArticleCardProps) {
  const dateObj = date ? new Date(date) : null;
  const isValid = dateObj && !isNaN(dateObj.getTime());
  const formattedDate = isValid
    ? dateObj!.toLocaleDateString(
        lang === 'zh' ? 'zh-CN' : lang === 'de' ? 'de-DE' : 'en-GB',
        { month: 'short', day: 'numeric', year: 'numeric' },
      )
    : null;

  return (
    <a href={href} class="article-card">
      <div class="article-card__cover">
        {cover
          ? <img src={cover} alt="" loading="lazy" />
          : <div class="article-card__cover-placeholder" />
        }
      </div>
      <div class="article-card__body">
        {tagLabel && <span class="article-card__tag">{tagLabel}</span>}
        <h3 class="article-card__title">{title}</h3>
        {description && <p class="article-card__desc">{description}</p>}
        {formattedDate && <div class="article-card__meta">{formattedDate}</div>}
      </div>
    </a>
  );
}
