/** Single row in the product specifications table */
export interface ProductAttribute {
  label: string;
  value: string;
  /** Groups rows under section headings (e.g. Case, Movement) */
  group?: string;
}
