const CategoryTabs = ({ activeCategory, categories = [], onChange }) => (
  <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
    {categories.map((category) => (
      <button
        key={category}
        type="button"
        onClick={() => onChange(category)}
        className={`shrink-0 rounded-lg px-3 py-2 text-xs font-black sm:px-4 sm:text-sm ${
          activeCategory === category
            ? 'bg-[#c8793f] text-white shadow-lg shadow-[#c8793f]/20'
            : 'bg-slate-50 text-[#9a5a2e] ring-1 ring-slate-200 hover:bg-[#fff3e8]'
        }`}
      >
        {category}
      </button>
    ))}
  </div>
)

export default CategoryTabs
