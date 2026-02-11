'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface Conversation {
  user_id: string
  username: string
  display_name: string
  last_message: string
  last_message_time: string
  unread_count: number
}

export default function MessagesPage() {
  const router = useRouter()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    getCurrentUser()
  }, [])

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth')
      return
    }
    setCurrentUserId(user.id)
    fetchConversations(user.id)
  }

  const fetchConversations = async (userId: string) => {
    try {
      const { data: messages, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:sender_id(username, display_name),
          recipient:recipient_id(username, display_name)
        `)
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order('created_at', { ascending: false })

      if (error) throw error

      const convMap = new Map<string, Conversation>()

      messages?.forEach((msg: any) => {
        const otherUser = msg.sender_id === userId ? msg.recipient : msg.sender
        const otherUserId = msg.sender_id === userId ? msg.recipient_id : msg.sender_id

        if (!convMap.has(otherUserId)) {
          convMap.set(otherUserId, {
            user_id: otherUserId,
            username: otherUser.username,
            display_name: otherUser.display_name,
            last_message: msg.content,
            last_message_time: msg.created_at,
            unread_count: 0
          })
        }
      })

      setConversations(Array.from(convMap.values()))
    } catch (error: any) {
      console.error('Error:', error.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <button
            onClick={() => router.push('/')}
            className="text-2xl font-bold text-blue-600 hover:text-blue-700"
          >
            ← Messages
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {conversations.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">No messages yet</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow divide-y">
            {conversations.map((conv) => (
              <button
                key={conv.user_id}
                onClick={() => router.push(`/messages/${conv.username}`)}
                className="w-full p-4 hover:bg-gray-50 flex items-center gap-4 text-left"
              >
                <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                  {conv.username[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{conv.display_name}</p>
                  <p className="text-sm text-gray-600 truncate">{conv.last_message}</p>
                </div>
                <p className="text-xs text-gray-500">
                  {new Date(conv.last_message_time).toLocaleDateString()}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}