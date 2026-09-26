import { Link } from 'react-router-dom';

import { useConfig } from '@sepetakhq/storefront-kit/config/ConfigProvider';
import { useCategories } from '@sepetakhq/storefront-kit/hooks/queries';

import { BrandMark } from './BrandMark.jsx';
import Icon, { ICONS } from '../ui/Icon.jsx';
import { footerLinks, originLine, sectionText, socialAbbr, socialLabel } from '../lib/copy.js';

/**
 * The design's light footer, from config alone: the mark, tagline and
 * socials; the merchant's own links; the categories; contact; the payment
 * methods and couriers the shop has switched on; and along the bottom the
 * copyright and where the shop ships from. A column with nothing to list is
 * not drawn, so a bare new shop gets a short footer rather than headings over
 * nothing.
 */
export default function Footer() {
  const { brand, paymentMethods, couriers } = useConfig();
  const { data: categories } = useCategories();
  const payments = (paymentMethods ?? []).filter((m) => m.enabled && m.name);
  const ships = (couriers ?? []).filter((c) => c.enabled && c.name);
  const socials = (brand.social_links ?? []).filter((s) => s.url);
  const links = footerLinks(brand.nav);
  const cats = categories ?? [];
  const address = [brand.address_line1, brand.address_line2].filter(Boolean);
  const phoneHref = brand.phone ? `tel:${String(brand.phone).replace(/[^\d+]/g, '')}` : '';
  const hasContact = Boolean(brand.phone || brand.email || address.length || brand.opening_hours);
  const origin = originLine(brand);
  const s = (key) => sectionText(brand.sections, key);

  return (
    <footer className="bk-footer">
      <div className="bk-footer-grid">
        <div className="bk-footer-col">
          <Link to="/" aria-label="Beranda" style={{ alignSelf: 'flex-start' }}>
            <BrandMark height={38} maxWidth={180} />
          </Link>
          {brand.tagline && <p style={{ margin: 0, lineHeight: 1.6, textWrap: 'pretty' }}>{brand.tagline}</p>}
          {socials.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {socials.map((so, i) => (
                <a
                  key={`${so.kind}-${i}`}
                  href={so.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={socialLabel(so.kind)}
                  title={socialLabel(so.kind)}
                  className="bk-social"
                >
                  {/* A kind this bundle has no glyph for keeps its letters. */}
                  {ICONS.includes(so.kind) ? <Icon name={so.kind} size={18} /> : socialAbbr(so.kind)}
                </a>
              ))}
            </div>
          )}
        </div>

        {links.length > 0 && (
          <nav className="bk-footer-col" aria-label={s('footer_shop_heading')}>
            <h4>{s('footer_shop_heading')}</h4>
            {links.map((n) => (
              <Link key={n.path} to={n.path}>
                {n.label}
              </Link>
            ))}
          </nav>
        )}

        {cats.length > 0 && (
          <nav className="bk-footer-col" aria-label={s('footer_categories_heading')}>
            <h4>{s('footer_categories_heading')}</h4>
            {cats.map((c) => (
              <Link key={c.key} to={`/katalog?cat=${encodeURIComponent(c.key)}`}>
                {c.label}
              </Link>
            ))}
          </nav>
        )}

        {hasContact && (
          <div className="bk-footer-col">
            <h4>{s('footer_contact_heading')}</h4>
            {brand.phone && (
              <a href={phoneHref} className="bk-footer-row">
                <Icon name="phone" size={16} />
                {brand.phone}
              </a>
            )}
            {brand.email && (
              <a href={`mailto:${brand.email}`} className="bk-footer-row">
                <Icon name="mail" size={16} />
                {brand.email}
              </a>
            )}
            {address.length > 0 && (
              <span className="bk-footer-row" style={{ alignItems: 'flex-start', lineHeight: 1.5 }}>
                <Icon name="pin" size={16} style={{ marginTop: 3 }} />
                <span>
                  {address.map((l, i) => (
                    <span key={i} style={{ display: 'block' }}>
                      {l}
                    </span>
                  ))}
                </span>
              </span>
            )}
            {brand.opening_hours && (
              <span className="bk-footer-row">
                <Icon name="clock" size={16} />
                {brand.opening_hours}
              </span>
            )}
          </div>
        )}

        {(payments.length > 0 || ships.length > 0) && (
          <div className="bk-footer-col" style={{ gap: 18 }}>
            {payments.length > 0 && (
              <div className="bk-footer-col" style={{ gap: 10 }}>
                <h4>{s('footer_payment_heading')}</h4>
                <div className="bk-footer-chips">
                  {payments.map((m) => (
                    <span key={m.code} className="bk-footer-chip">
                      {m.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {ships.length > 0 && (
              <div className="bk-footer-col" style={{ gap: 10 }}>
                <h4>{s('footer_shipping_heading')}</h4>
                <div className="bk-footer-chips">
                  {ships.map((c) => (
                    <span key={c.code} className="bk-footer-chip">
                      {c.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {(brand.copyright || origin) && (
        <div className="bk-footer-bottom">
          <div>
            <span>{brand.copyright || ''}</span>
            {origin && <span>{origin}</span>}
          </div>
        </div>
      )}
    </footer>
  );
}
