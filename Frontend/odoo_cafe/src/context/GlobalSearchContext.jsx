import { createContext, useContext, useMemo, useState } from 'react'

const GlobalSearchContext = createContext(null)

export const GlobalSearchProvider = ({ children }) => {
  const [searchQuery, setSearchQuery] = useState('')

  const value = useMemo(
    () => ({
      searchQuery,
      setSearchQuery,
      clearSearch: () => setSearchQuery(''),
    }),
    [searchQuery],
  )

  return <GlobalSearchContext.Provider value={value}>{children}</GlobalSearchContext.Provider>
}

export const useGlobalSearch = () => {
  const context = useContext(GlobalSearchContext)
  if (!context) {
    return {
      searchQuery: '',
      setSearchQuery: () => {},
      clearSearch: () => {},
    }
  }
  return context
}
