# Vue 3 Multi-App SSO Template

This is a Vue 3 template with Firebase Authentication designed for Multi-App SSO (Single Sign-On). Use this template to create multiple applications that share authentication seamlessly.

## 🚀 Quick Start

### 1. Create New Repository
1. Click "Use this template" on GitHub
2. Name your new repository (e.g., `my-intranet-app`)
3. Clone your new repository locally

### 2. Firebase Setup
1. Create a new Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Authentication and Firestore
3. Add your domains to Firebase Auth authorized domains:
   - `localhost:3000`, `localhost:3001` (for development)
   - `yourapp.yourdomain.com` (for production)

### 3. Environment Configuration
1. Copy `.env.example` to `.env`
2. Fill in your Firebase configuration values
3. Set `VITE_APP_DOMAIN` to your base domain

```env
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456
VITE_APP_DOMAIN=yourdomain.com
```

### 4. Install and Run
```bash
npm install
npm run dev
```

## 🏗️ Multi-App SSO Setup

### For Multiple Apps
1. Use this template for each app you want to create
2. **Important**: Use the **same Firebase project** for all apps
3. Each app should have the same `.env` configuration
4. Deploy each app to its own subdomain:
   - `intranet.yourdomain.com`
   - `bookkeeping.yourdomain.com` 
   - `files.yourdomain.com`

### Local Development
Add to your hosts file (`/etc/hosts` on Mac/Linux, `C:\Windows\System32\drivers\etc\hosts` on Windows):
```
127.0.0.1 intranet.localhost
127.0.0.1 bookkeeping.localhost
127.0.0.1 files.localhost
```

Run multiple apps locally:
```bash
# App 1 (Intranet)
npm run dev -- --host intranet.localhost --port 3000

# App 2 (Bookkeeping)
npm run dev -- --host bookkeeping.localhost --port 3001
```

## 📁 Project Structure

```
src/
├── components/
│   ├── AppSwitcher.vue     # Navigation between apps
│   └── ...
├── stores/
│   ├── auth.js             # Authentication with SSO support
│   └── team.js             # Team management
├── services/
│   ├── authService.js      # Auth operations
│   ├── teamService.js      # Team operations
│   └── userService.js      # User data management
└── views/                  # Page components
```

## 🔐 Authentication Features

- **Cross-Domain SSO**: Login once, access all apps
- **Team Support**: Multi-tenant architecture
- **Role-Based Access**: Admin/user roles
- **State Management**: Robust Pinia stores
- **Security Rules**: Team-based Firestore access

## 🧪 Testing SSO

1. Login to your first app (e.g., `intranet.localhost:3000`)
2. Navigate to second app (e.g., `bookkeeping.localhost:3001`)
3. Verify you remain authenticated without re-login

## 🔧 Customization

### Adding New Apps
1. Create new repository from this template
2. Update `AppSwitcher.vue` to include your new app
3. Deploy to new subdomain
4. Ensure same Firebase project configuration

### Team Management
- Use `TeamService` to create/manage teams
- Teams provide data isolation between organizations
- Update custom claims for optimal performance

## 📚 Documentation

- [Authentication System](./docs/authentication.md)
- [Multi-App SSO Roadmap](./docs/plans/Multi-App-SSO/simplified-sso-roadmap.md)
- [Design Guidelines](./docs/design-guidelines.md)

## 🚨 Important Notes

1. **Same Firebase Project**: All apps MUST use the same Firebase project
2. **Authorized Domains**: Add all app domains to Firebase Console
3. **Environment Variables**: Use identical Firebase config across all apps
4. **Security Rules**: Deploy the included `firestore.rules` to your Firebase project

## 🆘 Troubleshooting

### SSO Not Working
- Verify all apps use the same Firebase project
- Check Firebase authorized domains include all your app domains
- Ensure `VITE_APP_DOMAIN` matches your actual domain

### Authentication Issues
- Check browser console for Firebase errors
- Verify environment variables are properly loaded
- Test with Firebase Auth emulator for development

## 📄 License

This template is open source and available under the MIT License.