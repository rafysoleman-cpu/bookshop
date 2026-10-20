import React, { createContext, useContext, useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { useQueryClient } from 'react-query'
import { useAuthStore } from '../store/authStore'
import { envConfig } from '../config/env.js'
import { invalidateCatalog } from '../utils/queryKeys'

const SocketContext = createContext()

export const useSocket = () => {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null)
  const [connected, setConnected] = useState(false)
  const token = useAuthStore((state) => state.token)
  const queryClient = useQueryClient()

  /**
   * A product or category was created, edited, unpublished or deleted
   * somewhere else. Every open tab shows a stale catalog until it is manually
   * reloaded, so drop the cached list/detail/category entries and let
   * react-query refetch whatever is actually mounted.
   *
   * This is a cache-invalidation signal, not a data push: the payload carries no
   * catalogue data, and the refetch goes through the normal API which applies its
   * own access rules. That is also why it works with socket auth disabled.
   */
  useEffect(() => {
    if (!socket || typeof socket.on !== 'function') {
      return
    }

    const handleCatalogUpdate = (payload) => {
      console.log('📦 Catalog changed, invalidating cached queries:', payload?.reason)
      invalidateCatalog(queryClient)
    }

    socket.on('catalog:update', handleCatalogUpdate)

    return () => {
      if (typeof socket.off === 'function') {
        socket.off('catalog:update', handleCatalogUpdate)
      }
    }
  }, [socket, queryClient])

  useEffect(() => {
    console.log('🔌 Initializing socket connection...');
    
    // Get socket URL from environment configuration
    const socketUrl = envConfig.socketUrl;
    console.log('🌐 Connecting to socket URL:', socketUrl);
    console.log('🔧 Environment:', envConfig.mode, '| Debug enabled:', envConfig.enableDebug);
    
    // Create socket instance with proper configuration
    const socketInstance = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'], // Allow fallback to polling
      timeout: 60000, // Increased to match backend pingTimeout
      reconnection: true,
      reconnectionAttempts: Infinity, // Keep trying to reconnect
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      // Temporarily remove auth for debugging
      // auth: token ? { token, userId: 'user123' } : { userId: 'guest123' }
      auth: { userId: 'user123' } // Temporary user ID for room management
    })

    // Debug: Log socket instance details
    console.log('🔍 Socket instance created:', {
      type: typeof socketInstance,
      hasOn: typeof socketInstance.on === 'function',
      hasEmit: typeof socketInstance.emit === 'function',
      methods: Object.getOwnPropertyNames(Object.getPrototypeOf(socketInstance)).slice(0, 15)
    });

    // Connection event
    socketInstance.on('connect', () => {
      console.log('✅ Socket connected successfully!')
      console.log('📋 Socket ID:', socketInstance.id)
      console.log('🌐 Transport:', socketInstance.io.engine.transport.name)
      setConnected(true)
    })

    // Disconnection event
    socketInstance.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected. Reason:', reason)
      setConnected(false)
    })

    // Connection error event
    socketInstance.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error)
      console.error('❌ Error details:', {
        message: error.message,
        description: error.description,
        context: error.context,
        type: error.type,
        advice: error.advice
      })
    })

    // Reconnection events
    socketInstance.on('reconnect', (attemptNumber) => {
      console.log(`� Socket reconnected after ${attemptNumber} attempts`)
    })

    socketInstance.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Socket reconnection attempt ${attemptNumber}`)
    })

    socketInstance.on('reconnect_error', (error) => {
      console.error('❌ Socket reconnection error:', error)
    })

    socketInstance.on('reconnect_failed', () => {
      console.error('❌ Socket reconnection failed')
    })

    // Set socket instance
    setSocket(socketInstance)

    // Cleanup on unmount
    return () => {
      console.log('🧹 Disconnecting socket...')
      socketInstance.disconnect()
    }
  }, []) // Remove token dependency for now

  const value = {
    socket,
    connected
  }

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  )
}
