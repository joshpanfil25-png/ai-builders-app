'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
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
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    fetchPosts()
    getCurrentUser()
  }, [refresh])

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUserId(user?.id || null)
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
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-500">No posts yet. Be the first to share!</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {posts.map((post) => {
        const likeCount = post.likes.length
        const hasLiked = post.likes.some(like => like.user_id === currentUserId)
        const commentCount = post.comments.length

        return (
          <div key={post.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                {post.profiles?.username?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="ml-3">
                <p className="font-semibold">{post.profiles?.display_name || 'Unknown User'}</p>
                <p className="text-sm text-gray-500">
                  {new Date(post.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            <p className="text-gray-800 mb-4 whitespace-pre-wrap">{post.content}</p>

            {post.image_url && (
              <img
                src={post.image_url}
                alt="Post image"
                className="w-full rounded-lg mb-4 max-h-96 object-cover"
              />
            )}

            <div className="flex items-center gap-6 pt-4 border-t border-gray-100">
              <button
                onClick={() => handleLike(post.id)}
                className={`flex items-center gap-2 ${
                  hasLiked ? 'text-blue-600' : 'text-gray-600'
                } hover:text-blue-600`}
              >
                <span className="text-xl">{hasLiked ? '❤️' : '🤍'}</span>
                <span className="text-sm font-medium">{likeCount}</span>
              </button>

              <button
                className="flex items-center gap-2 text-gray-600 hover:text-blue-600"
                onClick={() => {
                  const commentSection = document.getElementById(`comments-${post.id}`)
                  if (commentSection) {
                    commentSection.click()
                  }
                }}
              >
                <span className="text-xl">💬</span>
                <span className="text-sm font-medium">{commentCount}</span>
              </button>
            </div>

            <Comments postId={post.id} />
          </div>
        )
      })}
    </div>
  )
}