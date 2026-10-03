import { Fragment, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

import { useConfig } from '@sepetakhq/storefront-kit/config/ConfigProvider';
import { useHome } from '@sepetakhq/storefront-kit/hooks/queries';
import { qk } from '@sepetakhq/storefront-kit/api/queryKeys';
import { serverNow } from '@sepetakhq/storefront-kit/api/client';

import ProductCard from '../components/ProductCard.jsx';
import { Tile } from '../components/Tile.jsx';
import { Img, SIZES } from '../ui/Img.jsx';
import Icon from '../ui/Icon.jsx';
import { CountdownCells } from '../ui/Countdown.jsx';
import { EmptyState, ErrorState, ProductGridSkeleton, Skeleton } from '../ui/states.jsx';
import { bannerTheme, campaignDiscount, campaignHeadline, featureMark, heroChips, sectionText, showCountdown, tintFor } from '../lib/copy.js';

/** Products beyond which the carousel earns its arrows. */
export const RAIL_ARROWS_AFTER = 4;

/** The home page is the section list the merchant published, in order. */
export default function HomeRoute() {
  const { data, isPending, isError, error, refetch } = useHome();

  if (isPending) return <HomeSkeleton />;
  if (isError) {
    return (
      <main className="bk-wrap" style={{ paddingTop: 60 }}>
        <ErrorState error={error} onRetry={refetch} />
      </main>
    );
  }
  const sections = (data?.sections ?? []).filter(renders);
  if (sections.length === 0) return <EmptyHome />;
  const hasCats = sections.some((s) => s.type === 'cats');

  return (
    <main>
      {sections.map((sec, i) => (
        <Section key={sec.id ?? i} sec={sec} hasCats={hasCats} />
      ))}
    </main>
  );
}

/** Whether a section has anything to draw; an empty one is skipped. */
export function renders(sec) {
  switch (sec?.type) {
    case 'hero':
      return Boolean(sec.hero?.title);
    case 'features':
      return Boolean(sec.features?.items?.length);
    case 'cats':
      return Boolean(sec.cats?.length);
    case 'campaign':
      return Boolean(sec.campaign);
    case 'grid':
    case 'carousel':
      return Boolean(sec.grid?.products?.length);
    case 'story':
      return Boolean(sec.story?.title);
    case 'banner':
      return Boolean(sec.banner?.text);
    default:
      // A type this bundle predates: skipped, the way the resolver skips one
      // it does not know.
      return false;
  }
}

function Section({ sec, hasCats }) {
  switch (sec.type) {
    case 'hero':
      return <Hero hero={sec.hero} hasCats={hasCats} />;
    case 'features':
      return <Features features={sec.features} />;
    case 'cats':
      return <Categories cats={sec.cats} />;
    case 'campaign':
      return <Campaign campaign={sec.campaign} />;
    case 'grid':
      return <Grid grid={sec.grid} />;
    case 'carousel':
      return <Rail grid={sec.grid} />;
    case 'story':
      return <Story story={sec.story} />;
    case 'banner':
      return <Banner banner={sec.banner} />;
    default:
      return null;
  }
}

/** A section's heading row: the title left, "see all" right. */
function SectionHead({ title, children }) {
  return (
    <div className="bk-head">
      <h2 className="bk-h2">{title}</h2>
      {children}
    </div>
  );
}

function SeeAll({ to = '/katalog', children }) {
  return (
    <Link to={to} className="bk-see-all">
      {children}
      <Icon name="arrow" size={16} strokeWidth={2.2} />
    </Link>
  );
}

/* --- hero ---------------------------------------------------------------- */

function Hero({ hero, hasCats }) {
  const config = useConfig();
  const { brand } = config;
  const picture = brand.heroImages?.[0];
  const chips = heroChips(config);
  const stats = (brand.heroStats ?? []).filter((s) => s?.value);
  // The design's round sticker carries the shop's last number.
  const badge = stats[stats.length - 1];

  // The secondary button jumps to the categories on this page when there are
  // any, and to the catalogue otherwise.
  const toCats = (e) => {
    const el = document.getElementById('kategori');
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };

  return (
    <section className="bk-hero">
      <div className="bk-hero-row">
        <div className="bk-hero-copy">
          {brand.hero_eyebrow && <span className="bk-script">{brand.hero_eyebrow}</span>}
          <h1>
            {hero.title}
            {hero.em ? (
              <>
                {' '}
                <em>{hero.em}</em>
              </>
            ) : null}
          </h1>
          {hero.sub && <p className="bk-hero-sub">{hero.sub}</p>}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 4 }}>
            <Link to="/katalog" className="bk-btn bk-btn-primary bk-btn-shadow">
              {hero.cta || 'Belanja sekarang'}
              <Icon name="arrow" size={16} strokeWidth={2.2} />
            </Link>
            <Link to="/katalog" onClick={hasCats ? toCats : undefined} className="bk-btn bk-btn-outline">
              {sectionText(brand.sections, hasCats ? 'hero_secondary_cta' : 'grid_see_all')}
            </Link>
          </div>
          {chips.length > 0 && (
            <ul className="bk-chips">
              {chips.map((c) => (
                <li key={c.icon} className="bk-chip">
                  <span className="bk-chip-icon">
                    <Icon name={c.icon} size={20} />
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <b>{c.title}</b>
                    {c.sub && (
                      <span className="bk-chip-sub">
                        {c.items
                          ? c.items.map((x, i) => (
                              <Fragment key={`${x.code}-${i}`}>
                                {i > 0 ? ' · ' : null}
                                {x.logo_url ? <img className="bk-chip-logo" src={x.logo_url} alt={x.name} title={x.name} loading="lazy" /> : x.name}
                              </Fragment>
                            ))
                          : c.sub}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="bk-hero-art">
          <div className="bk-hero-media">
            <div className="bk-hero-blob" aria-hidden="true" />
            <div className="bk-hero-photo">
              <Img
                src={picture?.url}
                srcSet={picture?.srcset}
                sizes={SIZES.hero}
                alt={picture?.alt ?? ''}
                ratio="1/1"
                priority
                radius={0}
                style={{ position: 'absolute', inset: 0, aspectRatio: 'auto', background: 'var(--bk-tint)' }}
                fallback={<CakeFill />}
              />
            </div>
            {brand.tagline_short && (
              <span className="bk-hero-tag" aria-hidden="true">
                {brand.tagline_short}
              </span>
            )}
            {badge && (
              <div className="bk-hero-badge">
                <b>{badge.value}</b>
                {badge.label && <span>{badge.label}</span>}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/** What an image slot shows before the merchant uploads one. */
function CakeFill({ size = 96 }) {
  return (
    <div aria-hidden="true" style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: 'var(--bk-primary)' }}>
      <Icon name="cake" size={size} strokeWidth={1} />
    </div>
  );
}

/* --- features ----------------------------------------------------------- */

function Features({ features }) {
  return (
    <section className="bk-section" aria-label={features.title || undefined}>
      {features.title && <SectionHead title={features.title} />}
      <ul className="bk-features">
        {features.items.map((it, i) => {
          const mark = featureMark(it.mark);
          return (
            <li key={i} className="bk-feature">
              <span className="bk-feature-mark" aria-hidden="true">
                {mark.icon ? <Icon name={mark.icon} size={20} /> : mark.text}
              </span>
              <b>{it.title}</b>
              {it.body && <p>{it.body}</p>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* --- categories --------------------------------------------------------- */

function Categories({ cats }) {
  const { brand } = useConfig();
  return (
    <section id="kategori" className="bk-section" style={{ scrollMarginTop: 90 }}>
      <SectionHead title={sectionText(brand.sections, 'cats_heading')}>
        <SeeAll>{sectionText(brand.sections, 'grid_see_all')}</SeeAll>
      </SectionHead>
      <div className="bk-cats">
        {cats.map((c) => (
          <Link key={c.key} to={`/katalog?cat=${encodeURIComponent(c.key)}`} className="bk-cat" style={{ background: tintFor(c.key) }}>
            <span className="bk-cat-media">
              <Img
                src={c.image}
                srcSet={c.image_srcset}
                sizes={SIZES.categoryTile}
                alt=""
                ratio="auto"
                radius={0}
                style={{ position: 'absolute', inset: 0, background: 'transparent' }}
                fallback={<Tile label={c.label} tintKey={c.key} size={30} />}
              />
            </span>
            <span className="bk-cat-body">
              <b>{c.label}</b>
              {c.subtitle && <span>{c.subtitle}</span>}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* --- product grid and carousel ------------------------------------------ */

function Grid({ grid }) {
  const { brand } = useConfig();
  return (
    <section className="bk-section">
      <SectionHead title={grid.title || 'Produk pilihan'}>
        <SeeAll>{sectionText(brand.sections, 'grid_see_all')}</SeeAll>
      </SectionHead>
      <div className="bk-grid">
        {grid.products.map((p) => (
          <ProductCard key={p.id} p={p} />
        ))}
      </div>
    </section>
  );
}

function Rail({ grid }) {
  const { brand } = useConfig();
  const track = useRef(null);
  const scroll = (dir) => {
    const el = track.current;
    if (!el) return;
    const smooth = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: smooth ? 'smooth' : 'auto' });
  };
  const arrows = grid.products.length > RAIL_ARROWS_AFTER;

  return (
    <section className="bk-section" style={{ paddingBottom: 8 }}>
      <SectionHead title={grid.title || 'Produk pilihan'}>
        <SeeAll>{sectionText(brand.sections, 'grid_see_all')}</SeeAll>
      </SectionHead>
      <div className="bk-rail">
        {arrows && (
          <>
            <button type="button" className="bk-rail-arrow prev" aria-label="Sebelumnya" onClick={() => scroll(-1)}>
              <Icon name="prev" size={18} strokeWidth={2} />
            </button>
            <button type="button" className="bk-rail-arrow next" aria-label="Berikutnya" onClick={() => scroll(1)}>
              <Icon name="next" size={18} strokeWidth={2} />
            </button>
          </>
        )}
        <ul ref={track} className="bk-rail-track">
          {grid.products.map((p) => (
            <li key={p.id} className="bk-rail-item">
              <ProductCard p={p} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* --- story -------------------------------------------------------------- */

function Story({ story }) {
  const { brand } = useConfig();
  const portrait = brand.aboutImage;
  const stats = (brand.heroStats ?? []).filter((s) => s?.value || s?.label);

  return (
    <section className="bk-story">
      <div className="bk-story-row">
        <div className="bk-story-media">
          <Img
            src={portrait?.url}
            srcSet={portrait?.srcset}
            sizes={SIZES.hero}
            alt={portrait?.alt ?? ''}
            ratio="auto"
            radius={0}
            style={{ position: 'absolute', inset: 0, background: 'var(--bk-sage)' }}
            fallback={<CakeFill />}
          />
        </div>
        <div className="bk-story-copy">
          <span className="bk-eyebrow">{sectionText(brand.sections, 'story_eyebrow')}</span>
          <h2>{story.title}</h2>
          {story.text && <p>{story.text}</p>}
          <Link to="/tentang" className="bk-btn bk-btn-primary" style={{ alignSelf: 'flex-start', marginTop: 6, minHeight: 48 }}>
            {sectionText(brand.sections, 'story_cta')}
            <Icon name="arrow" size={16} strokeWidth={2.2} />
          </Link>
        </div>
        {stats.length > 0 && (
          <dl className="bk-story-stats">
            {stats.map((s, i) => (
              <div key={i} className="bk-stat">
                <dd>{s.value}</dd>
                <dt>{s.label}</dt>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}

/* --- campaign ----------------------------------------------------------- */

function Campaign({ campaign }) {
  const qc = useQueryClient();
  const { brand } = useConfig();
  const products = campaign.products ?? [];
  // A countdown only for a real, near deadline: none for a promotion with no
  // end date, one already past, or one weeks away.
  const ticking = showCountdown(campaign.ends_at, serverNow());
  // The promotion's name leads, as the design has it; one with no name is
  // phrased from its discount.
  const title = String(campaign.title ?? '').trim() || campaignHeadline(campaign);
  const headline = String(campaign.headline ?? '').trim();
  const off = campaignDiscount(campaign);

  return (
    <section className="bk-section">
      <div className="bk-campaign">
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 560, minWidth: 0 }}>
            {(campaign.badge || off) && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {campaign.badge && <span className="bk-badge">{campaign.badge}</span>}
                {off && <span className="bk-badge is-off">{off}</span>}
              </div>
            )}
            <h2>{title}</h2>
            {headline && headline !== title && <p className="bk-campaign-sub">{headline}</p>}
          </div>
          {ticking && (
            <CountdownCells
              until={campaign.ends_at}
              label={sectionText(brand.sections, 'countdown_label')}
              onExpire={() => qc.invalidateQueries({ queryKey: qk.home })}
            />
          )}
        </div>
        {products.length > 0 && (
          <div className="bk-grid">
            {products.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        )}
        <SeeAll to="/katalog?sale=1">{sectionText(brand.sections, 'campaign_cta')}</SeeAll>
      </div>
    </section>
  );
}

/* --- banner ------------------------------------------------------------- */

function Banner({ banner }) {
  const theme = bannerTheme(banner.bg);
  return (
    <section className="bk-section">
      <div className={theme.className}>
        <p>{banner.text}</p>
        {banner.cta && (
          <Link to="/katalog" className={theme.button} style={{ flexShrink: 0 }}>
            {banner.cta}
            <Icon name="arrow" size={16} strokeWidth={2.2} />
          </Link>
        )}
      </div>
    </section>
  );
}

/* --- states ------------------------------------------------------------- */

function EmptyHome() {
  return (
    <main className="bk-wrap" style={{ paddingTop: 60 }}>
      <EmptyState
        title="Toko sedang disiapkan"
        body="Halaman depan belum diisi. Katalognya sudah bisa dilihat."
        action={
          <Link to="/katalog" className="bk-btn bk-btn-primary">
            Lihat katalog
          </Link>
        }
      />
    </main>
  );
}

function HomeSkeleton() {
  return (
    <main aria-busy="true">
      <div style={{ background: 'var(--bk-mist)', height: 420 }} />
      <div className="bk-wrap" style={{ paddingTop: 48 }}>
        <Skeleton height={28} width={260} />
        <div style={{ marginTop: 16 }}>
          <ProductGridSkeleton count={5} />
        </div>
      </div>
    </main>
  );
}
