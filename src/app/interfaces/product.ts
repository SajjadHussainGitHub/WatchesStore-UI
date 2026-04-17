import { ProductReview } from './product-review';
import { ProductAttribute } from './product-attribute';

export interface Product {
  $key: string;
  title: string;
  price: string;
  modelNumber?: string;
  // Customer-facing rating (0-5) + number of reviews
  rating?: number;
  ratingCount?: number;
  // If present, show this discounted price to customers
  discountPrice?: string;
  discountPercent?: number;
  category: string;
  imageUrl: string;
  viewImageUrls?: string[];
  /** Verbatim customer feedback shown on the product page */
  reviews?: ProductReview[];
  /** Structured specifications (case, movement, strap, etc.) */
  attributes?: ProductAttribute[];
  /** Editorial / marketing copy for the PDP */
  longDescription?: string;
}
