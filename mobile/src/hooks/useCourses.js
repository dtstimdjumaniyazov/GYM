import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import { ENDPOINTS } from '../constants/api'

export function useCourses({ category = '', search = '' } = {}) {
  const [courses, setCourses] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const fetchCourses = useCallback(async (pageNum = 1, refresh = false) => {
    if (refresh) setIsRefreshing(true)
    else setIsLoading(pageNum === 1)

    try {
      const params = new URLSearchParams({ page: pageNum })
      if (category) params.append('category', category)
      if (search) params.append('search', search)

      const { data } = await api.get(`${ENDPOINTS.COURSES}?${params}`)
      const results = data.results ?? data

      if (pageNum === 1) {
        setCourses(results)
      } else {
        setCourses((prev) => [...prev, ...results])
      }

      setHasMore(!!data.next)
      setPage(pageNum)
    } catch (e) {
      setError(e)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [category, search])

  useEffect(() => {
    fetchCourses(1)
  }, [fetchCourses])

  const loadMore = () => {
    if (hasMore && !isLoading) fetchCourses(page + 1)
  }

  const refresh = () => fetchCourses(1, true)

  return { courses, isLoading, isRefreshing, error, hasMore, loadMore, refresh }
}
