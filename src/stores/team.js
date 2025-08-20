import { defineStore } from 'pinia'
import { TeamService } from '../services/teamService'

export const useTeamStore = defineStore('team', {
  state: () => ({
    currentTeam: null,
    userTeams: [],
    loading: false,
    error: null,
  }),

  getters: {
    hasTeam: (state) => !!state.currentTeam,
    teamName: (state) => state.currentTeam?.name || null,
    userRole: (state) => {
      if (!state.currentTeam || !state.userTeams.length) return null
      const userTeam = state.userTeams.find(team => team.id === state.currentTeam.id)
      return userTeam?.userRole || null
    },
    isTeamAdmin: (state) => {
      if (!state.currentTeam || !state.userTeams.length) return false
      const userTeam = state.userTeams.find(team => team.id === state.currentTeam.id)
      return userTeam?.userRole === 'admin'
    }
  },

  actions: {
    /**
     * Load team data for a specific team ID
     */
    async loadTeam(teamId) {
      if (!teamId) {
        this.currentTeam = null
        return
      }

      this.loading = true
      this.error = null

      try {
        const team = await TeamService.getTeam(teamId)
        this.currentTeam = team
        console.log('Team loaded:', team?.name)
      } catch (error) {
        console.error('Error loading team:', error)
        this.error = error.message
        this.currentTeam = null
      } finally {
        this.loading = false
      }
    },

    /**
     * Load all teams for current user
     */
    async loadUserTeams(userId) {
      if (!userId) {
        this.userTeams = []
        return
      }

      this.loading = true
      this.error = null

      try {
        const teams = await TeamService.getUserTeams(userId)
        this.userTeams = teams
        console.log(`Loaded ${teams.length} teams for user`)
      } catch (error) {
        console.error('Error loading user teams:', error)
        this.error = error.message
        this.userTeams = []
      } finally {
        this.loading = false
      }
    },

    /**
     * Create a new team
     */
    async createTeam(teamId, teamData) {
      this.loading = true
      this.error = null

      try {
        await TeamService.createTeam(teamId, teamData)
        
        // Reload user teams to include the new team
        const authStore = await import('./auth').then(m => m.useAuthStore())
        if (authStore.user?.uid) {
          await this.loadUserTeams(authStore.user.uid)
        }
        
        console.log('Team created successfully')
      } catch (error) {
        console.error('Error creating team:', error)
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Add member to current team
     */
    async addMember(userId, memberData) {
      if (!this.currentTeam) {
        throw new Error('No team selected')
      }

      this.loading = true
      this.error = null

      try {
        await TeamService.addTeamMember(this.currentTeam.id, userId, memberData)
        
        // Reload team data to get updated member list
        await this.loadTeam(this.currentTeam.id)
        
        console.log('Member added successfully')
      } catch (error) {
        console.error('Error adding member:', error)
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Remove member from current team
     */
    async removeMember(userId) {
      if (!this.currentTeam) {
        throw new Error('No team selected')
      }

      this.loading = true
      this.error = null

      try {
        await TeamService.removeTeamMember(this.currentTeam.id, userId)
        
        // Reload team data to get updated member list
        await this.loadTeam(this.currentTeam.id)
        
        console.log('Member removed successfully')
      } catch (error) {
        console.error('Error removing member:', error)
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Update member role in current team
     */
    async updateMemberRole(userId, newRole) {
      if (!this.currentTeam) {
        throw new Error('No team selected')
      }

      this.loading = true
      this.error = null

      try {
        await TeamService.updateMemberRole(this.currentTeam.id, userId, newRole)
        
        // Reload team data to get updated roles
        await this.loadTeam(this.currentTeam.id)
        
        console.log('Member role updated successfully')
      } catch (error) {
        console.error('Error updating member role:', error)
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Switch to a different team (for users with multiple teams)
     */
    async switchTeam(teamId) {
      if (!teamId) {
        this.currentTeam = null
        return
      }

      // Check if user has access to this team
      const hasAccess = this.userTeams.some(team => team.id === teamId)
      if (!hasAccess) {
        throw new Error('You do not have access to this team')
      }

      await this.loadTeam(teamId)
    },

    /**
     * Clear team data (useful for logout)
     */
    clearTeamData() {
      this.currentTeam = null
      this.userTeams = []
      this.loading = false
      this.error = null
      console.log('Team data cleared')
    }
  }
})