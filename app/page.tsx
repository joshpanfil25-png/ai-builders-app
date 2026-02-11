'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import PostFeed from './components/PostFeed'

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [feedFilter, setFeedFilter] = useState<'all' | 'following'>('all')
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/auth')
      return
    }
    
    setUser(user)
    
    const { data: profileData } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single()
    
    setProfile(profileData)
    setLoading(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex justify-between items-center">
          <h1 className="text-xl sm:text-2xl font-bold text-blue-600">AI Builders</h1>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => router.push('/messages')}
              className="px-2 sm:px-3 py-1.5 text-lg"
            >
              💬
            </button>
            <button
              onClick={() => router.push('/search')}
              className="px-2 sm:px-3 py-1.5 text-lg"
            >
              🔍
            </button>
            <button
              onClick={() => router.push(`/profile/${profile?.username}`)}
              className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold hover:bg-blue-700"
            >
              {profile?.username?.[0]?.toUpperCase() || 'U'}
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="bg-white rounded-lg shadow mb-4 sm:mb-6 p-1 flex gap-1">
          <button
            onClick={() => setFeedFilter('all')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              feedFilter === 'all'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            All Posts
          </button>
          <button
            onClick={() => setFeedFilter('following')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              feedFilter === 'following'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Following
          </button>
        </div>

        <PostFeed refresh={refreshKey} filter={feedFilter} />
      </div>

      <button
        onClick={() => router.push('/create')}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 flex items-center justify-center text-3xl z-50"
      >
        +
      </button>
    </div>
  )
}