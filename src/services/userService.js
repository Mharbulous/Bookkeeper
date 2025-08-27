import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from './firebase.js';

/**
 * UserService - Manages user information and display names
 */
export class UserService {
  // Cache to prevent repeated lookups for the same user
  static userCache = new Map();

  /**
   * Get display name for a user ID
   * @param {string} userId - Firebase user UID
   * @returns {Promise<string>} Display name or fallback
   */
  static async getUserDisplayName(userId) {
    if (!userId) {
      return 'Unknown User';
    }

    // Check cache first
    if (this.userCache.has(userId)) {
      return this.userCache.get(userId);
    }

    try {
      // Try to get basic info from current Firebase Auth user if it's the same user
      if (auth.currentUser && auth.currentUser.uid === userId) {
        const displayName =
          auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || 'Current User';
        this.userCache.set(userId, displayName);
        return displayName;
      }

      // For other users, we can't get display names from Firebase Auth (security restriction)
      // and we no longer store identity data in Firestore (single source of truth)
      // So we fall back to UID-based display names

      let displayName = 'Unknown User';

      if (userId.includes('@')) {
        // If userId looks like an email, use the part before @
        displayName = userId.split('@')[0];
      } else if (userId.length > 10) {
        // For long UIDs, show a shortened version
        displayName = `User-${userId.substring(0, 8)}`;
      } else {
        displayName = 'Unknown User';
      }

      // Cache the result
      this.userCache.set(userId, displayName);
      return displayName;
    } catch (error) {
      console.error('Error fetching user display name:', error);

      // Cache the fallback to prevent repeated failed lookups
      this.userCache.set(userId, 'Unknown User');
      return 'Unknown User';
    }
  }

  /**
   * Create or update user app-specific data in Firestore
   * Note: Identity data (email, displayName, photoURL) comes from Firebase Auth
   * @param {Object} firebaseUser - Firebase Auth user object
   * @param {Object} additionalData - Additional user data (role, etc.)
   * @returns {Promise<void>}
   */
  static async createOrUpdateUserDocument(firebaseUser, additionalData = {}) {
    if (!firebaseUser || !firebaseUser.uid) {
      throw new Error('Valid Firebase user required');
    }

    try {
      const userDocRef = doc(db, 'users', firebaseUser.uid);

      // Only store application-specific data, not identity data
      const userData = {
        // Application-specific fields only
        role: additionalData.role || 'user',
        department: additionalData.department || null,
        teamId: additionalData.teamId || null,
        preferences: additionalData.preferences || {},

        // Activity timestamps
        updatedAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
      };

      // Check if document already exists
      const existingDoc = await getDoc(userDocRef);
      if (!existingDoc.exists()) {
        userData.createdAt = serverTimestamp();
      }

      await setDoc(userDocRef, userData, { merge: true });

      // Clear cache to force refresh of user data
      this.userCache.delete(firebaseUser.uid);
    } catch (error) {
      console.error('Error creating/updating user document:', error);
      throw error;
    }
  }

  /**
   * Clear the user cache (useful for testing or when user data changes)
   */
  static clearCache() {
    this.userCache.clear();
  }

  /**
   * Preload multiple user display names for better performance
   * @param {string[]} userIds - Array of user IDs to preload
   * @returns {Promise<Map>} Map of userId -> displayName
   */
  static async preloadUserDisplayNames(userIds) {
    const results = new Map();
    const promises = userIds.map(async (userId) => {
      const displayName = await this.getUserDisplayName(userId);
      results.set(userId, displayName);
    });

    await Promise.all(promises);
    return results;
  }
}

export default UserService;
