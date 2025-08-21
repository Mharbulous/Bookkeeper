import { doc, getDoc, setDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase.js'

/**
 * TeamService - Manages team operations for Multi-App SSO
 */
export class TeamService {
  /**
   * Create a new team
   * @param {string} teamId - Unique team identifier
   * @param {Object} teamData - Team information
   * @returns {Promise<void>}
   */
  static async createTeam(teamId, teamData) {
    if (!teamId || !teamData.name) {
      throw new Error('Team ID and name are required')
    }

    try {
      const teamDocRef = doc(db, 'teams', teamId)
      
      const team = {
        name: teamData.name,
        description: teamData.description || '',
        members: {},
        settings: teamData.settings || {},
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }

      await setDoc(teamDocRef, team)
      console.log(`Team created: ${teamId}`)
    } catch (error) {
      console.error('Error creating team:', error)
      throw error
    }
  }

  /**
   * Get team information
   * @param {string} teamId - Team identifier
   * @returns {Promise<Object|null>} Team data or null if not found
   */
  static async getTeam(teamId) {
    if (!teamId) {
      return null
    }

    try {
      const teamDocRef = doc(db, 'teams', teamId)
      const teamDoc = await getDoc(teamDocRef)
      
      if (teamDoc.exists()) {
        return { id: teamDoc.id, ...teamDoc.data() }
      }
      
      return null
    } catch (error) {
      console.error('Error fetching team:', error)
      throw error
    }
  }

  /**
   * Add user to team
   * @param {string} teamId - Team identifier
   * @param {string} userId - User identifier
   * @param {Object} memberData - Member information (email, role, etc.)
   * @returns {Promise<void>}
   */
  static async addTeamMember(teamId, userId, memberData) {
    if (!teamId || !userId || !memberData.email) {
      throw new Error('Team ID, User ID, and email are required')
    }

    try {
      const teamDocRef = doc(db, 'teams', teamId)
      const teamDoc = await getDoc(teamDocRef)
      
      if (!teamDoc.exists()) {
        throw new Error('Team does not exist')
      }

      const teamData = teamDoc.data()
      const members = teamData.members || {}

      // Add new member
      members[userId] = {
        email: memberData.email,
        role: memberData.role || 'member',
        joinedAt: serverTimestamp(),
      }

      // Update team document
      await setDoc(teamDocRef, {
        ...teamData,
        members,
        updatedAt: serverTimestamp(),
      })

      console.log(`User ${userId} added to team ${teamId}`)
    } catch (error) {
      console.error('Error adding team member:', error)
      throw error
    }
  }

  /**
   * Remove user from team
   * @param {string} teamId - Team identifier
   * @param {string} userId - User identifier
   * @returns {Promise<void>}
   */
  static async removeTeamMember(teamId, userId) {
    if (!teamId || !userId) {
      throw new Error('Team ID and User ID are required')
    }

    try {
      const teamDocRef = doc(db, 'teams', teamId)
      const teamDoc = await getDoc(teamDocRef)
      
      if (!teamDoc.exists()) {
        throw new Error('Team does not exist')
      }

      const teamData = teamDoc.data()
      const members = teamData.members || {}

      // Remove member
      delete members[userId]

      // Update team document
      await setDoc(teamDocRef, {
        ...teamData,
        members,
        updatedAt: serverTimestamp(),
      })

      console.log(`User ${userId} removed from team ${teamId}`)
    } catch (error) {
      console.error('Error removing team member:', error)
      throw error
    }
  }

  /**
   * Check if user is member of team
   * @param {string} teamId - Team identifier
   * @param {string} userId - User identifier
   * @returns {Promise<boolean>} True if user is member
   */
  static async isTeamMember(teamId, userId) {
    if (!teamId || !userId) {
      return false
    }

    try {
      const team = await this.getTeam(teamId)
      return team && team.members && team.members[userId] !== undefined
    } catch (error) {
      console.error('Error checking team membership:', error)
      return false
    }
  }

  /**
   * Get user's teams
   * @param {string} userId - User identifier
   * @returns {Promise<Array>} Array of teams user belongs to
   */
  static async getUserTeams(userId) {
    if (!userId) {
      return []
    }

    try {
      const userTeams = []
      
      // First, try to get user's solo team (teamId === userId)
      try {
        const soloTeamRef = doc(db, 'teams', userId)
        const soloTeamSnap = await getDoc(soloTeamRef)
        
        if (soloTeamSnap.exists()) {
          const teamData = soloTeamSnap.data()
          if (teamData.members && teamData.members[userId]) {
            userTeams.push({
              id: soloTeamSnap.id,
              ...teamData,
              userRole: teamData.members[userId].role
            })
          }
        }
      } catch (soloError) {
        console.log('Solo team not found or not accessible:', soloError.message)
      }
      
      // TODO: In future phases, we would query for other teams the user belongs to
      // For now, we only support solo teams (teamId === userId)
      // When we implement team invitations, we'll add logic here to find
      // teams where the user is a member but teamId !== userId
      
      return userTeams
    } catch (error) {
      console.error('Error fetching user teams:', error)
      return []
    }
  }

  /**
   * Update team member role
   * @param {string} teamId - Team identifier
   * @param {string} userId - User identifier
   * @param {string} newRole - New role for the user
   * @returns {Promise<void>}
   */
  static async updateMemberRole(teamId, userId, newRole) {
    if (!teamId || !userId || !newRole) {
      throw new Error('Team ID, User ID, and new role are required')
    }

    try {
      const teamDocRef = doc(db, 'teams', teamId)
      const teamDoc = await getDoc(teamDocRef)
      
      if (!teamDoc.exists()) {
        throw new Error('Team does not exist')
      }

      const teamData = teamDoc.data()
      const members = teamData.members || {}

      if (!members[userId]) {
        throw new Error('User is not a member of this team')
      }

      // Update member role
      members[userId].role = newRole

      // Update team document
      await setDoc(teamDocRef, {
        ...teamData,
        members,
        updatedAt: serverTimestamp(),
      })

      console.log(`User ${userId} role updated to ${newRole} in team ${teamId}`)
    } catch (error) {
      console.error('Error updating member role:', error)
      throw error
    }
  }
}

export default TeamService