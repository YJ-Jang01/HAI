export interface Product {
  id: number;
  name: string;
  price: number; // USD price basic number (e.g. 199.99)
  category: string;
  subCategory?: string;
  img: string;
  rating: number;
  reviewCount: number;
  color: string[];
  sizes: string[];
  origin?: string;
  material?: string;
  features?: string[];
  desc: string;
  descImages?: string[];
  brandImages?: string[];
  productInfo?: Record<string, string>;
  ratingDetail: {
    [key: number]: number; // Percentage for 5, 4, 3, 2, 1 stars
  };
  selectedSize?: string;
  selectedColor?: string;
  quantity?: number;
}

export interface Review {
  id: number;
  productId: number;
  userName: string;
  rating: number;
  title: string;
  comment: string;
  date?: string;
}

export interface CartItem {
  id: number;
  name: string;
  price: number; // USD
  img: string;
  selectedSize: string;
  selectedColor: string;
  quantity: number;
  category: string;
}

export interface FilterState {
  mainCategory: string;
  subCategory: string;
  minPrice: number;
  maxPrice: number;
  minRating: number;
  size: string;
  color: string;
  origin: string;
  material: string;
}
