import { useState, useEffect } from 'react'
import api from '../services/api'
import { ENDPOINTS } from '../constants/api'

export function useCategories() {
  const [categories, setCategories] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.get(ENDPOINTS.CATEGORIES)
      .then(({ data }) => setCategories(data))
      .catch((e) => setError(e))
      .finally(() => setIsLoading(false))
  }, [])

  return { categories, isLoading, error }
}
