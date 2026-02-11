'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'

interface Message {
  id: string
  sender_id: string
  content: string
  created_at: string
}

export default function ChatPage() {
  const params = useParams()
  const router = useRouter()
  const username = params.username as string
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [recipientId, setRecipientId] = useState<string | null>(null)
  const [recipientName, setRecipientName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCurrentUser()
  }, [])

  useEffect(() => {
    if (currentUserId && recipientId) {
      fetchMessages()
      const subscription = supabase
        .channel('messages')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        }, () => {
          fetchMessages()
        })
        .subscribe()

      return () => {
        subscription.unsubscribe()
      }
    }
  }, [currentUserId, recipientId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth')
      return
    }
    setCurrentUserId(user.id)
    fetchRecipient(user.id)
  }

  const fetchRecipient = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single()

      if (error) throw error
      setRecipientId(data.id)
      setRecipientName(data.display_name)
      setLoading(false)
    } catch (error: any) {
      console.error('Error:', error.message)
    }
  }

  const fetchMessages = async () => {
    if (!currentUserId || !recipientId) return

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUserId},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${currentUserId})`)
        .order('created_at', { ascending: true })

      if (error) throw error
      setMessages(data || [])
    } catch (error: any) {
      console.error('Error:', error.message)
    }
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !currentUserId || !recipientId) return

    try {
      const { error } = await supabase
        .from('messages')
        .insert([{
          sender_id: currentUserId,
          recipient_id: recipientId,
          content: newMessage.trim()
        }])

      if (error) throw error
      setNewMessage('')
      fetchMessages()
    } catch (error: any) {
      alert('Error: ' + error.message)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => router.push('/messages')} className="text-blue-600">←</button>
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
            {username[0].toUpperCase()}
          </div>
          <h1 className="font-bold">{recipientName}</h1>
        </div>
      </nav>

      <div className="flex-1 overflow-y-auto p-4 max-w-4xl w-full mx-auto">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`mb-4 flex ${msg.sender_id === currentUserId ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs px-4 py-2 rounded-lg ${
                msg.sender_id === currentUserId
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-800'
              }`}
            >
              <p className="break-words">{msg.content}</p>
              <p className={`text-xs mt-1 ${msg.sender_id === currentUserId ? 'text-blue-100' : 'text-gray-500'}`}>
                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="bg-white border-t border-gray-200 p-4">
        <div className="max-w-4xl mx-auto flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  )
}