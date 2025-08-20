import { defineStore } from 'pinia'
import { onAuthStateChanged, setPersistence, browserLocalPersistence } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../services/firebase'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    // Explicit auth states for the state machine
    authState: 'uninitialized', // uninitialized -> initializing -> authenticated | unauthenticated | error
    user: null,
    userRole: null,
    teamId: null,
    error: null,
    
    // Internal tracking
    _unsubscribe: null,
    _initialized: false,
  }),

  getters: {
    // State machine status getters
    isUninitialized: (state) => state.authState === 'uninitialized',
    isInitializing: (state) => state.authState === 'initializing', 
    isAuthenticated: (state) => state.authState === 'authenticated',
    isUnauthenticated: (state) => state.authState === 'unauthenticated',
    isError: (state) => state.authState === 'error',
    isInitialized: (state) => state.authState !== 'uninitialized' && state.authState !== 'initializing',
    
    // User display getters
    userDisplayName: (state) => {
      if (!state.user) return null
      return state.user.displayName || state.user.email?.split('@')[0] || 'User'
    },
    
    // Team getters
    currentTeam: (state) => state.teamId,
    
    userInitials: (state) => {
      if (!state.user) return 'loading'
      
      let name = state.user.displayName || state.user.email || 'User'
      
      // If it's an email, use the part before @
      if (name.includes('@')) {
        name = name.split('@')[0]
      }
      
      // Get first two characters of the first name/word
      const words = name.trim().split(/\s+/)
      const firstName = words[0] || name
      
      // Take first two characters of the first name
      return firstName.substring(0, 2).toUpperCase()
    }
  },

  actions: {
    // Initialize the auth system
    async initialize() {
      if (this._initialized) {
        console.log('Auth already initialized')
        return
      }

      console.log('Auth store initializing...')
      this._initialized = true
      this.authState = 'initializing'
      this.error = null
      
      // Enable cross-domain persistence for SSO
      try {
        await setPersistence(auth, browserLocalPersistence)
        console.log('Cross-domain persistence enabled for SSO')
      } catch (error) {
        console.error('Failed to set auth persistence:', error)
      }
      
      this._initializeFirebase()
    },

    // Firebase initialization
    _initializeFirebase() {
      this._unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        try {
          console.log('Firebase auth state changed:', firebaseUser ? 'User logged in' : 'No user')
          
          if (firebaseUser) {
            await this._handleUserAuthenticated(firebaseUser)
          } else {
            await this._handleUserUnauthenticated()
          }
        } catch (error) {
          console.error('Error in auth state change handler:', error)
          this.error = error.message
          this.authState = 'error'
        }
      })
    },

    // Handle authenticated user
    async _handleUserAuthenticated(firebaseUser) {
      try {
        // Use Firebase Auth as single source of truth for identity data
        this.user = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          photoURL: firebaseUser.photoURL,
        }
        
        // Only fetch application-specific data from Firestore
        await this.fetchUserData(firebaseUser.uid)
        
        // Initialize team store with user's team data
        await this._initializeTeamContext(firebaseUser.uid)
        
        this.authState = 'authenticated'
        this.error = null
        console.log('Auth state transitioned: -> authenticated (using Firebase Auth as source of truth)')
      } catch (error) {
        console.error('Error loading user data from Firestore:', error)
        // Still authenticate user even if data fetch fails
        this.user = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          photoURL: firebaseUser.photoURL,
        }
        this.userRole = null // Default role when fetch fails
        this.teamId = null // Default team when fetch fails
        this.authState = 'authenticated'
        this.error = null
      }
    },

    // Handle unauthenticated user
    async _handleUserUnauthenticated() {
      this.user = null
      this.userRole = null
      this.teamId = null
      this.authState = 'unauthenticated'
      this.error = null
      
      // Clear team store data
      await this._clearTeamContext()
      
      console.log('Auth state transitioned: -> unauthenticated')
    },

    // Fetch user data from Firestore (role and team)
    async fetchUserData(userId) {
      if (!userId) {
        this.userRole = null
        this.teamId = null
        return
      }
      
      try {
        // First try to get team from custom claims
        const idTokenResult = await auth.currentUser?.getIdTokenResult()
        this.teamId = idTokenResult?.claims?.teamId || null
        
        // Fetch user document for role and fallback team
        const userDocRef = doc(db, 'users', userId)
        const userDocSnap = await getDoc(userDocRef)
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data()
          this.userRole = userData.role || null
          
          // Use Firestore teamId as fallback if no custom claim
          if (!this.teamId) {
            this.teamId = userData.teamId || null
          }
        } else {
          this.userRole = null
          // Keep teamId from custom claims if available
        }
      } catch (error) {
        console.error('Error fetching user data:', error)
        this.userRole = null
        this.teamId = null
      }
    },

    // Login action - delegates to auth service
    async login(email, password) {
      try {
        this.error = null
        // Import auth service dynamically to avoid circular imports
        const { authService } = await import('../services/authService')
        await authService.signIn(email, password)
        // The onAuthStateChanged listener will handle the state transition
      } catch (error) {
        this.error = error.message
        this.authState = 'error'
        throw error
      }
    },

    // Logout action
    async logout() {
      try {
        this.error = null
        // Import auth service dynamically to avoid circular imports
        const { authService } = await import('../services/authService')
        await authService.signOut()
        // The onAuthStateChanged listener will handle the state transition
      } catch (error) {
        this.error = error.message
        throw error
      }
    },

    // Wait for auth initialization
    async waitForInit() {
      return new Promise((resolve) => {
        if (this.isInitialized) {
          resolve()
          return
        }
        
        const unwatch = this.$subscribe((mutation, state) => {
          if (state.authState !== 'uninitialized' && state.authState !== 'initializing') {
            unwatch()
            resolve()
          }
        })
      })
    },

    // Initialize team context after authentication
    async _initializeTeamContext(userId) {
      try {
        // Import team store dynamically to avoid circular imports
        const { useTeamStore } = await import('./team')
        const teamStore = useTeamStore()
        
        // Load user's teams
        await teamStore.loadUserTeams(userId)
        
        // If user has a teamId, load that team
        if (this.teamId) {
          await teamStore.loadTeam(this.teamId)
        }
        
        console.log('Team context initialized')
      } catch (error) {
        console.error('Error initializing team context:', error)
        // Don't fail auth if team initialization fails
      }
    },

    // Clear team context on logout
    async _clearTeamContext() {
      try {
        // Import team store dynamically to avoid circular imports
        const { useTeamStore } = await import('./team')
        const teamStore = useTeamStore()
        
        teamStore.clearTeamData()
        console.log('Team context cleared')
      } catch (error) {
        console.error('Error clearing team context:', error)
      }
    },

    // Switch user's team context
    async switchTeam(teamId) {
      try {
        this.teamId = teamId
        
        // Update team store
        const { useTeamStore } = await import('./team')
        const teamStore = useTeamStore()
        await teamStore.switchTeam(teamId)
        
        // Update user document with new team
        if (this.user?.uid) {
          const { UserService } = await import('../services/userService')
          await UserService.createOrUpdateUserDocument(this.user, {
            role: this.userRole,
            teamId: teamId
          })
        }
        
        console.log('Switched to team:', teamId)
      } catch (error) {
        console.error('Error switching team:', error)
        this.error = error.message
        throw error
      }
    },

    // Cleanup - called when store is destroyed
    cleanup() {
      if (this._unsubscribe) {
        this._unsubscribe()
        this._unsubscribe = null
      }
      this._initialized = false
      this.authState = 'uninitialized'
      console.log('Auth store cleaned up')
    }
  }
})

