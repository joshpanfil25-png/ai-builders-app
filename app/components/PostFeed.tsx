'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Comments from './Comments'

interface Post {
  id: string
  content: string
  image_url: string | null
  created_at: string
  user_id: string
  profiles: {
    username: string
    display_name: string
  }
  likes: { user_id: string }[]
  comments: { id: string }[]
}

export default function PostFeed({ refresh }: { refresh: number }) {
  const router = useRouter()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchPosts()
    getCurrentUser()
  }, [refresh])

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUserId(user?.id || null)
    
    if (user) {
      fetchFollowing(user.id)
    }
  }

  const fetchFollowing = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId)

      if (error) throw error
      
      const ids = new Set(data?.map(f => f.following_id) || [])
      setFollowingIds(ids)
    } catch (error: any) {
      console.error('Error fetching following:', error.message)
    }
  }

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (username, display_name),
          likes (user_id),
          comments (id)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setPosts(data || [])
    } catch (error: any) {
      console.error('Error fetching posts:', error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFollow = async (userId: string) => {
    if (!currentUserId || currentUserId === userId) return

    try {
      const isFollowing = followingIds.has(userId)

      if (isFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUserId)
          .eq('following_id', userId)

        setFollowingIds(prev => {
          const newSet = new Set(prev)
          newSet.delete(userId)
          return newSet
        })
      } else {
        await supabase
          .from('follows')
          .insert([{ follower_id: currentUserId, following_id: userId }])

        setFollowingIds(prev => new Set(prev).add(userId))
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

      fetchPosts()
    } catch (error: any) {
      console.error('Error toggling like:', error.message)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading posts...</div>
  }

  if (posts.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 sm:p-8 text-center">
        <p className="text-gray-500">No posts yet. Be the first to share!</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {posts.map((post) => {
        const likeCount = post.likes.length
        const hasLiked = post.likes.some(like => like.user_id === currentUserId)
        const commentCount = post.comments.length
        const isOwnPost = post.user_id === currentUserId
        const isFollowing = followingIds.has(post.user_id)

        return (
          <div key={post.id} className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="flex items-center min-w-0 flex-1">
                <button
                  onClick={() => router.push(`/profile/${post.profiles?.username}`)}
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold hover:bg-blue-700 flex-shrink-0"
                >
                  {post.profiles?.username?.[0]?.toUpperCase() || 'U'}
                </button>
                <div className="ml-2 sm:ml-3 min-w-0 flex-1">
                  <button
                    onClick={() => router.push(`/profile/${post.profiles?.username}`)}
                    className="font-semibold hover:underline text-sm sm:text-base truncate block"
                  >
                    {post.profiles?.display_name || 'Unknown User'}
                  </button>
                  <p className="text-xs sm:text-sm text-gray-500">
                    {new Date(post.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {!isOwnPost && (
                <button
                  onClick={() => handleFollow(post.user_id)}
                  className={`px-3 sm:px-4 py-1 rounded-full text-xs sm:text-sm font-medium flex-shrink-0 ml-2 ${
                    isFollowing
                      ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
              )}
            </div>

            <p className="text-sm sm:text-base text-gray-800 mb-3 sm:mb-4 whitespace-pre-wrap break-words">
              {post.content}
            </p>

            {post.image_url && (
              <img
                src={post.image_url}
                alt="Post image"
                className="w-full rounded-lg mb-3 sm:mb-4 max-h-96 object-cover"
              />
            )}

            <div className="flex items-center gap-4 sm:gap-6 pt-3 sm:pt-4 border-t border-gray-100">
              <button
                onClick={() => handleLike(post.id)}
                className={`flex items-center gap-1.5 sm:gap-2 ${
                  hasLiked ? 'text-blue-600' : 'text-gray-600'
                } hover:text-blue-600`}
              >
                <span className="text-lg sm:text-xl">{hasLiked ? '❤️' : '🤍'}</span>
                <span className="text-xs sm:text-sm font-medium">{likeCount}</span>
              </button>

              <button
                className="flex items-center gap-1.5 sm:gap-2 text-gray-600 hover:text-blue-600"
                onClick={() => {
                  const commentSection = document.getElementById(`comments-${post.id}`)
                  if (commentSection) {
                    commentSection.click()
                  }
                }}
              >
                <span className="text-lg sm:text-xl">💬</span>
                <span className="text-xs sm:text-sm font-medium">{commentCount}</span>
              </button>
            </div>

            <Comments postId={post.id} />
          </div>
        )
      })}
    </div>
  )
}