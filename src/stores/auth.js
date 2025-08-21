import { defineStore } from 'pinia'
import { onAuthStateChanged, setPersistence, browserLocalPersistence } from 'firebase/auth'
import { doc, getDoc, serverTimestamp } from 'firebase/firestore'
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
        // 1. Set user identity from Firebase Auth (single source of truth)
        this.user = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          photoURL: firebaseUser.photoURL,
        }
        
        // 2. Check for existing team (one simple check)
        const teamId = await this._getUserTeamId(firebaseUser.uid)
        
        if (teamId) {
          // Existing user with team
          this.teamId = teamId
          this.userRole = await this._getUserRole(teamId, firebaseUser.uid)
        } else {
          // New user - create solo team ONCE
          await this._createSoloTeam(firebaseUser)
          this.teamId = firebaseUser.uid
          this.userRole = 'admin'
        }
        
        // 3. Initialize team context after authentication
        await this._initializeTeamContext(firebaseUser.uid)
        
        // 4. Update state
        this.authState = 'authenticated'
        this.error = null
        
        console.log('User authenticated:', firebaseUser.email)
      } catch (error) {
        console.error('Error handling authenticated user:', error)
        // Still authenticate even if team setup fails
        this.authState = 'authenticated'
        this.teamId = firebaseUser.uid  // Fallback to userId
        this.userRole = 'admin'  // Fallback to admin
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

    // Simple check for existing team
    async _getUserTeamId(userId) {
      try {
        // Check if user has a solo team
        const teamDoc = await getDoc(doc(db, 'teams', userId))
        if (teamDoc.exists()) {
          return userId  // Solo team exists
        }
        
        // In the future, check for team memberships here
        // For now, return null if no solo team
        return null
      } catch (error) {
        console.error('Error checking team:', error)
        return null
      }
    },

    // Get user's role in team
    async _getUserRole(teamId, userId) {
      try {
        const teamDoc = await getDoc(doc(db, 'teams', teamId))
        if (teamDoc.exists()) {
          const members = teamDoc.data().members || {}
          return members[userId]?.role || 'member'
        }
        return 'member'
      } catch (error) {
        console.error('Error getting role:', error)
        return 'member'
      }
    },

    // Create solo team - ONE TIME ONLY
    async _createSoloTeam(firebaseUser) {
      const { db } = await import('../services/firebase')
      const { writeBatch, doc } = await import('firebase/firestore')
      const batch = writeBatch(db)
      
      try {
        // 1. Create team document
        const teamRef = doc(db, 'teams', firebaseUser.uid)
        batch.set(teamRef, {
          name: `${firebaseUser.displayName || 'User'}'s Workspace`,
          description: 'Personal workspace',
          members: {
            [firebaseUser.uid]: {
              email: firebaseUser.email,
              role: 'admin',
              joinedAt: serverTimestamp()
            }
          },
          isPersonal: true,
          apps: ['intranet', 'bookkeeper'],
          settings: {
            timezone: 'UTC',
            maxMembers: 100
          },
          createdAt: serverTimestamp(),
          createdBy: firebaseUser.uid
        })
        
        // 2. Create default matter
        const matterRef = doc(db, 'teams', firebaseUser.uid, 'matters', 'matter-general')
        batch.set(matterRef, {
          title: 'General Documents',
          description: 'Non-client documents and resources',
          clientId: null,
          matterNumber: 'GEN-001',
          status: 'active',
          priority: 'low',
          assignedTo: [firebaseUser.uid],
          createdAt: serverTimestamp(),
          createdBy: firebaseUser.uid,
          isSystemMatter: true
        })
        
        // 3. Update user document with preferences
        const userRef = doc(db, 'users', firebaseUser.uid)
        batch.set(userRef, {
          preferences: {
            theme: 'light',
            notifications: true,
            language: 'en'
          },
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp()
        }, { merge: true })
        
        await batch.commit()
        console.log('Solo team created for user:', firebaseUser.email)
      } catch (error) {
        console.error('Error creating solo team:', error)
        throw error
      }
    },

    // Fetch user data from Firestore (preferences only)
    async fetchUserData(userId) {
      if (!userId) {
        this.userRole = null
        this.teamId = null
        return
      }
      
      try {
        // Just get user preferences - that's all we store there
        const userDoc = await getDoc(doc(db, 'users', userId))
        
        // Preferences are optional, don't fail if missing
        if (userDoc.exists()) {
          // Store any user preferences in the store if needed
          // But DON'T store teamId or role here - those come from team check
        }
      } catch (error) {
        console.error('Error fetching user data:', error)
        // Don't fail auth for this
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

