import axiosInstance from './axiosInstance';

export interface ProductImage {
  id: number;
  url: string;
  is_primary: boolean;
  sort_order: number;
}

export interface ProductDetail {
  id: number;
  name: string;
  description: string | null;
  category_id: number | null;
  category_name: string | null;
  price: string;
  discount_price: string | null;
  stock: number;
  status: 'active' | 'inactive';
  is_featured: boolean;
  images: ProductImage[];
  avg_rating: string | null;
  created_at: string;
}

export interface Product {
  id: number;
  name: string;
  description: string | null;
  category_id: number | null;
  category_name: string | null;
  price: string;
  discount_price: string | null;
  stock: number;
  status: 'active' | 'inactive';
  is_featured: boolean;
  primary_image_url: string | null;
  avg_rating: string | null;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
}

export interface ProductsResponse {
  success: boolean;
  data: Product[];
  pagination: PaginationMeta;
}

export interface CategoriesResponse {
  success: boolean;
  data: Category[];
}

export interface FetchProductsParams {
  page?: number;
  pageSize?: number;
  q?: string;
  categoryId?: number | string;
  minPrice?: number | string;
  maxPrice?: number | string;
  sort?: string;
}

export async function fetchProducts(params: FetchProductsParams = {}): Promise<ProductsResponse> {
  // Strip empty/undefined values so they don't pollute the query string
  const cleanParams: Record<string, string | number> = {};
  if (params.page !== undefined && params.page !== null) cleanParams.page = params.page;
  if (params.pageSize !== undefined) cleanParams.pageSize = params.pageSize!;
  if (params.q) cleanParams.q = params.q;
  if (params.categoryId !== undefined && params.categoryId !== '')
    cleanParams.categoryId = params.categoryId;
  if (params.minPrice !== undefined && params.minPrice !== '')
    cleanParams.minPrice = params.minPrice;
  if (params.maxPrice !== undefined && params.maxPrice !== '')
    cleanParams.maxPrice = params.maxPrice;
  if (params.sort) cleanParams.sort = params.sort;

  const res = await axiosInstance.get<ProductsResponse>('/api/products', { params: cleanParams });
  return res.data;
}

export async function fetchCategories(): Promise<CategoriesResponse> {
  const res = await axiosInstance.get<CategoriesResponse>('/api/categories');
  return res.data;
}

export interface ProductDetailResponse {
  success: boolean;
  data: { product: ProductDetail };
}

export async function fetchProductById(id: number): Promise<ProductDetail> {
  const res = await axiosInstance.get<ProductDetailResponse>(`/api/products/${id}`);
  return res.data.data.product;
}
