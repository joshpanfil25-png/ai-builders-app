'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface Profile {
  id: string
  username: string
  display_name: string
  bio: string | null
}

export default function SearchPage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Profile[]>([])
  const [loading, setLoading] = useState(false)

  const handleSearch = async (searchQuery: string) => {
    setQuery(searchQuery)
    
    if (!searchQuery.trim()) {
      setResults([])
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
        .limit(20)

      if (error) throw error
      setResults(data || [])
    } catch (error: any) {
      console.error('Search error:', error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <button
            onClick={() => router.push('/')}
            className="text-2xl font-bold text-blue-600 hover:text-blue-700"
          >
            ← AI Builders
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search users..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        </div>

        {loading && <div className="text-center py-8">Searching...</div>}

        {!loading && results.length === 0 && query && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">No users found</p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="bg-white rounded-lg shadow divide-y">
            {results.map((user) => (
              <button
                key={user.id}
                onClick={() => router.push(`/profile/${user.username}`)}
                className="w-full p-4 hover:bg-gray-50 flex items-center gap-4 text-left"
              >
                <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-lg flex-shrink-0">
                  {user.username[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">{user.display_name}</p>
                  <p className="text-sm text-gray-600 truncate">@{user.username}</p>
                  {user.bio && (
                    <p className="text-sm text-gray-500 truncate mt-1">{user.bio}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}