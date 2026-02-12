'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Comment {
  id: string
  content: string
  created_at: string
  user_id: string
  profiles: {
    username: string
    display_name: string
  }
}

export default function Comments({ postId, onCommentAdded }: { postId: string; onCommentAdded?: () => void }) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchComments()
    }
  }, [isOpen])

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          profiles:user_id (username, display_name)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true })

      if (error) throw error
      setComments(data || [])
    } catch (error: any) {
      console.error('Error fetching comments:', error.message)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        alert('You must be logged in to comment')
        return
      }

      const { error } = await supabase
        .from('comments')
        .insert([
          {
            post_id: postId,
            user_id: user.id,
            content: newComment.trim(),
          },
        ])

      if (error) throw error

      setNewComment('')
      fetchComments()
      
      if (onCommentAdded) {
        onCommentAdded()
      }
    } catch (error: any) {
      alert('Error posting comment: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-4">
      <button
        id={`comments-${postId}`}
        onClick={() => setIsOpen(!isOpen)}
        className="text-sm text-gray-600 hover:text-blue-600 font-medium"
      >
        {isOpen ? 'Hide comments' : 'View comments'}
      </button>

      {isOpen && (
        <div className="mt-4 space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                {comment.profiles?.username?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="bg-gray-100 rounded-lg p-3">
                  <p className="font-semibold text-sm">{comment.profiles?.display_name || 'Unknown User'}</p>
                  <p className="text-sm text-gray-800 break-words">{comment.content}</p>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(comment.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}

          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <button
              type="submit"
              disabled={loading || !newComment.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
            >
              Post
            </button>
          </form>
        </div>
      )}
    </div>
  )
}