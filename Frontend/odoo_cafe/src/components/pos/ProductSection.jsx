import { Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { getCustomerMenu } from '../../api/employeePosApi'
import { useGlobalSearch } from '../../context/GlobalSearchContext.jsx'
import { usePOS } from '../../context/POSContext.jsx'
import CategoryTabs from './CategoryTabs'
import ProductCard from './ProductCard'

const apiRoot = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '')

const resolveImageUrl = (imageUrl = '') => {
  if (!imageUrl) return ''
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl
  return `${apiRoot}${imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`}`
}

const ProductSection = () => {
  const { addToCart } = usePOS()
  const { searchQuery } = useGlobalSearch()
  const [activeCategory, setActiveCategory] = useState('All')
  const [search, setSearch] = useState('')
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setError('')
        const response = await getCustomerMenu()
        const menu = response.data.menu || []
        setProducts(
          menu.flatMap((category) =>
            (category.items || []).map((item) => ({
              id: item.id,
              name: item.name,
              category: category.category_name,
              price: Number(item.price || 0),
              tax: Number(item.tax_percentage || 0),
              color: category.category_color || '#c8793f',
              image: resolveImageUrl(item.image_url),
            })),
          ),
        )
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load products.')
      } finally {
        setIsLoading(false)
      }
    }

    loadProducts()
  }, [])

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(products.map((product) => product.category)))],
    [products],
  )

  const filteredProducts = useMemo(() => {
    const effectiveSearch = (search || searchQuery).toLowerCase()

    return products.filter((product) => {
      const matchesCategory = activeCategory === 'All' || product.category === activeCategory
      const matchesSearch = `${product.name} ${product.category}`.toLowerCase().includes(effectiveSearch)
      return matchesCategory && matchesSearch
    })
  }, [activeCategory, products, search, searchQuery])

  return (
    <section className="min-h-0 rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="mb-3 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#9a5a2e]/65">
            Product Menu
          </p>
          <h2 className="text-xl font-black text-slate-950 sm:text-2xl">Quick Order</h2>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a5a2e]/60" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search products"
            className="min-h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-semibold text-slate-800 outline-none focus:border-[#c8793f] focus:bg-white xl:w-64"
          />
        </div>
      </div>
      <CategoryTabs activeCategory={activeCategory} categories={categories} onChange={setActiveCategory} />
      {error ? (
        <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-black text-red-700">
          {error}
        </div>
      ) : null}
      {isLoading ? (
        <div className="mt-3 rounded-lg bg-[#fff3e8] px-3 py-2 text-sm font-black text-[#9a5a2e]">
          Loading products...
        </div>
      ) : null}
      <div className="mt-3 grid gap-3 no-scrollbar overflow-visible sm:grid-cols-2 lg:max-h-[calc(100vh-235px)] lg:overflow-auto lg:pr-1 xl:grid-cols-3 2xl:grid-cols-4">
        {filteredProducts.map((product) => (
          <ProductCard key={product.id} product={product} onAdd={addToCart} />
        ))}
      </div>
    </section>
  )
}

export default ProductSection
