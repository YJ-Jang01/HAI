export {
  getAmazon2023Categories as getAmazonCategories,
  getAmazon2023Facets as getProductFacets,
  getAmazon2023Manifest,
  getAmazon2023ProductDetail,
  getAmazon2023ProductDetails,
  searchAmazon2023Products as searchProducts,
} from "./amazon2023.js";

export type {
  Amazon2023ProductFilters as ProductFilterParams,
  Amazon2023ProductSearchParams as ProductSearchParams,
  Amazon2023ProductView,
  Amazon2023Sort as ProductSort,
} from "./amazon2023.js";

export type AmazonLocale = "en" | "ko";
