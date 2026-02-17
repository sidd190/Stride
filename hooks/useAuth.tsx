import React, { createContext, useContext, useState, useEffect, PropsWithChildren } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useMobileWallet } from '@wallet-ui/react-native-web3js'
import { AppConfig } from '@/constants/app-config'

interface AuthContextType {
  isAuthenticated: boolean
  signInWithWallet: () => Promise<void>
  signOut: () => Promise<void>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: PropsWithChildren) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const { account, signIn } = useMobileWallet()

  useEffect(() => {
    loadAuthState()
  }, [])

  const loadAuthState = async () => {
    try {
      const authState = await AsyncStorage.getItem('is_authenticated')
      setIsAuthenticated(authState === 'true')
    } catch (error) {
      console.error('Failed to load auth state:', error)
    } finally {
      setLoading(false)
    }
  }

  const signInWithWallet = async () => {
    if (!account || !signIn) {
      throw new Error('Wallet not connected')
    }

    try {
      setLoading(true)
      await signIn({ address: account.address.toString(), uri: AppConfig.uri })
      await AsyncStorage.setItem('is_authenticated', 'true')
      setIsAuthenticated(true)
      console.log('Signed in successfully!')
    } catch (error) {
      console.error('Authentication failed:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      await AsyncStorage.removeItem('is_authenticated')
      setIsAuthenticated(false)
      // Disconnect wallet would go here if the library supports it
    } catch (error) {
      console.error('Sign out failed:', error)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        signInWithWallet,
        signOut,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
