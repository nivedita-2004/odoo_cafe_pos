import {
  Eye,
  Package,
  Pencil,
  Plus,
  Power,
  Search,
  TrendingUp,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  createAdminProduct,
  getAdminCategories,
  getAdminProducts,
  updateAdminProduct,
} from '../../api/productsApi'
import { useGlobalSearch } from '../../context/GlobalSearchContext.jsx'
import { formatCurrency } from '../../utils/formatCurrency'

const fallbackProductImage =
  'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=400&q=80'

const getAssetUrl = (path) => {
  if (!path) return fallbackProductImage
  if (/^https?:\/\//i.test(path)) return path

  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
  const origin = apiBase.replace(/\/api\/?$/, '')
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`
}

const emptyProductForm = {
  name: '',
  imageFile: null,
  imagePreview: '',
  existingImageUrl: '',
  category: '',
  newCategory: '',
  price: '',
  unit: 'Piece',
  tax: '5%',
  description: '',
  status: 'Active',
}

const statusStyles = {
  Active: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  Inactive: 'bg-slate-100 text-slate-600 ring-slate-200',
}

const inputClass =
  'h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#c8793f] focus:ring-2 focus:ring-[#fcd8b8]'

const taxToNumber = (tax) => Number(String(tax).replace('%', '')) || 0

const normalizeCategory = (category) => ({
  id: category.id,
  name: category.name,
  color: category.color || '#c8793f',
})

const normalizeProduct = (product) => ({
  id: product.id,
  name: product.name || '-',
  categoryId: product.category_id,
  category: product.category_name || '-',
  price: Number(product.price || 0),
  unit: product.unit || 'Piece',
  tax: `${Number(product.tax_percentage || 0)}%`,
  description: product.description || '',
  status: Number(product.is_active) === 1 ? 'Active' : 'Inactive',
  sold: Number(product.sold || 0),
  revenue: Number(product.revenue || 0),
  imageUrl: getAssetUrl(product.image_url || product.imageUrl),
  rawImageUrl: product.image_url || product.imageUrl || '',
})

const fetchProductsData = async () => {
  const [productsResponse, categoriesResponse] = await Promise.all([
    getAdminProducts(),
    getAdminCategories(),
  ])

  return {
    categories: (categoriesResponse.data.categories || []).map(normalizeCategory),
    products: (productsResponse.data.products || []).map(normalizeProduct),
  }
}

const SummaryCard = ({ label, value, icon: Icon, iconClass }) => (
  <article className="rounded-lg border border-slate-200 bg-white p-3">
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-bold text-slate-500">{label}</p>
        <p className="mt-2 text-xl font-black text-slate-950">{value}</p>
      </div>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ring-1 ${iconClass}`}>
        <Icon className="h-5 w-5" />
      </span>
    </div>
  </article>
)

const Field = ({ label, children }) => (
  <label className="block">
    <span className="text-xs font-black uppercase text-slate-500">{label}</span>
    <div className="mt-2">{children}</div>
  </label>
)

const ModalShell = ({ title, children, onClose, size = 'max-w-3xl' }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
    <div className={`max-h-[92vh] w-full overflow-hidden rounded-lg bg-white shadow-2xl ${size}`}>
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <h2 className="text-lg font-black text-slate-950">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-3 py-2 text-sm font-black text-slate-500 hover:bg-slate-100 hover:text-slate-900"
        >
          Close
        </button>
      </div>
      <div className="max-h-[calc(92vh-64px)] overflow-auto p-5">{children}</div>
    </div>
  </div>
)

const Products = () => {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [priceSort, setPriceSort] = useState('none')
  const [modalMode, setModalMode] = useState(null)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [formData, setFormData] = useState(emptyProductForm)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const { searchQuery } = useGlobalSearch()

  const loadProducts = async () => {
    try {
      setIsLoading(true)
      setError('')
      const nextData = await fetchProductsData()
      setCategories(nextData.categories)
      setProducts(nextData.products)
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load products.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const loadInitialProducts = async () => {
      try {
        setIsLoading(true)
        setError('')
        const nextData = await fetchProductsData()
        setCategories(nextData.categories)
        setProducts(nextData.products)
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load products.')
      } finally {
        setIsLoading(false)
      }
    }

    loadInitialProducts()
  }, [])

  const summaryCards = useMemo(() => {
    const activeProducts = products.filter((product) => product.status === 'Active')
    const inactiveProducts = products.filter((product) => product.status === 'Inactive')
    const highestSellingProduct = products.reduce(
      (top, product) => (product.sold > top.sold ? product : top),
      products[0] || { name: '-', sold: 0 },
    )

    return [
      {
        label: 'Total Products',
        value: products.length,
        icon: Package,
        iconClass: 'bg-[#fff3e8] text-[#9a5a2e] ring-[#fcd8b8]',
      },
      {
        label: 'Active Products',
        value: activeProducts.length,
        icon: Power,
        iconClass: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
      },
      {
        label: 'Inactive Products',
        value: inactiveProducts.length,
        icon: Power,
        iconClass: 'bg-slate-100 text-slate-600 ring-slate-200',
      },
      {
        label: 'Highest Selling Product',
        value: highestSellingProduct.name,
        icon: TrendingUp,
        iconClass: 'bg-rose-50 text-rose-600 ring-rose-100',
      },
    ]
  }, [products])

  const filteredProducts = useMemo(() => {
    const search = (searchTerm || searchQuery).trim().toLowerCase()

    return [...products]
      .filter((product) => product.name.toLowerCase().includes(search))
      .filter((product) => categoryFilter === 'All' || product.category === categoryFilter)
      .filter((product) => statusFilter === 'All' || product.status === statusFilter)
      .sort((first, second) => {
        if (priceSort === 'low-high') return first.price - second.price
        if (priceSort === 'high-low') return second.price - first.price
        return second.id - first.id
      })
  }, [categoryFilter, priceSort, products, searchQuery, searchTerm, statusFilter])

  const openAddModal = () => {
    setSelectedProduct(null)
    setFormData({
      ...emptyProductForm,
      category: categories[0] ? String(categories[0].id) : '',
    })
    setModalMode('add')
  }

  const openEditModal = (product) => {
    setSelectedProduct(product)
    setFormData({
      name: product.name,
      imageFile: null,
      imagePreview: product.imageUrl,
      existingImageUrl: product.rawImageUrl,
      category: product.categoryId ? String(product.categoryId) : '',
      newCategory: '',
      price: String(product.price),
      unit: product.unit,
      tax: product.tax,
      description: product.description,
      status: product.status,
    })
    setModalMode('edit')
  }

  const openViewModal = (product) => {
    setSelectedProduct(product)
    setModalMode('view')
  }

  const closeModal = () => {
    setModalMode(null)
    setSelectedProduct(null)
    setIsSaving(false)
  }

  const updateForm = (key, value) => {
    setFormData((current) => ({ ...current, [key]: value }))
  }

  const updateImageFile = (file) => {
    setFormData((current) => ({
      ...current,
      imageFile: file,
      imagePreview: file ? URL.createObjectURL(file) : getAssetUrl(current.existingImageUrl),
    }))
  }

  const buildProductPayload = (data) => {
    const payload = new FormData()
    payload.append('name', data.name.trim())
    payload.append('description', data.description.trim())
    payload.append('price', Number(data.price) || 0)
    payload.append('unit', data.unit.trim() || 'Piece')
    payload.append('tax_percentage', taxToNumber(data.tax))
    payload.append('is_active', data.status === 'Active' ? 1 : 0)

    if (data.imageFile) payload.append('image', data.imageFile)
    if (data.existingImageUrl) payload.append('image_url', data.existingImageUrl)

    if (data.category === 'new') {
      payload.append('category_name', data.newCategory.trim())
      payload.append('category_color', '#c8793f')
    } else {
      payload.append('category_id', Number(data.category))
    }

    return payload
  }

  const saveProduct = async (event) => {
    event.preventDefault()

    if (formData.category === 'new' && !formData.newCategory.trim()) return

    try {
      setIsSaving(true)
      const payload = buildProductPayload(formData)

      if (modalMode === 'edit' && selectedProduct) {
        await updateAdminProduct(selectedProduct.id, payload)
      } else {
        await createAdminProduct(payload)
      }

      await loadProducts()
      closeModal()
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to save product.')
      setIsSaving(false)
    }
  }

  const toggleProductStatus = async (product) => {
    try {
      setError('')
      await updateAdminProduct(product.id, {
        name: product.name,
        description: product.description,
        price: product.price,
        unit: product.unit,
        tax_percentage: taxToNumber(product.tax),
        is_active: product.status === 'Active' ? 0 : 1,
        category_id: product.categoryId,
        image_url: product.rawImageUrl,
      })
      await loadProducts()
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update product status.')
    }
  }

  return (
    <div className="min-h-screen">
      {error ? (
        <div className="mb-3 rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <SummaryCard key={card.label} {...card} />
        ))}
      </div>

      <section className="mt-5 rounded-lg border border-slate-100 bg-white p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid flex-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search product"
                className={`${inputClass} pl-10`}
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className={inputClass}
            >
              <option value="All">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className={inputClass}
            >
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>

            <select
              value={priceSort}
              onChange={(event) => setPriceSort(event.target.value)}
              className={inputClass}
            >
              <option value="none">Sort by Price</option>
              <option value="low-high">Low to High</option>
              <option value="high-low">High to Low</option>
            </select>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#c8793f] px-4 text-sm font-black text-white"
          >
            <Plus className="h-4 w-4" />
            Add Product
          </button>
        </div>

        {isLoading ? (
          <div className="mt-5 rounded-lg border border-[#fcd8b8] bg-[#fff3e8] px-4 py-3 text-sm font-bold text-[#9a5a2e]">
            Loading products...
          </div>
        ) : null}

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-[980px] w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-black uppercase text-slate-500">
                <th className="py-3 pr-4">Product Name</th>
                <th className="py-3 pr-4">Category</th>
                <th className="py-3 pr-4">Price</th>
                <th className="py-3 pr-4">Unit of Measure</th>
                <th className="py-3 pr-4">Tax</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="text-sm">
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-12 w-12 rounded-lg object-cover ring-1 ring-slate-200"
                      />
                      <span className="font-black text-slate-900">{product.name}</span>
                    </div>
                  </td>
                  <td className="py-2 pr-4 font-bold text-slate-500">{product.category}</td>
                  <td className="py-2 pr-4 font-black text-slate-900">{formatCurrency(product.price)}</td>
                  <td className="py-2 pr-4 font-bold text-slate-600">{product.unit}</td>
                  <td className="py-2 pr-4 font-bold text-slate-600">{product.tax}</td>
                  <td className="py-2 pr-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${statusStyles[product.status]}`}>
                      {product.status}
                    </span>
                  </td>
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => openViewModal(product)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label="View product">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => openEditModal(product)} className="rounded-lg p-2 text-[#9a5a2e] hover:bg-[#fff3e8]" aria-label="Edit product">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => toggleProductStatus(product)} className="rounded-lg px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-100">
                        {product.status === 'Active' ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!isLoading && filteredProducts.length === 0 ? (
          <div className="mt-5 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
            <Package className="mx-auto h-9 w-9 text-slate-400" />
            <h3 className="mt-3 text-base font-black text-slate-900">No products found</h3>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              Try changing your search or filters.
            </p>
          </div>
        ) : null}
      </section>

      {(modalMode === 'add' || modalMode === 'edit') ? (
        <ModalShell title={modalMode === 'edit' ? 'Edit Product' : 'Add Product'} onClose={closeModal}>
          <form onSubmit={saveProduct} className="grid gap-4 md:grid-cols-2">
            <Field label="Product Name">
              <input required value={formData.name} onChange={(event) => updateForm('name', event.target.value)} className={inputClass} />
            </Field>
            <div className="md:col-span-2">
              <Field label="Product Image">
                <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center">
                  <img
                    src={formData.imagePreview || fallbackProductImage}
                    alt={formData.name || 'Product preview'}
                    className="h-24 w-24 rounded-lg object-cover ring-1 ring-slate-200"
                  />
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      onChange={(event) => updateImageFile(event.target.files?.[0] || null)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-[#fff3e8] file:px-3 file:py-2 file:text-sm file:font-black file:text-[#9a5a2e] hover:file:bg-[#fcd8b8]"
                    />
                    <p className="mt-2 text-xs font-bold text-slate-500">
                      Upload PNG, JPG, JPEG, or WebP image.
                    </p>
                  </div>
                </div>
              </Field>
            </div>
            <Field label="Category">
              <select required value={formData.category} onChange={(event) => updateForm('category', event.target.value)} className={inputClass}>
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
                <option value="new">Create new category</option>
              </select>
            </Field>
            {formData.category === 'new' ? (
              <Field label="New Category">
                <input required value={formData.newCategory} onChange={(event) => updateForm('newCategory', event.target.value)} className={inputClass} />
              </Field>
            ) : null}
            <Field label="Price">
              <input required type="number" min="0" value={formData.price} onChange={(event) => updateForm('price', event.target.value)} className={inputClass} />
            </Field>
            <Field label="Unit of Measure">
              <input required value={formData.unit} onChange={(event) => updateForm('unit', event.target.value)} className={inputClass} />
            </Field>
            <Field label="Tax">
              <select value={formData.tax} onChange={(event) => updateForm('tax', event.target.value)} className={inputClass}>
                <option value="0%">0%</option>
                <option value="5%">5%</option>
                <option value="12%">12%</option>
                <option value="18%">18%</option>
              </select>
            </Field>
            <Field label="Status">
              <select value={formData.status} onChange={(event) => updateForm('status', event.target.value)} className={inputClass}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </Field>
            <div className="md:col-span-2">
              <Field label="Description">
                <textarea value={formData.description} onChange={(event) => updateForm('description', event.target.value)} className={`${inputClass} min-h-24 py-3`} />
              </Field>
            </div>
            <div className="flex flex-col gap-3 md:col-span-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={closeModal} className="h-11 rounded-lg border border-slate-200 px-5 text-sm font-black text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button disabled={isSaving} type="submit" className="h-11 rounded-lg bg-[#c8793f] px-5 text-sm font-black text-white hover:bg-[#9a5a2e] disabled:cursor-not-allowed disabled:opacity-60">
                {isSaving ? 'Saving...' : 'Save Product'}
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {modalMode === 'view' && selectedProduct ? (
        <ModalShell title="Product Details" onClose={closeModal} size="max-w-xl">
          <div className="space-y-4">
            <img
              src={selectedProduct.imageUrl}
              alt={selectedProduct.name}
              className="h-52 w-full rounded-lg object-cover ring-1 ring-slate-200"
            />
            {[
              ['Product Name', selectedProduct.name],
              ['Category', selectedProduct.category],
              ['Price', formatCurrency(selectedProduct.price)],
              ['Unit of Measure', selectedProduct.unit],
              ['Tax', selectedProduct.tax],
              ['Status', selectedProduct.status],
              ['Quantity Sold', selectedProduct.sold],
              ['Description', selectedProduct.description || '-'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-black uppercase text-slate-500">{label}</p>
                <p className="mt-1 text-sm font-black text-slate-900">{value}</p>
              </div>
            ))}
          </div>
        </ModalShell>
      ) : null}

    </div>
  )
}

export default Products
