import {
  Eye,
  Layers,
  Palette,
  Pencil,
  Plus,
  Power,
  Search,
  Trash2,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  createAdminCategory,
  deleteAdminCategory,
  getAdminCategories,
  updateAdminCategory,
} from '../../api/categoriesApi'
import { useGlobalSearch } from '../../context/GlobalSearchContext.jsx'

const emptyCategoryForm = {
  name: '',
  color: '#c8793f',
  status: 'Active',
}

const statusStyles = {
  Active: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  Inactive: 'bg-slate-100 text-slate-600 ring-slate-200',
}

const inputClass =
  'h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#c8793f] focus:ring-2 focus:ring-[#fcd8b8]'

const categoriesPerPage = 8

const normalizeCategory = (category) => ({
  id: category.id,
  name: category.name || '-',
  color: category.color || '#c8793f',
  productsCount: Number(category.products_count || category.productsCount || 0),
  status: Number(category.is_active) === 1 ? 'Active' : 'Inactive',
})

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

const ModalShell = ({ title, children, onClose, size = 'max-w-2xl' }) => (
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

const CategoryPreview = ({ category }) => (
  <div className="flex items-center gap-2">
    <span
      className="h-6 w-6 rounded-full ring-1 ring-slate-200"
      style={{ backgroundColor: category.color }}
    />
    <span className="text-xs font-black uppercase text-slate-700">{category.color}</span>
    <span
      className="ml-2 rounded-full px-2 py-0.5 text-[10px] font-black text-white"
      style={{ backgroundColor: category.color }}
    >
      {category.name}
    </span>
  </div>
)

const Category = () => {
  const [categories, setCategories] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [currentPage, setCurrentPage] = useState(1)
  const [modalMode, setModalMode] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [formData, setFormData] = useState(emptyCategoryForm)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const { searchQuery } = useGlobalSearch()

  const loadCategories = async () => {
    try {
      setIsLoading(true)
      setError('')
      const response = await getAdminCategories()
      setCategories((response.data.categories || []).map(normalizeCategory))
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load categories.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const loadInitialCategories = async () => {
      try {
        setIsLoading(true)
        setError('')
        const response = await getAdminCategories()
        setCategories((response.data.categories || []).map(normalizeCategory))
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load categories.')
      } finally {
        setIsLoading(false)
      }
    }

    loadInitialCategories()
  }, [])

  const summaryCards = useMemo(() => {
    const activeCategories = categories.filter((category) => category.status === 'Active')
    const inactiveCategories = categories.filter((category) => category.status === 'Inactive')
    const totalProductsLinked = categories.reduce(
      (sum, category) => sum + category.productsCount,
      0,
    )

    return [
      {
        label: 'Total Categories',
        value: categories.length,
        icon: Layers,
        iconClass: 'bg-[#fff3e8] text-[#9a5a2e] ring-[#fcd8b8]',
      },
      {
        label: 'Active Categories',
        value: activeCategories.length,
        icon: Power,
        iconClass: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
      },
      {
        label: 'Inactive Categories',
        value: inactiveCategories.length,
        icon: Power,
        iconClass: 'bg-slate-100 text-slate-600 ring-slate-200',
      },
      {
        label: 'Total Products Linked',
        value: totalProductsLinked,
        icon: Palette,
        iconClass: 'bg-violet-50 text-violet-600 ring-violet-100',
      },
    ]
  }, [categories])

  const filteredCategories = useMemo(() => {
    const search = (searchTerm || searchQuery).trim().toLowerCase()

    return categories
      .filter((category) => category.name.toLowerCase().includes(search))
      .filter((category) => statusFilter === 'All' || category.status === statusFilter)
  }, [categories, searchQuery, searchTerm, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredCategories.length / categoriesPerPage))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const paginatedCategories = filteredCategories.slice(
    (safeCurrentPage - 1) * categoriesPerPage,
    safeCurrentPage * categoriesPerPage,
  )

  const goToPage = (page) => {
    setCurrentPage(Math.min(Math.max(page, 1), totalPages))
  }

  const openAddModal = () => {
    setSelectedCategory(null)
    setFormData(emptyCategoryForm)
    setModalMode('add')
  }

  const openEditModal = (category) => {
    setSelectedCategory(category)
    setFormData({
      name: category.name,
      color: category.color,
      status: category.status,
    })
    setModalMode('edit')
  }

  const openViewModal = (category) => {
    setSelectedCategory(category)
    setModalMode('view')
  }

  const openDeleteModal = (category) => {
    setSelectedCategory(category)
    setModalMode('delete')
  }

  const closeModal = () => {
    setModalMode(null)
    setSelectedCategory(null)
    setIsSaving(false)
  }

  const updateForm = (key, value) => {
    setFormData((current) => ({ ...current, [key]: value }))
  }

  const saveCategory = async (event) => {
    event.preventDefault()

    const payload = {
      name: formData.name.trim(),
      color: formData.color,
      is_active: formData.status === 'Active' ? 1 : 0,
    }

    try {
      setIsSaving(true)
      setError('')

      if (modalMode === 'edit' && selectedCategory) {
        await updateAdminCategory(selectedCategory.id, payload)
      } else {
        await createAdminCategory(payload)
      }

      await loadCategories()
      closeModal()
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to save category.')
      setIsSaving(false)
    }
  }

  const deleteCategory = async () => {
    if (!selectedCategory) return

    try {
      setIsSaving(true)
      setError('')
      await deleteAdminCategory(selectedCategory.id)
      await loadCategories()
      closeModal()
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to delete category.')
      setIsSaving(false)
    }
  }

  const toggleCategoryStatus = async (category) => {
    try {
      setError('')
      await updateAdminCategory(category.id, {
        name: category.name,
        color: category.color,
        is_active: category.status === 'Active' ? 0 : 1,
      })
      await loadCategories()
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update category status.')
    }
  }

  return (
    <div className="min-h-screen">
      {error ? (
        <div className="mb-3 rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <SummaryCard key={card.label} {...card} />
        ))}
      </div>

      <section className="mt-5 rounded-lg border border-slate-100 bg-white p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid flex-1 gap-3 md:grid-cols-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value)
                  setCurrentPage(1)
                }}
                placeholder="Search category"
                className={`${inputClass} pl-10`}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value)
                setCurrentPage(1)
              }}
              className={inputClass}
            >
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#c8793f] px-4 text-sm font-black text-white transition hover:bg-[#9a5a2e]"
          >
            <Plus className="h-4 w-4" />
            Add Category
          </button>
        </div>

        <div className="mt-4">
          {isLoading ? (
            <div className="rounded-lg border border-[#fcd8b8] bg-[#fff3e8] px-4 py-3 text-sm font-bold text-[#9a5a2e]">
              Loading categories...
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {paginatedCategories.map((category) => (
              <article key={category.id} className="rounded-sm bg-gray-50 p-3 ring-1 ring-slate-100">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-base font-black text-slate-900 truncate">{category.name}</h3>
                    <p className="mt-1 text-xs text-slate-600">{category.productsCount} products</p>
                    <div className="mt-2">
                      <CategoryPreview category={category} />
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-black ring-1 ${statusStyles[category.status]}`}>
                      {category.status}
                    </span>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => openViewModal(category)} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label="View category">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => openEditModal(category)} className="rounded-lg p-1 text-[#9a5a2e] hover:bg-[#fff3e8]" aria-label="Edit category">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => openDeleteModal(category)} className="rounded-lg p-1 text-rose-500 hover:bg-rose-50" aria-label="Delete category">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <button type="button" onClick={() => toggleCategoryStatus(category)} className="rounded-lg px-2 py-1 text-xs font-black text-slate-600 hover:bg-slate-100">
                      {category.status === 'Active' ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        {!isLoading && filteredCategories.length === 0 ? (
          <div className="mt-5 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
            <Layers className="mx-auto h-9 w-9 text-slate-400" />
            <h3 className="mt-3 text-base font-black text-slate-900">No categories found</h3>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              Try changing your search or filter.
            </p>
          </div>
        ) : null}

        {filteredCategories.length > 0 ? (
          <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-bold text-slate-500">
              Showing {(safeCurrentPage - 1) * categoriesPerPage + 1}-
              {Math.min(safeCurrentPage * categoriesPerPage, filteredCategories.length)} of {filteredCategories.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => goToPage(safeCurrentPage - 1)}
                disabled={safeCurrentPage === 1}
                className="h-9 rounded-lg border border-slate-200 px-3 text-sm font-black text-slate-600 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50"
              >
                Prev
              </button>
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => goToPage(page)}
                  className={`h-9 min-w-9 rounded-lg px-3 text-sm font-black ${
                    page === safeCurrentPage
                      ? 'bg-[#c8793f] text-white'
                      : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                type="button"
                onClick={() => goToPage(safeCurrentPage + 1)}
                disabled={safeCurrentPage === totalPages}
                className="h-9 rounded-lg border border-slate-200 px-3 text-sm font-black text-slate-600 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {(modalMode === 'add' || modalMode === 'edit') ? (
        <ModalShell title={modalMode === 'edit' ? 'Edit Category' : 'Add Category'} onClose={closeModal}>
          <form onSubmit={saveCategory} className="grid gap-4 md:grid-cols-2">
            <Field label="Category Name">
              <input required value={formData.name} onChange={(event) => updateForm('name', event.target.value)} className={inputClass} />
            </Field>
            <Field label="Color Picker">
              <div className="flex gap-3">
                <input
                  type="color"
                  value={formData.color}
                  onChange={(event) => updateForm('color', event.target.value)}
                  className="h-11 w-16 rounded-lg border border-slate-200 bg-white p-1"
                />
                <input
                  required
                  value={formData.color}
                  onChange={(event) => updateForm('color', event.target.value)}
                  className={inputClass}
                />
              </div>
            </Field>
            <Field label="Status">
              <select value={formData.status} onChange={(event) => updateForm('status', event.target.value)} className={inputClass}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </Field>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-black uppercase text-slate-500">Preview</p>
              <div className="mt-3">
                <CategoryPreview
                  category={{
                    name: formData.name || 'Category',
                    color: formData.color,
                  }}
                />
              </div>
            </div>
            <div className="flex flex-col gap-3 md:col-span-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={closeModal} className="h-11 rounded-lg border border-slate-200 px-5 text-sm font-black text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button disabled={isSaving} type="submit" className="h-11 rounded-lg bg-[#c8793f] px-5 text-sm font-black text-white hover:bg-[#9a5a2e] disabled:cursor-not-allowed disabled:opacity-60">
                {isSaving ? 'Saving...' : 'Save Category'}
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {modalMode === 'view' && selectedCategory ? (
        <ModalShell title="Category Details" onClose={closeModal} size="max-w-xl">
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-black uppercase text-slate-500">Color Preview</p>
              <div className="mt-3">
                <CategoryPreview category={selectedCategory} />
              </div>
            </div>
            {[
              ['Category Name', selectedCategory.name],
              ['Color', selectedCategory.color],
              ['Products Count', selectedCategory.productsCount],
              ['Status', selectedCategory.status],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-black uppercase text-slate-500">{label}</p>
                <p className="mt-1 text-sm font-black text-slate-900">{value}</p>
              </div>
            ))}
          </div>
        </ModalShell>
      ) : null}

      {modalMode === 'delete' && selectedCategory ? (
        <ModalShell title="Delete Category" onClose={closeModal} size="max-w-md">
          <p className="text-sm font-semibold leading-6 text-slate-600">
            Are you sure you want to delete <span className="font-black text-slate-950">{selectedCategory.name}</span>?
          </p>
          <div className="mt-5 flex justify-end gap-3">
            <button type="button" onClick={closeModal} className="h-11 rounded-lg border border-slate-200 px-5 text-sm font-black text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
            <button disabled={isSaving} type="button" onClick={deleteCategory} className="h-11 rounded-lg bg-rose-500 px-5 text-sm font-black text-white hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60">
              {isSaving ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </ModalShell>
      ) : null}
    </div>
  )
}

export default Category
