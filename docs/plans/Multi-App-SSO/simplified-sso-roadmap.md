# Simplified Multi-App SSO Implementation (KISS Principle)

## Overview
Build Multi-App SSO the **simple way** using Firebase Auth's built-in capabilities. No Cloud Functions, no complex cookie management, no separate auth app.

**Timeline: 5-6 weeks total** (vs. 19 weeks in original plan)

## Core Principle: Build SSO First, Apps Second
Start with the authentication layer working across domains, THEN build your apps. This prevents refactoring.

---

## 📋 Prerequisites (Same as Before)
- Single Firebase project for ALL apps
- Domain with wildcard SSL (`*.yourdomain.com`)
- Vue 3 + Firebase knowledge

---

## Phase 1: SSO Foundation (Week 1)

### Step 1.1: Configure Firebase for Multi-Domain

```javascript
// Firebase Console Settings
// Authentication > Settings > Authorized domains
// Add:
intranet.yourdomain.com
bookkeeping.yourdomain.com
localhost:3000
localhost:3001
```

### Step 1.2: Update Template with SSO Support

**Simple Auth Store (Template/src/stores/auth.js)**:
```javascript
import { defineStore } from 'pinia'
import { 
  onAuthStateChanged, 
  setPersistence, 
  browserLocalPersistence,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth'
import { auth, db } from '../services/firebase'
import { doc, getDoc } from 'firebase/firestore'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    teamId: null,
    loading: true
  }),

  getters: {
    isAuthenticated: (state) => !!state.user,
    currentTeam: (state) => state.teamId
  },

  actions: {
    async initialize() {
      // Enable cross-domain persistence
      await setPersistence(auth, browserLocalPersistence)
      
      onAuthStateChanged(auth, async (user) => {
        if (user) {
          this.user = user
          // Load team from custom claims or user doc
          const idTokenResult = await user.getIdTokenResult()
          this.teamId = idTokenResult.claims.teamId || null
          
          // Fallback to Firestore if no custom claim
          if (!this.teamId) {
            const userDoc = await getDoc(doc(db, 'users', user.uid))
            this.teamId = userDoc.data()?.teamId
          }
        } else {
          this.user = null
          this.teamId = null
        }
        this.loading = false
      })
    },

    async login(email, password) {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      // Auth state change handler will update store
      return userCredential.user
    },

    async logout() {
      await signOut(auth)
      // Clear and redirect
      window.location.href = '/'
    }
  }
})
```

### Step 1.3: Test Cross-Domain Auth

```bash
# Terminal 1
cd Template
npm run dev -- --port 3000 --host localhost

# Terminal 2  
cd Template
npm run dev -- --port 3001 --host localhost

# Test: Login on :3000, check if authenticated on :3001
```

**Validation**: ✅ User stays logged in across different ports/domains

---

## Phase 2: Add Team Support (Week 2)

### Step 2.1: Simple Team Model

```javascript
// Firestore structure (KISS - flat and simple)
/teams/{teamId} {
  name: "ACME Corp",
  members: {
    userId1: { email: "user@acme.com", role: "admin" },
    userId2: { email: "user2@acme.com", role: "member" }
  }
}

/users/{userId} {
  email: "user@acme.com",
  teamId: "teamId",
  name: "John Doe"
}
```

### Step 2.2: Add Team Context to Template

```javascript
// Simple team switcher component
<template>
  <div v-if="authStore.currentTeam">
    Team: {{ authStore.currentTeam }}
  </div>
</template>
```

### Step 2.3: Security Rules (SIMPLE)

```javascript
// Firestore Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read their team's data
    match /teams/{teamId}/{document=**} {
      allow read, write: if request.auth != null && 
        request.auth.token.teamId == teamId;
    }
  }
}
```

---

## Phase 3: Build Apps with SSO (Weeks 3-6)

### Step 3.1: Setup Both Apps with Shared Template

```bash
# Create both apps simultaneously
mkdir Intranet BookkeepingBot

# Intranet
cd Intranet
git init
git submodule add [template-repo] template
cp template/.env.example .env
# Add SAME Firebase config to .env

# BookkeepingBot  
cd ../BookkeepingBot
git init
git submodule add [template-repo] template
cp template/.env.example .env
# Add SAME Firebase config to .env (critical!)
```

### Step 3.2: Simple Shared Navigation

```vue
<!-- Template/src/components/AppSwitcher.vue -->
<template>
  <div class="app-switcher">
    <a :href="`https://intranet.${domain}`" 
       :class="{ active: isApp('intranet') }">
      📋 Intranet
    </a>
    <a :href="`https://bookkeeping.${domain}`"
       :class="{ active: isApp('bookkeeping') }">
      📁 Files
    </a>
  </div>
</template>

<script setup>
const domain = import.meta.env.VITE_APP_DOMAIN || 'localhost:3000'
const isApp = (name) => window.location.hostname.includes(name)
</script>
```

### Step 3.3: Build Features (Parallel Development)

Since auth is already working:
- **Developer 1**: Builds Intranet features
- **Developer 2**: Builds BookkeepingBot features
- Both use `authStore.teamId` for data scoping
- No auth refactoring needed!

---

## Phase 4: Deploy (Week 6)

### Step 4.1: Simple Deployment

```bash
# Build all apps
cd Intranet && npm run build
cd ../BookkeepingBot && npm run build

# Deploy to your hosting (Vercel/Netlify/Firebase Hosting)
# Each app on its subdomain
```

### Step 4.2: Production Environment Variables

```env
# Same for BOTH apps (critical!)
VITE_FIREBASE_API_KEY=same-key
VITE_FIREBASE_AUTH_DOMAIN=same-domain
VITE_FIREBASE_PROJECT_ID=same-project
VITE_APP_DOMAIN=yourdomain.com
```

---

## 🎯 That's It! 

No Cloud Functions. No session cookies. No separate auth app. Just Firebase Auth doing what it's designed to do.

## Why This Works

1. **Firebase Auth handles persistence** across domains when configured correctly
2. **One Firebase project** = automatic SSO
3. **Teams in custom claims** = no extra database calls
4. **Template submodule** shares auth logic
5. **Build with SSO from start** = no refactoring

## Testing Checklist

- [ ] Login on intranet.yourdomain.com
- [ ] Navigate to bookkeeping.yourdomain.com
- [ ] Still logged in? ✅ SSO works
- [ ] Team context maintained? ✅ 
- [ ] Logout from either app logs out both? ✅

## Common Pitfalls to Avoid

1. **Different Firebase Projects**: Both apps MUST use the same Firebase project
2. **Missing Authorized Domains**: Add all domains in Firebase Console
3. **Forgetting Persistence**: Set `browserLocalPersistence` explicitly
4. **Complex Team Hierarchies**: Keep it flat - one team per user for now

## Local Development

```bash
# /etc/hosts
127.0.0.1 intranet.local
127.0.0.1 bookkeeping.local

# Run apps
cd Intranet && npm run dev -- --host intranet.local --port 3000
cd BookkeepingBot && npm run dev -- --host bookkeeping.local --port 3001
```

## Future Enhancements (After MVP)

Only add these if actually needed:
- Multiple teams per user (add team switcher)
- Role-based permissions (add to custom claims)
- Audit logging (Cloud Functions)
- Advanced session management

---

**Remember**: You're not building Google. Start simple, enhance based on real user needs.