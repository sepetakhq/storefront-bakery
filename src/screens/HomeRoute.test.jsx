import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';

const config = { brand: { nav: [], heroImages: [], heroStats: [], sections: {} } };
vi.mock('@sepetakhq/storefront-kit/config/ConfigProvider', () => ({ useConfig: () => config }));

const home = { data: { sections: [] }, isPending: false, isError: false };
vi.mock('@sepetakhq/storefront-kit/hooks/queries', () => ({ useHome: () => home }));

const cart = { items: [], add: vi.fn(), setQty: vi.fn(), remove: vi.fn() };
vi.mock('@sepetakhq/storefront-kit/cart/CartProvider', () => ({ useCart: () => cart }));
vi.mock('@sepetakhq/storefront-kit/ui/ToastProvider', () => ({ useToast: () => vi.fn() }));

const { default: HomeRoute, RAIL_ARROWS_AFTER } = await import('./HomeRoute.jsx');

afterEach(cleanup);

function setup(sections, brand = {}, rest = {}) {
  Object.assign(config, { freeShipping: false, freeShippingMinLabel: '', paymentMethods: [], couriers: [], ...rest });
  // The provider's substitution: the threshold filled in while the offer is
  // on, the sentence withheld while it is off.
  config.copy = (s) => (config.freeShipping ? String(s).replaceAll('{free_shipping_min}', config.freeShippingMinLabel) : '');
  config.brand = { nav: [], heroImages: [], heroStats: [], sections: {}, ...brand };
  home.data = { sections };
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <HomeRoute />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const HERO = { id: 'h', type: 'hero', hero: { title: 'Camilan Seimbang.', em: 'Hidup Lebih Murni.', sub: 'Sub.', cta: 'Belanja Sekarang' } };
const CATS = { id: 'c', type: 'cats', cats: [{ key: 'kacang', label: 'Kacang & Biji', subtitle: 'Almond, mete' }] };
const product = (i) => ({ id: `p${i}`, slug: `p${i}`, name: `Produk ${i}`, price: 20000, stock: 20, availability: 'available' });
const PRODUCTS = [{ ...product(1), compare_at_price: 30000, on_sale: true }];

describe('HomeRoute', () => {
  it('invites the buyer to the catalogue when nothing is published', () => {
    setup([]);
    expect(screen.getByText('Toko sedang disiapkan')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Lihat katalog' })).toBeTruthy();
    // Still the page's main landmark, so "skip to content" lands on it.
    expect(screen.getByRole('main')).toBeTruthy();
  });

  it('treats a page of empty or unknown sections as empty', () => {
    setup([{ id: 'x', type: 'video-hero' }, { id: 'f', type: 'features', features: { title: 'T', items: [] } }]);
    expect(screen.getByText('Toko sedang disiapkan')).toBeTruthy();
  });

  // hero.em is text after the title, not a part of it (the design's
  // indexOf split drew nothing when the two did not overlap).
  it('draws the hero title with its emphasis after it', () => {
    setup([HERO], { hero_eyebrow: 'Camilan sehat', tagline_short: 'Dibuat dengan cinta', heroStats: [{ value: '10+', label: 'Tahun' }, { value: '50rb+', label: 'Pelanggan' }] });
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.textContent).toBe('Camilan Seimbang. Hidup Lebih Murni.');
    expect(h1.querySelector('em').textContent).toBe('Hidup Lebih Murni.');
    expect(screen.getByText('Camilan sehat')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Belanja Sekarang' }).getAttribute('href')).toBe('/katalog');
    // The sticker carries the shop's last number.
    expect(screen.getByText('50rb+')).toBeTruthy();
    expect(screen.queryByText('10+')).toBeNull();
    expect(screen.getByText('Dibuat dengan cinta')).toBeTruthy();
  });

  it('draws no sticker and no tag for a shop without numbers or a short tagline', () => {
    const { container } = setup([HERO]);
    expect(container.querySelector('.bk-hero-badge')).toBeNull();
    expect(container.querySelector('.bk-hero-tag')).toBeNull();
  });

  it('sends the second hero button to the categories, or the catalogue when there are none', () => {
    setup([HERO, CATS], { sections: { hero_secondary_cta: 'Pilih kategori' } });
    expect(screen.getByRole('link', { name: 'Pilih kategori' })).toBeTruthy();
    expect(document.getElementById('kategori')).toBeTruthy();
    cleanup();
    setup([HERO]);
    expect(screen.queryByRole('link', { name: 'Lihat kategori' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Lihat semua' }).getAttribute('href')).toBe('/katalog');
  });

  it('builds the hero chips from the shop config, never promising what is switched off', () => {
    setup([HERO], {}, {
      freeShipping: true,
      freeShippingMinLabel: 'Rp 150.000',
      paymentMethods: [{ code: 'QRIS', name: 'QRIS', enabled: true }],
      couriers: [{ code: 'jne', name: 'JNE', enabled: true }],
    });
    expect(screen.getByText('Gratis ongkir')).toBeTruthy();
    expect(screen.getByText('min. Rp 150.000')).toBeTruthy();
    expect(screen.getByText('Kurir terpercaya')).toBeTruthy();
    expect(screen.getByText('Pembayaran aman')).toBeTruthy();
    cleanup();
    setup([HERO], {}, { freeShipping: false, freeShippingMinLabel: 'Rp 150.000' });
    expect(screen.queryByText('Gratis ongkir')).toBeNull();
  });

  it("draws the server's badge in the hero chip line, and the name where it sends none", () => {
    const { container } = setup([HERO], {}, {
      paymentMethods: [
        { code: 'BCA', name: 'VA BCA', enabled: true, logo_url: 'http://api.test/logos/payment/bca.svg' },
        { code: 'MANUAL_BANK_1', name: 'Transfer SeaBank', enabled: true },
      ],
      couriers: [{ code: 'jne', name: 'JNE', enabled: true, logo_url: 'http://api.test/logos/courier/jne.svg' }],
    });
    const imgs = [...container.querySelectorAll('img.bk-chip-logo')];
    expect(imgs.map((i) => i.getAttribute('alt'))).toEqual(['JNE', 'VA BCA']);
    expect(screen.getByText(/Transfer SeaBank/)).toBeTruthy();
  });

  it('draws each feature mark as typed, and a heart for none', () => {
    const { container } = setup([
      { id: 'f', type: 'features', features: { title: 'Kenapa kami', items: [{ mark: '01', title: 'Alami', body: 'Butter asli.' }, { mark: '24j', title: 'Cepat' }, { mark: '', title: 'Tanpa' }] } },
    ]);
    expect(screen.getByRole('region', { name: 'Kenapa kami' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Kenapa kami' })).toBeTruthy();
    expect(screen.getByText('01')).toBeTruthy();
    expect(screen.getByText('Butter asli.')).toBeTruthy();
    expect(screen.getByText('24j')).toBeTruthy();
    expect(container.querySelectorAll('.bk-feature-mark svg')).toHaveLength(1);
  });

  it('links categories into the catalogue filter, with initials for a missing picture', () => {
    setup([CATS]);
    expect(screen.getByRole('link', { name: /Kacang & Biji/ }).getAttribute('href')).toBe('/katalog?cat=kacang');
    expect(screen.getByText('KB')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Pilih kategori favoritmu' })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Lihat semua/ }).getAttribute('href')).toBe('/katalog');
  });

  it('gives the carousel arrows only once it holds more than fits', () => {
    const few = Array.from({ length: RAIL_ARROWS_AFTER }, (_, i) => product(i));
    setup([{ id: 'g', type: 'carousel', grid: { title: 'Pilihan', products: few } }]);
    expect(screen.queryByRole('button', { name: 'Berikutnya' })).toBeNull();
    cleanup();
    setup([{ id: 'g', type: 'carousel', grid: { title: 'Pilihan', products: [...few, product(9)] } }]);
    expect(screen.getByRole('button', { name: 'Berikutnya' })).toBeTruthy();
    expect(screen.getAllByTestId('product-card')).toHaveLength(RAIL_ARROWS_AFTER + 1);
  });

  // The design lays a grid section out as a grid: every product at once,
  // no arrows however many there are.
  it('draws a grid section as a grid', () => {
    const many = Array.from({ length: RAIL_ARROWS_AFTER + 3 }, (_, i) => product(i));
    const { container } = setup([{ id: 'g', type: 'grid', grid: { title: 'Paling favorit', products: many } }]);
    expect(container.querySelector('.bk-grid')).toBeTruthy();
    expect(screen.getAllByTestId('product-card')).toHaveLength(many.length);
    expect(screen.queryByRole('button', { name: 'Berikutnya' })).toBeNull();
  });

  it('skips an empty grid and renders a filled one', () => {
    setup([
      { id: 'g0', type: 'grid', grid: { title: 'Kosong', products: [] } },
      { id: 'g1', type: 'carousel', grid: { title: 'Paling laris', products: PRODUCTS } },
    ]);
    expect(screen.queryByText('Kosong')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Paling laris' })).toBeTruthy();
  });

  it('shows the campaign badge and title, and a countdown only inside a week', () => {
    const soon = new Date(Date.now() + 54 * 3600 * 1000).toISOString();
    const far = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
    setup([{ id: 'c', type: 'campaign', campaign: { badge: 'Hemat 20%', title: 'Flash Sale', discount_type: 'percentage', discount_value: 20, ends_at: soon, products: PRODUCTS } }]);
    expect(screen.getByText('Hemat 20%')).toBeTruthy();
    expect(screen.getByText('−20%')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Flash Sale' })).toBeTruthy();
    expect(screen.getByRole('timer')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Lihat semua promo/ }).getAttribute('href')).toBe('/katalog?sale=1');
    expect(screen.getByText('Berakhir dalam')).toBeTruthy();

    cleanup();
    setup([{ id: 'c', type: 'campaign', campaign: { title: 'Flash Sale', ends_at: far, products: PRODUCTS } }]);
    expect(screen.queryByRole('timer')).toBeNull();
  });

  // A promotion with no end date must not draw 00:00:00:00.
  it('draws no countdown for a campaign with no end, and phrases one with no title', () => {
    setup([{ id: 'c', type: 'campaign', campaign: { title: '', discount_type: 'percentage', discount_value: 30, ends_at: null, products: [] } }]);
    expect(screen.queryByRole('timer')).toBeNull();
    expect(screen.queryByText(/Berakhir dalam/)).toBeNull();
    expect(screen.getByRole('heading', { name: 'Diskon hingga 30%' })).toBeTruthy();
  });

  // The design leads with the promotion's name and puts the headline under it.
  it("titles the campaign with its name, the shop's headline under it, and the shop's labels", () => {
    const soon = new Date(Date.now() + 5 * 3600 * 1000).toISOString();
    setup([{ id: 'c', type: 'campaign', campaign: { title: 'Flash Sale', headline: 'Hemat akhir bulan', ends_at: soon, products: PRODUCTS } }], {
      sections: { campaign_cta: 'Semua diskon', countdown_label: 'Sisa waktu' },
    });
    expect(screen.getByRole('heading', { name: 'Flash Sale' })).toBeTruthy();
    expect(screen.getByText('Hemat akhir bulan')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Semua diskon/ })).toBeTruthy();
    expect(screen.getByText('Sisa waktu')).toBeTruthy();
    expect(screen.queryByText('Berakhir dalam')).toBeNull();
  });

  it('sends the story to the about page, with the stats the shop filled in', () => {
    setup([{ id: 's', type: 'story', story: { title: 'Sejak 2019', text: 'Kami mulai kecil.' } }], {
      sections: { story_eyebrow: 'Cerita kami', story_cta: 'Kenali kami' },
      heroStats: [{ value: '10.000+', label: 'Pelanggan puas' }],
    });
    expect(screen.getByText('Cerita kami')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Kenali kami' }).getAttribute('href')).toBe('/tentang');
    expect(screen.getByText('10.000+').closest('dd')).toBeTruthy();
    expect(screen.getByText('Pelanggan puas').closest('dt')).toBeTruthy();
  });

  it('maps the banner tone names to its two bands, and links the catalogue', () => {
    const { container } = setup([{ id: 'b', type: 'banner', banner: { text: 'Pesan hampers?', cta: 'Belanja', bg: 'pink' } }]);
    expect(container.querySelector('.bk-banner.is-pink')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Belanja' }).getAttribute('href')).toBe('/katalog');
    cleanup();
    const quiet = setup([{ id: 'b', type: 'banner', banner: { text: 'Halo', bg: 'butter' } }]);
    expect(quiet.container.querySelector('.bk-banner.is-butter')).toBeTruthy();
    expect(screen.queryByRole('link')).toBeNull();
  });
});
