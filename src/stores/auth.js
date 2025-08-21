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
        
        // Ensure user conforms to current team architecture (migration + initialization)
        await this._ensureUserArchitecture(firebaseUser)
        
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
        const customTeamId = idTokenResult?.claims?.teamId || null
        const customRole = idTokenResult?.claims?.role || null
        
        // Fetch user document for role and fallback team
        const userDocRef = doc(db, 'users', userId)
        const userDocSnap = await getDoc(userDocRef)
        
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data()
          
          // Use custom claims first, then fallback to user document
          this.teamId = customTeamId || userData.teamId || userData.defaultTeamId || null
          this.userRole = customRole || userData.role || null
          
          // For solo users, if no teamId is found anywhere, use userId as teamId
          if (!this.teamId && userId) {
            console.log('No teamId found, using userId as fallback for solo user')
            this.teamId = userId
          }
        } else {
          // No user document exists - use custom claims or fallback
          this.teamId = customTeamId || userId // Solo user fallback
          this.userRole = customRole || 'admin' // Solo users are admins
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

    // Ensure user conforms to current team architecture (universal initialization/migration)
    async _ensureUserArchitecture(firebaseUser) {
      try {
        const architectureStatus = await this._validateUserArchitecture(firebaseUser)
        
        if (architectureStatus.needsUpdate) {
          console.log('User architecture needs update:', architectureStatus.reasons.join(', '))
          await this._updateUserArchitecture(firebaseUser, architectureStatus)
          
          // Refresh user data after update
          await this.fetchUserData(firebaseUser.uid)
          
          // Re-validate to confirm everything is now current
          const revalidationStatus = await this._validateUserArchitecture(firebaseUser)
          if (revalidationStatus.needsUpdate) {
            console.log('⚠️ Architecture still needs updates after initial fix:', revalidationStatus.reasons.join(', '))
          } else {
            console.log('✅ User architecture is now current')
          }
        } else {
          console.log('User architecture is current')
        }
      } catch (error) {
        console.error('Error during user architecture validation:', error)
        // Don't fail auth if validation fails - user can still use the app
      }
    },

    // Validate user's current architecture against expected patterns
    async _validateUserArchitecture(firebaseUser) {
      try {
        const userId = firebaseUser.uid
        const userEmail = firebaseUser.email
        const reasons = []
        let needsUpdate = false
        
        // Import Firebase modules
        const { doc, getDoc } = await import('firebase/firestore')
        const { db } = await import('../services/firebase')
        
        // 1. Check custom claims (but don't require them if fallback data exists)
        const idTokenResult = await firebaseUser.getIdTokenResult(true) // Force refresh
        const claims = idTokenResult.claims || {}
        
        let hasValidClaims = claims.teamId === userId && claims.role === 'admin'
        
        // We'll check if fallback data exists later, so only flag claims issues if we don't have fallback
        
        // 2. Check user document (force fresh read from server)
        const userDocRef = doc(db, 'users', userId)
        const userDocSnap = await getDoc(userDocRef)
        
        let hasValidUserDoc = false
        let hasFallbackTeamData = false
        
        if (!userDocSnap.exists()) {
          reasons.push('User document missing')
          needsUpdate = true
        } else {
          const userData = userDocSnap.data()
          hasValidUserDoc = true
          
          // Debug: Log what's actually in the user document
          console.log('Current user document data:', JSON.stringify(userData, null, 2))
          
          // Check if we have fallback team data in user document
          hasFallbackTeamData = userData.teamId === userId && userData.role === 'admin'
          
          console.log('Fallback team data check:', {
            userId,
            userDataTeamId: userData.teamId,
            userDataRole: userData.role,
            hasTeamId: userData.teamId === userId,
            hasRole: userData.role === 'admin',
            hasFallbackTeamData
          })
          
          if (userData.defaultTeamId !== userId) {
            reasons.push('User defaultTeamId should match userId')
            needsUpdate = true
          }
          if (!userData.preferences) {
            reasons.push('User preferences missing')
            needsUpdate = true
          }
        }
        
        // 1.5. Now check custom claims - only flag as needing update if no fallback exists
        if (!hasValidClaims && !hasFallbackTeamData) {
          if (!claims.teamId) {
            reasons.push('Missing teamId in both custom claims and user document')
            needsUpdate = true
          } else if (claims.teamId !== userId) {
            reasons.push('teamId does not match userId in both custom claims and user document')
            needsUpdate = true
          }
          
          if (!claims.role) {
            reasons.push('Missing role in both custom claims and user document')
            needsUpdate = true
          } else if (claims.role !== 'admin') {
            reasons.push('Solo user should have admin role in both custom claims and user document')
            needsUpdate = true
          }
        }
        
        // 3. Check solo team document
        const teamDocRef = doc(db, 'teams', userId)
        const teamDocSnap = await getDoc(teamDocRef)
        
        if (!teamDocSnap.exists()) {
          reasons.push('Solo team document missing')
          needsUpdate = true
        } else {
          const teamData = teamDocSnap.data()
          
          // Validate team structure
          if (!teamData.isPersonal) {
            reasons.push('Team missing isPersonal flag')
            needsUpdate = true
          }
          
          if (!teamData.members || !teamData.members[userId]) {
            reasons.push('User not properly added to their solo team')
            needsUpdate = true
          } else if (teamData.members[userId].role !== 'admin') {
            reasons.push('User should be admin of their solo team')
            needsUpdate = true
          }
          
          if (!teamData.apps || !Array.isArray(teamData.apps)) {
            reasons.push('Team apps configuration missing or invalid')
            needsUpdate = true
          }
        }
        
        // 4. Check for required matters
        const generalMatterRef = doc(db, 'teams', userId, 'matters', 'matter-general')
        const generalMatterSnap = await getDoc(generalMatterRef)
        
        if (!generalMatterSnap.exists()) {
          reasons.push('Default general matter missing')
          needsUpdate = true
        }
        
        return {
          needsUpdate,
          reasons,
          hasUserDoc: userDocSnap.exists(),
          hasTeamDoc: teamDocSnap.exists(),
          hasGeneralMatter: generalMatterSnap.exists(),
          currentClaims: claims
        }
        
      } catch (error) {
        console.error('Error validating user architecture:', error)
        return {
          needsUpdate: false,
          reasons: ['Validation failed - assuming current'],
          error: error.message
        }
      }
    },

    // Update user to current team architecture (handles both migration and initialization)
    async _updateUserArchitecture(firebaseUser, architectureStatus) {
      try {
        console.log('Updating user architecture for:', firebaseUser.uid)
        
        const { doc, setDoc, updateDoc, getDoc, serverTimestamp } = await import('firebase/firestore')
        const { db } = await import('../services/firebase')
        
        const userId = firebaseUser.uid
        const userEmail = firebaseUser.email
        const displayName = firebaseUser.displayName || userEmail?.split('@')[0] || 'User'
        
        // 1. Ensure user document is current
        if (!architectureStatus.hasUserDoc || architectureStatus.reasons.some(r => r.includes('User'))) {
          const userDocRef = doc(db, 'users', userId)
          await setDoc(userDocRef, {
            defaultTeamId: userId, // Solo user's team is themselves
            preferences: {
              theme: 'light',
              notifications: true,
              language: 'en'
            },
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp()
          }, { merge: true }) // Use merge to preserve any existing data
          console.log('✓ User document updated')
        }
        
        // 2. Ensure solo team document is current
        if (!architectureStatus.hasTeamDoc || architectureStatus.reasons.some(r => r.includes('team') || r.includes('Team'))) {
          const teamDocRef = doc(db, 'teams', userId)
          await setDoc(teamDocRef, {
            name: `${displayName}'s Workspace`,
            description: 'Personal workspace',
            members: {
              [userId]: {
                email: userEmail,
                role: 'admin',
                joinedAt: serverTimestamp()
              }
            },
            pendingInvites: {},
            apps: ['intranet', 'bookkeeper'],
            settings: {
              timezone: 'UTC',
              maxMembers: 100
            },
            isPersonal: true, // Flag to identify solo teams
            createdAt: serverTimestamp(),
            createdBy: userId
          }, { merge: true }) // Preserve any existing data
          console.log('✓ Solo team document updated')
        }
        
        // 3. Ensure default matters exist
        if (!architectureStatus.hasGeneralMatter || architectureStatus.reasons.some(r => r.includes('matter'))) {
          await this._ensureDefaultMatters(userId)
          console.log('✓ Default matters ensured')
        }
        
        // 4. Update custom claims if needed (only if no fallback data exists)
        const needsClaimsUpdate = architectureStatus.reasons.some(r => 
          r.includes('both custom claims and user document') || 
          r.includes('claims')
        )
        
        if (needsClaimsUpdate) {
          await this._updateCustomClaims(userId)
          console.log('✓ Custom claims update attempted')
        }
        
        console.log('Successfully updated user architecture')
        
      } catch (error) {
        console.error('Error updating user architecture:', error)
        throw error
      }
    },

    // Ensure default matters exist for a team
    async _ensureDefaultMatters(teamId) {
      try {
        const { doc, setDoc, getDoc, serverTimestamp } = await import('firebase/firestore')
        const { db } = await import('../services/firebase')
        
        // Default matters that every team should have
        const defaultMatters = [
          {
            id: 'matter-general',
            title: 'General Team Documents',
            description: 'Non-client documents and team resources',
            matterNumber: 'GEN-001'
          }
          // Add more default matters here as needed
        ]
        
        for (const matter of defaultMatters) {
          const matterRef = doc(db, 'teams', teamId, 'matters', matter.id)
          const matterSnap = await getDoc(matterRef)
          
          if (!matterSnap.exists()) {
            await setDoc(matterRef, {
              title: matter.title,
              description: matter.description,
              clientId: null,
              matterNumber: matter.matterNumber,
              status: 'active',
              priority: 'low',
              assignedTo: [teamId],
              openedDate: serverTimestamp(),
              createdAt: serverTimestamp(),
              createdBy: teamId,
              isSystemMatter: true
            })
            console.log(`✓ Created matter: ${matter.id}`)
          }
        }
        
      } catch (error) {
        console.error('Error ensuring default matters:', error)
        // Don't fail architecture update if matter creation fails
      }
    },

    // Update custom claims (requires backend function)
    async _updateCustomClaims(userId) {
      try {
        // For now, we'll simulate custom claims by updating the user document
        // In production, you'd have a Firebase Function to set actual custom claims
        
        // Check if cloud function exists first
        const { getFunctions, httpsCallable } = await import('firebase/functions')
        const functions = getFunctions()
        
        try {
          const updateClaims = httpsCallable(functions, 'updateUserClaims')
          
          await updateClaims({
            uid: userId,
            claims: {
              teamId: userId,
              role: 'admin'
            }
          })
          
          console.log('✓ Updated custom claims via cloud function')
          
          // Force token refresh to get new claims
          const { auth } = await import('../services/firebase')
          if (auth.currentUser) {
            await auth.currentUser.getIdToken(true)
          }
          
        } catch (functionError) {
          if (functionError.code === 'functions/not-found' || functionError.message.includes('CORS') || functionError.message.includes('internal')) {
            console.log('⚠️ Cloud function not available, using fallback approach')
            
            // Fallback: Store claims-like data in user document for now
            const { doc, setDoc } = await import('firebase/firestore')
            const { db } = await import('../services/firebase')
            
            const userDocRef = doc(db, 'users', userId)
            await setDoc(userDocRef, {
              // Store team info in user document as fallback
              teamId: userId,
              role: 'admin',
              claimsUpdatedAt: new Date()
            }, { merge: true }) // Use merge to preserve existing user data
            
            console.log('✓ Updated fallback team info in user document')
            
            // Debug: Verify the data was written
            const { getDoc } = await import('firebase/firestore')
            const updatedDoc = await getDoc(userDocRef)
            console.log('Verification - user document after update:', updatedDoc.data())
          } else {
            throw functionError
          }
        }
        
      } catch (error) {
        console.warn('Could not update custom claims:', error.message)
        // The app will work without custom claims, just less efficiently
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

