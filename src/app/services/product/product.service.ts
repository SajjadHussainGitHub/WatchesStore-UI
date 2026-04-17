import { Injectable } from '@angular/core';
import { BehaviorSubject, map, Observable } from 'rxjs';
import { Product } from '../../interfaces/product';
import { ProductAttribute } from '../../interfaces/product-attribute';
import { ProductReview } from '../../interfaces/product-review';

@Injectable()
export class ProductService {
  private readonly storageKey = 'eshop.products';
  /** Bundled JPEGs under `src/assets/products/{1..POOL}.jpg` (shared visual pool). */
  private readonly productImagePool = 48;
  /** Hero images by model number (all three views use the same file when only one asset exists). */
  private readonly heroImageByModelNumber: Record<string, string> = {
    'MW-48144': 'assets/products/Rolex_MW-48144.png',
  };
  private readonly brands = [
    'Rolex',
    'Omega',
    'Seiko',
    'Casio',
    'Citizen',
    'Tissot',
    'Tag Heuer',
    'Longines',
    'Breitling',
    'Rado',
    'Fossil',
    'Timex',
    'Hamilton',
    'Oris',
    'Hublot',
    'Panerai',
    'Cartier',
    'Audemars Piguet',
    'Patek Philippe',
    'IWC',
  ];
  private readonly productsPerBrand = 12;
  private readonly reviewerNames = [
    'Alex M.',
    'Jordan K.',
    'Samira L.',
    'Chris P.',
    'Taylor R.',
    'Morgan D.',
    'Riley S.',
    'Casey W.',
  ];
  private readonly reviewBodies: ((productTitle: string) => string)[] = [
    (t) =>
      `Really pleased with ${t}. The finish feels premium and it keeps excellent time after two weeks of daily wear.`,
    (t) =>
      `${t} looks even better in person than in photos. Comfortable on the wrist and the crown action is crisp.`,
    (t) =>
      `Solid purchase. ${t} pairs well with both casual and smarter outfits—exactly what I was looking for.`,
    (t) =>
      `Fast delivery, well packaged. ${t} runs within expectations and the bracelet/clasp feels reassuring.`,
    (t) =>
      `Five stars for build quality. I would recommend ${t} to anyone wanting a dependable daily piece.`,
    (t) =>
      `Great value at this price band. ${t} has a clear dial and lume that works well in low light.`,
    (t) =>
      `Customer support answered sizing questions quickly. ${t} has been a joy to own so far.`,
    (t) =>
      `Exceeded my expectations—${t} feels balanced on the wrist and the weight is just right.`,
  ];
  private readonly initialProducts: Product[] = this.buildInitialProducts();
  private productsSubject = new BehaviorSubject<Product[]>(this.readProducts());

  create(product) {
    const products = this.readProducts();
    const newProduct: Product = {
      ...product,
      $key: `prod-${Date.now()}`,
    };
    const views = this.viewImageUrlsForProductKey(newProduct.$key);
    newProduct.imageUrl = newProduct.imageUrl || views[0];
    newProduct.viewImageUrls = newProduct.viewImageUrls?.length
      ? newProduct.viewImageUrls
      : views;
    if (!newProduct.reviews?.length) {
      const r = Number(newProduct.rating);
      newProduct.reviews = this.buildReviewsForProduct(
        newProduct.$key,
        Number.isFinite(r) ? r : 4.5,
        newProduct.title || 'this watch',
      );
    }
    const brandLabel = this.brandLabelFromCategory(newProduct.category);
    const mn = newProduct.modelNumber || this.buildModelNumber(newProduct.$key);
    if (!newProduct.attributes?.length) {
      newProduct.attributes = this.buildProductAttributes(
        newProduct.$key,
        brandLabel,
        mn,
        newProduct.title || 'Product',
      );
    }
    if (!newProduct.longDescription?.trim()) {
      newProduct.longDescription = this.buildLongDescription(
        brandLabel,
        newProduct.title || 'Product',
        this.hashToInt(newProduct.$key),
      );
    }
    products.push(newProduct);
    this.writeProducts(products);
    return Promise.resolve({ key: newProduct.$key });
  }

  getAll() {
    return this.productsSubject.asObservable();
  }

  getProduct(productId) {
    return this.getAll().pipe(
      map((products) => products.find((product) => product.$key === productId) as Product),
    );
  }

  /** Other products in the same category (e.g. “You may also like”). */
  getRecommendedProducts(
    excludeProductId: string,
    category: string,
    limit = 4,
  ): Observable<Product[]> {
    return this.getAll().pipe(
      map((products) =>
        products
          .filter((p) => p.$key !== excludeProductId && p.category === category)
          .slice(0, limit),
      ),
    );
  }

  updateProduct(productId, product) {
    const products = this.readProducts().map((p) =>
      p.$key === productId ? { ...p, ...product, $key: productId } : p,
    );
    this.writeProducts(products);
    return Promise.resolve();
  }

  /**
   * Appends a shopper-submitted review and updates aggregate rating / count.
   */
  async addCustomerReview(
    productId: string,
    input: {
      author: string;
      rating: number;
      title?: string;
      comment: string;
    },
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    const author = input.author.trim();
    const comment = input.comment.trim();
    const title = input.title?.trim();

    if (!author) {
      return { ok: false, error: 'Please enter your name.' };
    }
    if (!comment) {
      return { ok: false, error: 'Please write a short comment.' };
    }
    const rating = Math.round(Number(input.rating));
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return { ok: false, error: 'Please choose a rating from 1 to 5 stars.' };
    }

    const products = this.readProducts();
    const idx = products.findIndex((p) => p.$key === productId);
    if (idx < 0) {
      return { ok: false, error: 'Product not found.' };
    }

    const p: Product = { ...products[idx] };
    const reviews = [...(p.reviews || [])];
    const date = new Date().toISOString().slice(0, 10);

    reviews.push({
      id: `rev-${Date.now()}-${Math.abs(this.hashToInt(`${author}|${date}|${comment.slice(0, 20)}`))}`,
      author,
      rating,
      title: title || undefined,
      comment,
      date,
      submittedByCustomer: true,
    });

    p.reviews = reviews;
    this.syncRatingAggregateFromReviews(p);

    products[idx] = p;
    this.writeProducts(products);
    return { ok: true };
  }

  /**
   * Removes a single review (e.g. abusive or bad feedback). Updates rating aggregate.
   */
  async removeProductReview(
    productId: string,
    reviewId: string,
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    if (!reviewId?.trim()) {
      return { ok: false, error: 'Invalid review.' };
    }
    const products = this.readProducts();
    const idx = products.findIndex((p) => p.$key === productId);
    if (idx < 0) {
      return { ok: false, error: 'Product not found.' };
    }

    const p: Product = { ...products[idx] };
    const reviews = [...(p.reviews || [])];
    const rid = reviewId.trim();
    const next = reviews.filter((r) => r.id !== rid);
    if (next.length === reviews.length) {
      return { ok: false, error: 'Review not found.' };
    }

    p.reviews = next;
    if (next.length) {
      this.syncRatingAggregateFromReviews(p);
    } else {
      p.rating = undefined;
      p.ratingCount = undefined;
    }

    products[idx] = p;
    this.writeProducts(products);
    return { ok: true };
  }

  deleteProduct(productId) {
    const products = this.readProducts().filter((product) => product.$key !== productId);
    this.writeProducts(products);
    return Promise.resolve();
  }

  private readProducts(): Product[] {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) {
      localStorage.setItem(this.storageKey, JSON.stringify(this.initialProducts));
      return [...this.initialProducts];
    }

    const parsed = JSON.parse(raw) as Product[];
    if (!Array.isArray(parsed)) {
      localStorage.setItem(this.storageKey, JSON.stringify(this.initialProducts));
      return [...this.initialProducts];
    }

    const migrated = parsed.map((p) => this.ensureProductFields(p));
    localStorage.setItem(this.storageKey, JSON.stringify(migrated));
    return migrated;
  }

  private writeProducts(products: Product[]) {
    localStorage.setItem(this.storageKey, JSON.stringify(products));
    this.productsSubject.next(products);
  }

  /**
   * Maps each product to three asset paths: optional hero PNG by model, else JPEG pool.
   */
  private viewImageUrlsForProductKey(productKey: string): string[] {
    const model = this.buildModelNumber(productKey);
    const hero = this.heroImageByModelNumber[model];
    if (hero) {
      return [hero, hero, hero];
    }
    const h = Math.abs(this.hashToInt(productKey));
    const i1 = (h % this.productImagePool) + 1;
    const i2 = ((h + 17) % this.productImagePool) + 1;
    const i3 = ((h + 31) % this.productImagePool) + 1;
    return [
      `assets/products/${i1}.jpg`,
      `assets/products/${i2}.jpg`,
      `assets/products/${i3}.jpg`,
    ];
  }

  private usesBundledProductImages(p: Product): boolean {
    const vu = p.viewImageUrls;
    if (
      typeof p.imageUrl !== 'string' ||
      !p.imageUrl.startsWith('assets/products/') ||
      !Array.isArray(vu) ||
      vu.length < 3
    ) {
      return false;
    }
    return vu.slice(0, 3).every((u) => typeof u === 'string' && u.startsWith('assets/products/'));
  }

  /** Sync images from catalog rules without overwriting admin-set external URLs. */
  private applyCanonicalImages(migrated: Product): void {
    const canonical = this.viewImageUrlsForProductKey(migrated.$key);
    const url = migrated.imageUrl;
    const isOurAsset =
      typeof url === 'string' &&
      url.startsWith('assets/products/') &&
      !url.startsWith('http://') &&
      !url.startsWith('https://');
    const isGeneratedSvg = typeof url === 'string' && url.startsWith('data:image/svg+xml');
    const canOverwrite = !url || isGeneratedSvg || isOurAsset;

    if (!canOverwrite) {
      return;
    }

    const cur = migrated.viewImageUrls;
    const matches =
      url === canonical[0] &&
      Array.isArray(cur) &&
      cur.length === 3 &&
      cur[0] === canonical[0] &&
      cur[1] === canonical[1] &&
      cur[2] === canonical[2];

    if (!matches) {
      migrated.imageUrl = canonical[0];
      migrated.viewImageUrls = [...canonical];
    }
  }

  private buildInitialProducts(): Product[] {
    const products: Product[] = [];
    let seed = 1;

    for (const brand of this.brands) {
      const category = `cat-${brand.toLowerCase().replace(/\s+/g, '-')}`;

      for (let i = 1; i <= this.productsPerBrand; i++) {
        const baseLabel = `${brand} Watch ${i.toString().padStart(2, '0')}`;
        const productKey = `prod-${brand.toLowerCase().replace(/\s+/g, '-')}-${i}`;
        const [frontImage, sideImage, thirdImage] = this.viewImageUrlsForProductKey(productKey);

        const basePrice = Number((250 + (seed % 40) * 25).toFixed(2));
        const discountPercent = 10 + (seed % 26); // 10% - 35%
        const discountPrice = Number(
          (basePrice * (1 - discountPercent / 100)).toFixed(2),
        );

        // Ratings between ~3.6 and 5.0
        const rating = Number((3.6 + ((seed % 14) / 14) * 1.4).toFixed(1));
        const ratingCount = 120 + (seed % 830);
        const modelNo = this.buildModelNumber(productKey);

        products.push({
          $key: productKey,
          title: baseLabel,
          price: basePrice.toFixed(2),
          modelNumber: modelNo,
          discountPrice: discountPrice.toFixed(2),
          discountPercent,
          rating,
          ratingCount,
          category,
          imageUrl: frontImage,
          viewImageUrls: [frontImage, sideImage, thirdImage],
          reviews: this.buildReviewsForProduct(productKey, rating, baseLabel),
          attributes: this.buildProductAttributes(productKey, brand, modelNo, baseLabel),
          longDescription: this.buildLongDescription(brand, baseLabel, seed),
        });
        seed++;
      }
    }

    return products;
  }

  private ensureProductFields(p: Product): Product {
    // Use a deterministic numeric seed so migration is stable.
    const seed = this.hashToInt(`${p.$key}|${p.title}`);

    const migrated: Product = { ...p };

    // Ensure model number
    if (!migrated.modelNumber) {
      migrated.modelNumber = this.buildModelNumber(migrated.$key);
    }

    const needsImageMigration =
      !this.usesBundledProductImages(migrated) ||
      (typeof migrated.imageUrl === 'string' &&
        migrated.imageUrl.startsWith('data:image/svg+xml'));

    if (needsImageMigration) {
      const [front, side, third] = this.viewImageUrlsForProductKey(migrated.$key);
      migrated.imageUrl = front;
      migrated.viewImageUrls = [front, side, third];
    } else {
      this.applyCanonicalImages(migrated);
    }

    // Ensure ratings
    if (migrated.rating == null || migrated.ratingCount == null) {
      migrated.rating = Number((3.6 + ((seed % 14) / 14) * 1.4).toFixed(1));
      migrated.ratingCount = 120 + (seed % 830);
    }

    // Ensure discounts
    const basePrice = Number(migrated.price);
    if (migrated.discountPercent == null || migrated.discountPrice == null) {
      const computedDiscountPercent = 10 + (seed % 26); // 10% - 35%
      const computedDiscountPrice = Number(
        (Number.isFinite(basePrice) ? basePrice : 0) *
          (1 - computedDiscountPercent / 100),
      ).toFixed(2);

      migrated.discountPercent = computedDiscountPercent;
      migrated.discountPrice = computedDiscountPrice;
    }

    // Seed reviews only when missing (undefined/null), not when admin cleared to []
    if (migrated.reviews == null) {
      const title = migrated.title || migrated.$key;
      const overall = migrated.rating ?? 4.5;
      migrated.reviews = this.buildReviewsForProduct(migrated.$key, overall, title);
    } else if (Array.isArray(migrated.reviews) && migrated.reviews.length > 0) {
      migrated.reviews = migrated.reviews.map((r, i) => ({
        ...r,
        id:
          r.id ||
          `rev-${migrated.$key}-${i}-${Math.abs(this.hashToInt(`${r.author}|${r.date}|${i}`))}`,
      }));
    }

    this.syncRatingAggregateFromReviews(migrated);

    const brandLabel = this.brandLabelFromCategory(migrated.category);
    if (!migrated.attributes?.length) {
      migrated.attributes = this.buildProductAttributes(
        migrated.$key,
        brandLabel,
        migrated.modelNumber || this.buildModelNumber(migrated.$key),
        migrated.title || migrated.$key,
      );
    }

    if (!migrated.longDescription?.trim()) {
      migrated.longDescription = this.buildLongDescription(
        brandLabel,
        migrated.title || migrated.$key,
        seed,
      );
    }

    return migrated;
  }

  /** Aligns headline rating with the current reviews list (average + count). */
  private syncRatingAggregateFromReviews(p: Product): void {
    const list = p.reviews;
    if (!list?.length) {
      p.rating = undefined;
      p.ratingCount = undefined;
      return;
    }
    const sum = list.reduce((s, r) => s + (Number(r.rating) || 0), 0);
    p.ratingCount = list.length;
    p.rating = Math.round((sum / list.length) * 10) / 10;
  }

  private buildReviewsForProduct(
    productKey: string,
    overallRating: number,
    productTitle: string,
  ): ProductReview[] {
    const h = Math.abs(this.hashToInt(productKey + '-reviews'));
    const count = 3 + (h % 2);
    const reviews: ProductReview[] = [];
    const titleShort = productTitle.length > 48 ? `${productTitle.slice(0, 45)}…` : productTitle;

    for (let i = 0; i < count; i++) {
      const hi = Math.abs(this.hashToInt(`${productKey}|review|${i}`));
      const jitter = (hi % 11) / 10 - 0.5;
      let stars = Math.round(overallRating + jitter);
      stars = Math.min(5, Math.max(4, stars));
      if (overallRating < 4) {
        stars = Math.min(5, Math.max(3, Math.round(overallRating + jitter * 0.8)));
      }

      const author = this.reviewerNames[(hi + i) % this.reviewerNames.length];
      const commentFn = this.reviewBodies[hi % this.reviewBodies.length];
      const month = 1 + (hi % 12);
      const day = 1 + ((hi >> 3) % 28);
      const year = 2024 + (hi % 2);

      reviews.push({
        id: `rev-${productKey}-${i}-${hi}`,
        author,
        rating: stars,
        title:
          hi % 3 === 0
            ? stars >= 5
              ? 'Highly recommend'
              : 'Great daily wear'
            : undefined,
        comment: commentFn(titleShort),
        date: `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`,
      });
    }

    return reviews;
  }

  private buildModelNumber(productKey: string): string {
    const n = Math.abs(this.hashToInt(productKey)) % 100000;
    return `MW-${n.toString().padStart(5, '0')}`;
  }

  private brandLabelFromCategory(category: string): string {
    if (!category || !category.startsWith('cat-')) {
      return 'Watches';
    }
    return category
      .replace(/^cat-/, '')
      .split('-')
      .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : ''))
      .join(' ');
  }

  private buildLongDescription(brand: string, title: string, seed: number): string {
    const focus =
      seed % 3 === 0
        ? 'dress-friendly proportions'
        : seed % 3 === 1
          ? 'tool-watch durability'
          : 'collector-grade finishing';
    return (
      `${title} from the ${brand} line balances refined detailing with everyday wearability. ` +
      `This reference emphasises ${focus}: crisp dial legibility, a case profile tuned for comfort, ` +
      `and components chosen for dependable timekeeping. Each unit is checked before dispatch and ships with our ` +
      `standard authenticity guarantee and care guidelines.`
    );
  }

  private buildProductAttributes(
    productKey: string,
    brandName: string,
    modelNumber: string,
    title: string,
  ): ProductAttribute[] {
    const h = Math.abs(this.hashToInt(productKey));
    const caseSizes = ['38 mm', '40 mm', '41 mm', '42 mm', '43 mm', '44 mm'];
    const thicknesses = ['9.8 mm', '10.5 mm', '11.2 mm', '12.0 mm', '13.1 mm'];
    const movements = [
      'Automatic',
      'Quartz',
      'Automatic (chronometer)',
      'Manual winding',
      'Solar quartz',
    ];
    const crystals = ['Sapphire', 'Sapphire with AR coating', 'Mineral crystal'];
    const straps = [
      'Stainless steel bracelet',
      'Leather',
      'Rubber',
      'NATO textile',
      'Oyster-style bracelet',
    ];
    const water = ['30 m (3 ATM)', '50 m (5 ATM)', '100 m (10 ATM)', '200 m (20 ATM)', '300 m (30 ATM)'];
    const dialColors = ['Black', 'Sunburst blue', 'Silver', 'Champagne', 'Anthracite', 'Green'];

    const sku = `WS-${(h >>> 0).toString(36).toUpperCase().slice(0, 6)}-${(h % 900) + 100}`;

    return [
      { group: 'Product identity', label: 'Brand', value: brandName },
      { group: 'Product identity', label: 'Product name', value: title },
      { group: 'Product identity', label: 'Model number', value: modelNumber },
      { group: 'Product identity', label: 'SKU', value: sku },
      { group: 'Product identity', label: 'Collection', value: `${brandName} Signature` },

      { group: 'Case & dial', label: 'Case diameter', value: caseSizes[h % caseSizes.length] },
      { group: 'Case & dial', label: 'Case thickness', value: thicknesses[(h >> 2) % thicknesses.length] },
      { group: 'Case & dial', label: 'Lug to lug', value: `${46 + (h % 8)} mm` },
      {
        group: 'Case & dial',
        label: 'Case material',
        value: h % 2 ? 'Stainless steel 316L' : 'Titanium grade 2',
      },
      { group: 'Case & dial', label: 'Bezel', value: h % 3 ? 'Fixed' : 'Unidirectional rotating' },
      { group: 'Case & dial', label: 'Dial colour', value: dialColors[(h >> 1) % dialColors.length] },
      { group: 'Case & dial', label: 'Crystal', value: crystals[h % crystals.length] },

      { group: 'Movement', label: 'Movement type', value: movements[h % movements.length] },
      { group: 'Movement', label: 'Caliber / module', value: `Cal. ${(h % 9000) + 1000}` },
      { group: 'Movement', label: 'Power reserve', value: `${28 + (h % 20)} hours` },
      { group: 'Movement', label: 'Frequency', value: `${28800 - (h % 4) * 800} vph` },

      { group: 'Strap & wear', label: 'Strap / bracelet', value: straps[(h >> 3) % straps.length] },
      { group: 'Strap & wear', label: 'Strap width', value: `${20 + (h % 3)} mm` },
      {
        group: 'Strap & wear',
        label: 'Clasp',
        value: h % 2 ? 'Folding clasp with safety' : 'Pin buckle',
      },
      { group: 'Strap & wear', label: 'Weight (approx.)', value: `${120 + (h % 60)} g` },

      { group: 'Water resistance & warranty', label: 'Water resistance', value: water[(h >> 4) % water.length] },
      { group: 'Water resistance & warranty', label: 'Warranty', value: '2 years international' },
      {
        group: 'Water resistance & warranty',
        label: 'Country of origin',
        value: h % 2 ? 'Switzerland' : 'Japan',
      },
    ];
  }

  private hashToInt(input: string): number {
    // Simple stable hash (non-crypto) for deterministic UI fields.
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      hash = (hash * 31 + input.charCodeAt(i)) | 0;
    }
    return hash;
  }
}
