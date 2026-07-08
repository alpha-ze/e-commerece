import { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { fetchCategories, type Product, type Category, type PaginationMeta } from '../../api/products';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProductFormData {
  name: string;
  description: string;
  category_id: string;
  price: string;
  discount_price: string;
  stock: string;
  status: 'active' | 'inactive';
  is_featured: boolean;
  image_urls: string[];
}

const EMPTY_FORM: ProductFormData = {
  name: '',
  description: '',
  category_id: '',
  price: '',
  discount_price: '',
  stock: '',
  status: 'active',
  is_featured: false,
  image_urls: [''],
};

// ── API helpers ───────────────────────────────────────────────────────────────

async function fetchAdminProducts(page: number, pageSize: number, sku?: string) {
  const params: Record<string, string | number> = { page, pageSize };
  if (sku && sku.trim()) params.sku = sku.trim().toUpperCase();
  const res = await axiosInstance.get<{
    success: boolean;
    data: Product[];
    pagination: PaginationMeta;
  }>('/api/products', { params });
  return { products: res.data.data, pagination: res.data.pagination };
}

async function createProduct(payload: Partial<ProductFormData> & { images?: Array<{ url: string; is_primary: boolean; sort_order: number }> }) {
  const body = {
    ...payload,
    category_id: payload.category_id ? Number(payload.category_id) : undefined,
    price: payload.price ? Number(payload.price) : undefined,
    discount_price: payload.discount_price ? Number(payload.discount_price) : undefined,
    stock: payload.stock ? Number(payload.stock) : undefined,
  };
  const res = await axiosInstance.post<{ success: boolean; data: { product: Product } }>(
    '/api/products',
    body,
  );
  return res.data.data.product;
}

async function updateProduct(id: number, payload: Partial<ProductFormData>) {
  const body = {
    ...payload,
    category_id: payload.category_id ? Number(payload.category_id) : undefined,
    price: payload.price ? Number(payload.price) : undefined,
    discount_price: payload.discount_price ? Number(payload.discount_price) : undefined,
    stock: payload.stock ? Number(payload.stock) : undefined,
  };
  const res = await axiosInstance.put<{ success: boolean; data: { product: Product } }>(
    `/api/products/${id}`,
    body,
  );
  return res.data.data.product;
}

async function deleteProduct(id: number) {
  await axiosInstance.delete(`/api/products/${id}`);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center py-24">
      <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );
}

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  );
}

interface ProductFormProps {
  form: ProductFormData;
  onChange: (f: ProductFormData) => void;
  categories: Category[];
  onSubmit: () => void;
  onCancel: () => void;
  saving: boolean;
  submitLabel: string;
  error: string;
}

function ProductForm({ form, onChange, categories, onSubmit, onCancel, saving, submitLabel, error }: ProductFormProps) {
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);

  function set(key: keyof ProductFormData, value: string | boolean | string[]) {
    onChange({ ...form, [key]: value });
  }

  function setImageUrl(index: number, value: string) {
    const updated = [...form.image_urls];
    updated[index] = value;
    onChange({ ...form, image_urls: updated });
  }

  function addImageUrl() {
    onChange({ ...form, image_urls: [...form.image_urls, ''] });
  }

  function removeImageUrl(index: number) {
    const updated = form.image_urls.filter((_, i) => i !== index);
    onChange({ ...form, image_urls: updated.length === 0 ? [''] : updated });
  }

  async function handleFileUpload(index: number, file: File) {
    setUploadingIdx(index);
    try {
      // Convert to base64 data URL for preview — works offline, no external service needed
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setImageUrl(index, dataUrl);
        setUploadingIdx(null);
      };
      reader.onerror = () => setUploadingIdx(null);
      reader.readAsDataURL(file);
    } catch {
      setUploadingIdx(null);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          rows={3}
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Price *</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.price}
            onChange={(e) => set('price', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Discount Price</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.discount_price}
            onChange={(e) => set('discount_price', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Stock *</label>
          <input
            type="number"
            min="0"
            value={form.stock}
            onChange={(e) => set('stock', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select
            value={form.category_id}
            onChange={(e) => set('category_id', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">No category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={form.status}
            onChange={(e) => set('status', e.target.value as 'active' | 'inactive')}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_featured}
              onChange={(e) => set('is_featured', e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-400"
            />
            Featured
          </label>
        </div>
      </div>

      {/* Product Images — file upload OR URL */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-gray-700">Product Images</label>
          <button
            type="button"
            onClick={addImageUrl}
            className="text-xs text-indigo-600 hover:text-indigo-500 font-medium"
          >
            + Add image
          </button>
        </div>
        <div className="space-y-3">
          {form.image_urls.map((url, index) => (
            <div key={index} className="space-y-1.5">
              <div className="flex gap-2 items-start">
                {/* Preview */}
                <div className="w-12 h-12 flex-shrink-0 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden">
                  {url ? (
                    <img src={url} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-1.5">
                  {/* File upload */}
                  <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-gray-300 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors text-xs text-gray-500 ${uploadingIdx === index ? 'opacity-50 pointer-events-none' : ''}`}>
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    {uploadingIdx === index ? 'Loading...' : 'Upload from device'}
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(index, file);
                        e.target.value = '';
                      }}
                    />
                  </label>
                  {/* URL input */}
                  <input
                    type="url"
                    placeholder={index === 0 ? 'Or paste image URL...' : `Or paste URL...`}
                    value={url.startsWith('data:') ? '' : url}
                    onChange={(e) => setImageUrl(index, e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>

                {form.image_urls.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeImageUrl(index)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors mt-0.5"
                    aria-label="Remove image"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              {index === 0 && (
                <p className="text-xs text-gray-400 pl-14">First image is the primary image shown in the catalog.</p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : submitLabel}
        </button>
      </div>
    </div>
  );
}
// ── Pagination ────────────────────────────────────────────────────────────────

function Pagination({
  pagination,
  onPage,
}: {
  pagination: PaginationMeta;
  onPage: (p: number) => void;
}) {
  const totalPages = Math.ceil(pagination.total / pagination.pageSize);
  if (totalPages <= 1) return null;
  return (
    <div className="flex justify-between items-center px-6 py-3 border-t border-gray-100 text-sm text-gray-500">
      <span>
        Page {pagination.page} of {totalPages} ({pagination.total} products)
      </span>
      <div className="flex gap-2">
        <button
          onClick={() => onPage(pagination.page - 1)}
          disabled={pagination.page <= 1}
          className="px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Prev
        </button>
        <button
          onClick={() => onPage(pagination.page + 1)}
          disabled={pagination.page >= totalPages}
          className="px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 15;

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({ page: 1, pageSize: PAGE_SIZE, total: 0 });
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [skuSearch, setSkuSearch] = useState('');

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  // Form state
  const [form, setForm] = useState<ProductFormData>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadProducts = useCallback(async (page: number, sku?: string) => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchAdminProducts(page, PAGE_SIZE, sku);
      setProducts(result.products);
      setPagination(result.pagination);
    } catch {
      setError('Failed to load products.');
    } finally {
      setLoading(false);
    }
  }, []);

  function handleSkuSearch() {
    loadProducts(1, skuSearch.trim() || undefined);
  }

  useEffect(() => {
    loadProducts(1);
    fetchCategories().then((r) => setCategories(r.data)).catch(() => {});
  }, [loadProducts]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setFormError('');
    setShowCreate(true);
  }

  function openEdit(p: Product) {
    setForm({
      name: p.name,
      description: p.description ?? '',
      category_id: p.category_id != null ? String(p.category_id) : '',
      price: p.price,
      discount_price: p.discount_price ?? '',
      stock: String(p.stock),
      status: p.status,
      is_featured: p.is_featured,
      image_urls: p.primary_image_url ? [p.primary_image_url] : [''],
    });
    setFormError('');
    setEditProduct(p);
  }

  async function handleCreate() {
    if (!form.name.trim() || !form.price || !form.stock) {
      setFormError('Name, price, and stock are required.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const validImages = form.image_urls
        .map((url) => url.trim())
        .filter((url) => url.length > 0);
      await createProduct({
        ...form,
        category_id: form.category_id || undefined,
        discount_price: form.discount_price || undefined,
        description: form.description || undefined,
        images: validImages.map((url, i) => ({ url, is_primary: i === 0, sort_order: i })),
      });
      setShowCreate(false);
      loadProducts(1);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message ?? 'Failed to create product.';
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit() {
    if (!editProduct) return;
    if (!form.name.trim() || !form.price || !form.stock) {
      setFormError('Name, price, and stock are required.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      await updateProduct(editProduct.id, {
        ...form,
        category_id: form.category_id || undefined,
        discount_price: form.discount_price || undefined,
        description: form.description || undefined,
      });
      setEditProduct(null);
      loadProducts(pagination.page);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message ?? 'Failed to update product.';
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await deleteProduct(deleteTarget.id);
      setDeleteTarget(null);
      loadProducts(pagination.page);
    } catch {
      setError('Failed to delete product.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Products</h1>
          <div className="flex items-center gap-3 flex-wrap">
            {/* SKU search */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search by SKU (e.g. KDA-00001)"
                value={skuSearch}
                onChange={(e) => setSkuSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSkuSearch(); }}
                className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-56"
              />
              <button
                onClick={handleSkuSearch}
                className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Search
              </button>
              {skuSearch && (
                <button
                  onClick={() => { setSkuSearch(''); loadProducts(1); }}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Product
            </button>
          </div>
        </div>

        {error && (
          <div role="alert" className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading && <LoadingSpinner />}

        {!loading && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200" aria-label="Products table">
                <thead className="bg-gray-50">
                  <tr>
                    {['Image', 'SKU', 'Name', 'Category', 'Price', 'Stock', 'Status', 'Featured', 'Actions'].map((h) => (
                      <th key={h} scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-sm text-gray-500">
                        No products found.
                      </td>
                    </tr>
                  ) : (
                    products.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                            {p.primary_image_url ? (
                              <img src={p.primary_image_url} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-500">{p.sku ?? '—'}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 max-w-[200px] truncate">{p.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{p.category_name ?? '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {p.discount_price ? (
                            <>
                              <span className="font-semibold">${parseFloat(p.discount_price).toFixed(2)}</span>
                              <span className="ml-1 text-xs text-gray-400 line-through">${parseFloat(p.price).toFixed(2)}</span>
                            </>
                          ) : (
                            <span className="font-semibold">${parseFloat(p.price).toFixed(2)}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{p.stock}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${p.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{p.is_featured ? '✓' : '—'}</td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex gap-2">
                            <button
                              onClick={() => openEdit(p)}
                              className="text-indigo-600 hover:text-indigo-500 font-medium transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setDeleteTarget(p)}
                              className="text-red-600 hover:text-red-500 font-medium transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Pagination pagination={pagination} onPage={loadProducts} />
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <Modal title="Add Product" onClose={() => setShowCreate(false)}>
          <ProductForm
            form={form}
            onChange={setForm}
            categories={categories}
            onSubmit={handleCreate}
            onCancel={() => setShowCreate(false)}
            saving={saving}
            submitLabel="Create"
            error={formError}
          />
        </Modal>
      )}

      {/* Edit modal */}
      {editProduct && (
        <Modal title="Edit Product" onClose={() => setEditProduct(null)}>
          <ProductForm
            form={form}
            onChange={setForm}
            categories={categories}
            onSubmit={handleEdit}
            onCancel={() => setEditProduct(null)}
            saving={saving}
            submitLabel="Save Changes"
            error={formError}
          />
        </Modal>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <Modal title="Delete Product" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-gray-700 mb-6">
            Are you sure you want to delete <span className="font-semibold">{deleteTarget.name}</span>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setDeleteTarget(null)}
              className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-red-600 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
