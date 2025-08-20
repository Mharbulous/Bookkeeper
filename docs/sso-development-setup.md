# Multi-App SSO Development Setup Guide

This guide provides step-by-step instructions for setting up local development environment for Multi-App SSO testing.

## 🚀 Quick Setup (5 minutes)

### 1. Host File Configuration

**Windows** (`C:\Windows\System32\drivers\etc\hosts`):
```
127.0.0.1 intranet.localhost
127.0.0.1 bookkeeping.localhost
127.0.0.1 files.localhost
127.0.0.1 admin.localhost
```

**macOS/Linux** (`/etc/hosts`):
```bash
sudo nano /etc/hosts
# Add these lines:
127.0.0.1 intranet.localhost
127.0.0.1 bookkeeping.localhost
127.0.0.1 files.localhost
127.0.0.1 admin.localhost
```

### 2. Environment Configuration

Create `.env` from `.env.example`:
```bash
cp .env.example .env
```

Update `.env` with your Firebase configuration:
```env
# Firebase Configuration (same for all apps)
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456

# Multi-App SSO Configuration
VITE_APP_DOMAIN=localhost:3000
```

### 3. Firebase Console Setup

Add domains to Firebase Console → Authentication → Settings → Authorized domains:
- `intranet.localhost`
- `bookkeeping.localhost`
- `files.localhost`
- `admin.localhost`
- `localhost` (for fallback)

### 4. Start Development Servers

**Terminal 1 - Intranet App:**
```bash
npm run dev -- --host intranet.localhost --port 3000
```

**Terminal 2 - Bookkeeping App:**
```bash
npm run dev -- --host bookkeeping.localhost --port 3001
```

**Terminal 3 - Files App (optional):**
```bash
npm run dev -- --host files.localhost --port 3002
```

## 🧪 Testing SSO

### Basic SSO Test
1. Navigate to `http://intranet.localhost:3000`
2. Login with your credentials
3. Navigate to `http://bookkeeping.localhost:3001`
4. **Expected**: You should remain logged in without re-authentication

### Team Context Test
1. After logging in, check browser console for team loading messages
2. Use AppSwitcher component to navigate between apps
3. Verify team context is maintained across apps

### Logout Test
1. Logout from any app
2. Navigate to other apps
3. **Expected**: All apps should show as logged out

## 🔧 Advanced Setup

### Multiple Firebase Projects (Testing)

For testing isolation between different Firebase projects:

**App 1 (.env.local1):**
```env
VITE_FIREBASE_PROJECT_ID=project-1
VITE_APP_DOMAIN=localhost:3000
```

**App 2 (.env.local2):**
```env
VITE_FIREBASE_PROJECT_ID=project-2
VITE_APP_DOMAIN=localhost:3001
```

**Expected**: Apps with different Firebase projects should NOT share authentication.

### Production-Like Setup

Use production domains locally:

**hosts file:**
```
127.0.0.1 intranet.yourdomain.com
127.0.0.1 bookkeeping.yourdomain.com
```

**Update .env:**
```env
VITE_APP_DOMAIN=yourdomain.com
```

**Run with HTTPS (optional):**
```bash
npm run dev -- --host intranet.yourdomain.com --port 443 --https
```

## 📋 Development Scripts

Create convenient npm scripts in `package.json`:

```json
{
  "scripts": {
    "dev:intranet": "npm run dev -- --host intranet.localhost --port 3000",
    "dev:bookkeeping": "npm run dev -- --host bookkeeping.localhost --port 3001",
    "dev:files": "npm run dev -- --host files.localhost --port 3002",
    "dev:all": "concurrently \"npm run dev:intranet\" \"npm run dev:bookkeeping\" \"npm run dev:files\""
  }
}
```

**Install concurrently for parallel execution:**
```bash
npm install --save-dev concurrently
```

## 🐛 Common Issues

### Issue: "localhost refused to connect"
**Solution**: Check host file entries and restart browser

### Issue: Authentication not persisting across apps
**Checklist**:
- [ ] Same Firebase project ID in all apps
- [ ] All domains added to Firebase Console authorized domains
- [ ] `VITE_APP_DOMAIN` matches your setup
- [ ] Browser not blocking cookies/localStorage

### Issue: Team context not loading
**Debug steps**:
1. Check browser console for team loading errors
2. Verify Firestore security rules are deployed
3. Check if user has `teamId` in Firestore user document

### Issue: Vite dev server CORS errors
**Solution**: Add to `vite.config.js`:
```javascript
export default defineConfig({
  server: {
    cors: true,
    host: true
  }
})
```

## 🔍 Debugging Tools

### Browser DevTools Checklist
1. **Console**: Check for Firebase/auth errors
2. **Network**: Verify Firebase API calls succeed
3. **Application → Storage**: Check localStorage/sessionStorage for auth tokens
4. **Application → Cookies**: Verify Firebase cookies are set

### Useful Console Commands
```javascript
// Check current auth state
console.log('Auth state:', useAuthStore().authState)
console.log('User:', useAuthStore().user)
console.log('Team ID:', useAuthStore().teamId)

// Check team store
console.log('Team store:', useTeamStore())

// Firebase auth debug
console.log('Firebase user:', firebase.auth().currentUser)
```

## 📦 Docker Setup (Optional)

For containerized development:

**docker-compose.yml:**
```yaml
version: '3.8'
services:
  intranet:
    build: .
    ports:
      - "3000:3000"
    environment:
      - VITE_APP_DOMAIN=docker.localhost
    extra_hosts:
      - "intranet.docker.localhost:127.0.0.1"
  
  bookkeeping:
    build: .
    ports:
      - "3001:3001"
    environment:
      - VITE_APP_DOMAIN=docker.localhost
    extra_hosts:
      - "bookkeeping.docker.localhost:127.0.0.1"
```

## 🚀 Next Steps

After local development is working:
1. [Deploy to Production](./sso-deployment-guide.md)
2. [Set up CI/CD Pipeline](./sso-cicd-guide.md)
3. [Configure Team Management](./team-management-guide.md)

## 💡 Tips

1. **Use different browser profiles** for testing multiple user scenarios
2. **Clear browser data** between tests to ensure clean state
3. **Monitor Firebase Console** → Authentication → Users for auth events
4. **Use Firebase Emulator Suite** for offline development (advanced)

## 📞 Support

If you encounter issues:
1. Check the [Troubleshooting Guide](../authentication.md#troubleshooting)
2. Review Firebase Console for configuration issues
3. Open an issue with detailed error logs and setup information