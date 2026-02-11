'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'

interface Profile {
  id: string
  username: string
  display_name: string
  bio: string | null
  avatar_url: string | null
}

interface Post {
  id: string
  content: string
  image_url: string | null
  created_at: string
  likes: { user_id: string }[]
  comments: { id: string }[]
}

export default function ProfilePage() {
  const params = useParams()
  const router = useRouter()
  const username = params.username as string

  const [profile, setProfile] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCurrentUser()
    fetchProfile()
  }, [username])

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUserId(user?.id || null)
  }

  const fetchProfile = async () => {
    try {
      // Get profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single()

      if (profileError) throw profileError
      setProfile(profileData)

      // Get posts
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          *,
          likes (user_id),
          comments (id)
        `)
        .eq('user_id', profileData.id)
        .order('created_at', { ascending: false })

      if (postsError) throw postsError
      setPosts(postsData || [])

      // Get follower count
      const { count: followers } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', profileData.id)

      setFollowerCount(followers || 0)

      // Get following count
      const { count: following } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', profileData.id)

      setFollowingCount(following || 0)

      // Check if current user follows this profile
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: followData } = await supabase
          .from('follows')
          .select('*')
          .eq('follower_id', user.id)
          .eq('following_id', profileData.id)
          .single()

        setIsFollowing(!!followData)
      }
    } catch (error: any) {
      console.error('Error fetching profile:', error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFollow = async () => {
    if (!currentUserId || !profile) return

    try {
      if (isFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUserId)
          .eq('following_id', profile.id)

        setIsFollowing(false)
        setFollowerCount(prev => prev - 1)
      } else {
        await supabase
          .from('follows')
          .insert([{ follower_id: currentUserId, following_id: profile.id }])

        setIsFollowing(true)
        setFollowerCount(prev => prev + 1)
      }
    } catch (error: any) {
      console.error('Error toggling follow:', error.message)
    }
  }

  const handleLike = async (postId: string) => {
    if (!currentUserId) return

    try {
      const post = posts.find(p => p.id === postId)
      const hasLiked = post?.likes.some(like => like.user_id === currentUserId)

      if (hasLiked) {
        await supabase
          .from('likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', currentUserId)
      } else {
        await supabase
          .from('likes')
          .insert([{ post_id: postId, user_id: currentUserId }])
      }

      fetchProfile()
    } catch (error: any) {
      console.error('Error toggling like:', error.message)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading profile...</div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Profile not found</div>
      </div>
    )
  }

  const isOwnProfile = currentUserId === profile.id

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
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

      {/* Profile Header */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-8 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center text-white text-4xl font-bold">
                {profile.username[0].toUpperCase()}
              </div>
              <div>
                <h1 className="text-3xl font-bold">{profile.display_name}</h1>
                <p className="text-gray-600">@{profile.username}</p>
                {profile.bio && (
                  <p className="text-gray-700 mt-2">{profile.bio}</p>
                )}
                <div className="flex gap-6 mt-4 text-sm">
                  <div>
                    <span className="font-bold">{followerCount}</span>{' '}
                    <span className="text-gray-600">Followers</span>
                  </div>
                  <div>
                    <span className="font-bold">{followingCount}</span>{' '}
                    <span className="text-gray-600">Following</span>
                  </div>
                  <div>
                    <span className="font-bold">{posts.length}</span>{' '}
                    <span className="text-gray-600">Posts</span>
                  </div>
                </div>
              </div>
            </div>

            {!isOwnProfile && currentUserId && (
              <button
                onClick={handleFollow}
                className={`px-6 py-2 rounded-full font-medium ${
                  isFollowing
                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </button>
            )}
          </div>
        </div>

        {/* Posts */}
        <div className="space-y-6">
          {posts.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500">No posts yet</p>
            </div>
          ) : (
            posts.map((post) => {
              const likeCount = post.likes.length
              const hasLiked = post.likes.some(like => like.user_id === currentUserId)
              const commentCount = post.comments.length

              return (
                <div key={post.id} className="bg-white rounded-lg shadow p-6">
                  <p className="text-gray-800 mb-4 whitespace-pre-wrap">{post.content}</p>

                  {post.image_url && (
                    <img
                      src={post.image_url}
                      alt="Post image"
                      className="w-full rounded-lg mb-4 max-h-96 object-cover"
                    />
                  )}

                  <div className="flex items-center gap-6 pt-4 border-t border-gray-100 text-sm text-gray-500">
                    <button
                      onClick={() => handleLike(post.id)}
                      className={`flex items-center gap-2 ${
                        hasLiked ? 'text-blue-600' : 'text-gray-600'
                      } hover:text-blue-600`}
                    >
                      <span className="text-xl">{hasLiked ? '❤️' : '🤍'}</span>
                      <span className="font-medium">{likeCount}</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <span className="text-xl">💬</span>
                      <span className="font-medium">{commentCount}</span>
                    </div>

                    <span>{new Date(post.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}