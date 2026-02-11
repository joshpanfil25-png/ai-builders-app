'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import ImageUpload from './ImageUpload'

export default function CreatePost({ onPostCreated }: { onPostCreated: () => void }) {
  const [content, setContent] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        alert('You must be logged in to post')
        return
      }

      const { error } = await supabase
        .from('posts')
        .insert([
          {
            user_id: user.id,
            content: content.trim(),
            image_url: imageUrl || null,
          },
        ])

      if (error) throw error

      setContent('')
      setImageUrl('')
      onPostCreated()
    } catch (error: any) {
      alert('Error creating post: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-4 sm:mb-6">
      <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Share your AI progress</h2>
      <form onSubmit={handleSubmit}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What are you building with AI today?"
          className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm sm:text-base"
          rows={4}
        />
        
        <ImageUpload onImageUploaded={setImageUrl} />

        <button
          type="submit"
          disabled={loading || !content.trim()}
          className="mt-3 sm:mt-4 px-5 sm:px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base w-full sm:w-auto"
        >
          {loading ? 'Posting...' : 'Post'}
        </button>
      </form>
    </div>
  )
}