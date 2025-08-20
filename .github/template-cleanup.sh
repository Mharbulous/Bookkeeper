#!/bin/bash

# Template cleanup script
# This script runs automatically when someone creates a new repository from this template

echo "🚀 Setting up your new Vue 3 Multi-App SSO project..."

# Remove template-specific files
echo "📁 Cleaning up template files..."
rm -rf .github/template/
rm -f .github/template-cleanup.sh
rm -f test-sso.html

# Create fresh git history
echo "📝 Initializing fresh git history..."
rm -rf .git
git init
git add .
git commit -m "Initial commit - Vue 3 Multi-App SSO Template

🔐 Features implemented:
- Firebase Authentication with cross-domain SSO
- Team-based multi-tenant architecture  
- Pinia stores for state management
- App switcher component for navigation
- Firestore security rules for team isolation
- Complete development and deployment setup

Ready for Multi-App SSO deployment! 🎉"

echo "✅ Template setup complete!"
echo ""
echo "🔧 Next steps:"
echo "1. Copy .env.example to .env and configure Firebase"
echo "2. Run 'npm install' to install dependencies"
echo "3. Run 'npm run dev' to start development server"
echo "4. See .github/template/README.md for full setup instructions"
echo ""
echo "🌟 Happy coding!"