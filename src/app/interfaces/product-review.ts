/** Customer feedback attached to a product */
export interface ProductReview {
  /** Stable id for admin removal and updates */
  id?: string;
  author: string;
  rating: number;
  title?: string;
  comment: string;
  /** ISO date string (YYYY-MM-DD) for display */
  date: string;
  /** True when added from the product page form (stored in local data) */
  submittedByCustomer?: boolean;
}
