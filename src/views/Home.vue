<template>
  <div class="p-8">
    <div class="max-w-6xl mx-auto">
      <!-- Welcome Section -->
      <div class="text-center mb-12">
        <h1 class="text-4xl font-bold text-slate-800 mb-4">Multi-App SSO Template</h1>
        <p class="text-xl text-slate-600 max-w-2xl mx-auto">
          A Vue 3 template with Multi-App Single Sign-On (SSO) capabilities. Create multiple independent applications that share seamless authentication and team contexts.
        </p>
      </div>
      
      
      

      <!-- Setup Instructions with Tabs -->
      <div class="bg-white rounded-lg shadow-sm border border-slate-200 mt-8">
        <!-- Tab Header -->
        <div class="border-b border-slate-200">
          <div class="flex">
            <button 
              @click="activeTab = 'first-app'"
              :class="[
                'px-6 py-4 text-sm font-medium border-b-2 transition-colors',
                activeTab === 'first-app' 
                  ? 'border-blue-500 text-blue-600 bg-blue-50' 
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              ]"
            >
              <span class="flex items-center">
                <span class="mr-2 text-lg">🆕</span>
                First SSO App
              </span>
            </button>
            <button 
              @click="activeTab = 'add-app'"
              :class="[
                'px-6 py-4 text-sm font-medium border-b-2 transition-colors',
                activeTab === 'add-app' 
                  ? 'border-green-500 text-green-600 bg-green-50' 
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              ]"
            >
              <span class="flex items-center">
                <span class="mr-2 text-lg">➕</span>
                Add to Network
              </span>
            </button>
            <button 
              @click="activeTab = 'local-dev'"
              :class="[
                'px-6 py-4 text-sm font-medium border-b-2 transition-colors',
                activeTab === 'local-dev' 
                  ? 'border-purple-500 text-purple-600 bg-purple-50' 
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              ]"
            >
              <span class="flex items-center">
                <span class="mr-2 text-lg">🛠️</span>
                Local Development
              </span>
            </button>
          </div>
        </div>

        <!-- Tab Content -->
        <div class="p-8">
          <!-- First App Tab -->
          <div v-if="activeTab === 'first-app'">
            <div class="flex items-center mb-6">
              <div class="bg-blue-500 text-white text-2xl font-bold rounded-full w-12 h-12 flex items-center justify-center mr-4">🆕</div>
              <div>
                <h2 class="text-2xl font-semibold text-slate-800">Setting Up Your FIRST SSO App</h2>
                <p class="text-slate-600 text-sm">This will create the Firebase project that all your apps will share</p>
              </div>
            </div>
        <div class="space-y-8">
          
          <!-- Step 1: Create Repository -->
          <div class="flex items-start space-x-4">
            <div class="bg-blue-500 text-white text-lg font-bold rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">1</div>
            <div>
              <h3 class="font-semibold text-slate-800 mb-2">Create Repository from Template</h3>
              <div class="text-slate-600 text-sm space-y-2">
                <p>1. Go to this repository on GitHub</p>
                <p>2. Click the <span class="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">"Use this template"</span> button</p>
                <p>3. Name your new repository (e.g., <code class="bg-slate-100 px-1 rounded">my-intranet-app</code>, <code class="bg-slate-100 px-1 rounded">my-booking-app</code>)</p>
                <p>4. Clone your new repository locally</p>
              </div>
            </div>
          </div>
          
          <!-- Step 2: Set up Firebase -->
          <div class="flex items-start space-x-4">
            <div class="bg-blue-500 text-white text-lg font-bold rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">2</div>
            <div>
              <h3 class="font-semibold text-slate-800 mb-2">Create New Firebase Project</h3>
              <div class="text-slate-600 text-sm space-y-2">
                <p>1. Go to <a href="https://console.firebase.google.com" class="text-blue-600 hover:underline" target="_blank">console.firebase.google.com</a></p>
                <p>2. Click <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">"Create a project"</span></p>
                <p>3. Name your project (e.g., "My Company SSO")</p>
                <p>4. Enable Google Analytics (optional)</p>
                <p>5. Click <span class="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">"Create project"</span></p>
                <div class="bg-blue-50 border-l-4 border-blue-400 p-3 rounded">
                  💡 <strong>Remember:</strong> All your future apps will use this same Firebase project for SSO.
                </div>
              </div>
            </div>
          </div>
          
          <!-- Step 3: Enable Services -->
          <div class="flex items-start space-x-4">
            <div class="bg-blue-500 text-white text-lg font-bold rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">3</div>
            <div>
              <h3 class="font-semibold text-slate-800 mb-2">Enable Firebase Services</h3>
              <div class="text-slate-600 text-sm space-y-2">
                <p><strong>Enable Authentication:</strong></p>
                <p>1. Go to Authentication → Get started</p>
                <p>2. Sign-in method → Email/Password → Enable → Save</p>
                <p><strong>Create Firestore Database:</strong></p>
                <p>1. Go to Firestore Database → Create database</p>
                <p>2. Start in production mode → Next</p>
                <p>3. Choose location → Done</p>
              </div>
            </div>
          </div>
          
          <!-- Step 4: Configure Environment -->
          <div class="flex items-start space-x-4">
            <div class="bg-blue-500 text-white text-lg font-bold rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">4</div>
            <div>
              <h3 class="font-semibold text-slate-800 mb-2">Configure Environment Variables</h3>
              <div class="text-slate-600 text-sm space-y-2">
                <p>1. Copy <code class="bg-slate-100 px-1 rounded">.env.example</code> to <code class="bg-slate-100 px-1 rounded">.env</code></p>
                <p>2. Get Firebase config from Project Settings → General → Your apps</p>
                <p>3. Fill in your <code class="bg-slate-100 px-1 rounded">.env</code> file:</p>
                <div class="bg-slate-50 p-3 rounded mt-2 font-mono text-xs">
                  <div>VITE_FIREBASE_API_KEY=your-api-key</div>
                  <div>VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com</div>
                  <div>VITE_FIREBASE_PROJECT_ID=your-project-id</div>
                  <div>VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com</div>
                  <div>VITE_FIREBASE_MESSAGING_SENDER_ID=123456789</div>
                  <div>VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456</div>
                  <div class="text-blue-600">VITE_APP_DOMAIN=yourdomain.com</div>
                </div>
                <p class="bg-blue-50 border-l-4 border-blue-400 p-3 rounded">
                  💡 <strong>Save these values:</strong> You'll need the exact same configuration for all future apps in your SSO network.
                </p>
              </div>
            </div>
          </div>
          
          <!-- Step 5: Deploy Firestore Rules -->
          <div class="flex items-start space-x-4">
            <div class="bg-blue-500 text-white text-lg font-bold rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">5</div>
            <div>
              <h3 class="font-semibold text-slate-800 mb-2">Deploy Firestore Security Rules</h3>
              <div class="text-slate-600 text-sm space-y-2">
                <p>1. Install Firebase CLI: <code class="bg-slate-100 px-1 rounded">npm install -g firebase-tools</code></p>
                <p>2. Login: <code class="bg-slate-100 px-1 rounded">firebase login</code></p>
                <p>3. Initialize: <code class="bg-slate-100 px-1 rounded">firebase init firestore</code></p>
                <p>4. Deploy rules: <code class="bg-slate-100 px-1 rounded">firebase deploy --only firestore:rules</code></p>
                <p class="text-xs text-slate-500">The template includes team-based security rules in <code>firestore.rules</code></p>
              </div>
            </div>
          </div>
          
          <!-- Step 6: Deploy App -->
          <div class="flex items-start space-x-4">
            <div class="bg-blue-500 text-white text-lg font-bold rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">6</div>
            <div>
              <h3 class="font-semibold text-slate-800 mb-2">Deploy to Production</h3>
              <div class="text-slate-600 text-sm space-y-2">
                <p><strong>Choose your deployment platform:</strong></p>
                
                <div class="border rounded-lg p-3 mt-2">
                  <p class="font-medium text-slate-700">Option A: Vercel (Recommended)</p>
                  <p>1. Connect your GitHub repo to <a href="https://vercel.com" class="text-blue-600 hover:underline" target="_blank">Vercel</a></p>
                  <p>2. Add environment variables in Vercel dashboard</p>
                  <p>3. Set custom domain (e.g., <code class="bg-slate-100 px-1 rounded">intranet.yourdomain.com</code>)</p>
                  <p class="text-xs text-green-600 mt-1">✅ HTTPS certificates automatically provided</p>
                </div>
                
                <div class="border rounded-lg p-3">
                  <p class="font-medium text-slate-700">Option B: Netlify</p>
                  <p>1. Connect repo to <a href="https://netlify.com" class="text-blue-600 hover:underline" target="_blank">Netlify</a></p>
                  <p>2. Build command: <code class="bg-slate-100 px-1 rounded">npm run build</code></p>
                  <p>3. Publish directory: <code class="bg-slate-100 px-1 rounded">dist</code></p>
                  <p>4. Add environment variables and custom domain</p>
                  <p class="text-xs text-green-600 mt-1">✅ HTTPS certificates automatically provided</p>
                </div>
                
                <div class="border rounded-lg p-3">
                  <p class="font-medium text-slate-700">Option C: Firebase Hosting</p>
                  <p>1. <code class="bg-slate-100 px-1 rounded">firebase init hosting</code></p>
                  <p>2. Build: <code class="bg-slate-100 px-1 rounded">npm run build</code></p>
                  <p>3. Deploy: <code class="bg-slate-100 px-1 rounded">firebase deploy</code></p>
                  <p>4. Configure custom domain in Firebase Console</p>
                  <p class="text-xs text-green-600 mt-1">✅ HTTPS certificates automatically provided</p>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Step 7: Configure Authorized Domains -->
          <div class="flex items-start space-x-4">
            <div class="bg-blue-500 text-white text-lg font-bold rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">7</div>
            <div>
              <h3 class="font-semibold text-slate-800 mb-2">Add Authorized Domains in Firebase</h3>
              <div class="text-slate-600 text-sm space-y-2">
                <p>1. Go to <a href="https://console.firebase.google.com" class="text-blue-600 hover:underline" target="_blank">Firebase Console</a></p>
                <p>2. Select your project → Authentication → Settings → Authorized domains</p>
                <p>3. Add each of your app domains:</p>
                <div class="bg-slate-50 p-3 rounded mt-2 font-mono text-xs space-y-1">
                  <div>• intranet.yourdomain.com</div>
                  <div>• bookkeeping.yourdomain.com</div>
                  <div>• files.yourdomain.com</div>
                  <div>• admin.yourdomain.com</div>
                  <div class="text-slate-500">• localhost (for development)</div>
                </div>
                <p class="bg-red-50 border-l-4 border-red-400 p-3 rounded">
                  🚨 <strong>Critical:</strong> All app domains must be added here or authentication will fail!
                </p>
              </div>
            </div>
          </div>
          
          <!-- Step 8: Test SSO -->
          <div class="flex items-start space-x-4">
            <div class="bg-blue-500 text-white text-lg font-bold rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">8</div>
            <div>
              <h3 class="font-semibold text-slate-800 mb-2">Test Your Multi-App SSO</h3>
              <div class="text-slate-600 text-sm space-y-2">
                <p>1. Open your first app (e.g., <code class="bg-slate-100 px-1 rounded">https://intranet.yourdomain.com</code>)</p>
                <p>2. Login with your credentials</p>
                <p>3. Open your second app (e.g., <code class="bg-slate-100 px-1 rounded">https://bookkeeping.yourdomain.com</code>)</p>
                <p class="bg-green-50 border-l-4 border-green-400 p-3 rounded">
                  🎉 <strong>Success!</strong> You should be automatically logged in without re-entering credentials!
                </p>
                <p>4. Add navigation links between apps using the <code class="bg-slate-100 px-1 rounded">AppSwitcher</code> component</p>
              </div>
            </div>
          </div>
          
            </div>
          </div>

          <!-- Add to Network Tab -->
          <div v-if="activeTab === 'add-app'">
            <div class="flex items-center mb-6">
              <div class="bg-green-500 text-white text-2xl font-bold rounded-full w-12 h-12 flex items-center justify-center mr-4">➕</div>
              <div>
                <h2 class="text-2xl font-semibold text-slate-800">Adding Apps to Your EXISTING SSO Network</h2>
                <p class="text-slate-600 text-sm">Use this process when you already have a Firebase project and want to add another app</p>
              </div>
            </div>
        <div class="space-y-8">
          
          <!-- Prerequisites -->
          <div class="bg-amber-50 border-l-4 border-amber-400 p-4 rounded">
            <h3 class="font-semibold text-amber-800 mb-2">📋 Prerequisites</h3>
            <div class="text-amber-700 text-sm space-y-1">
              <p>• You already have a Firebase project from your first app</p>
              <p>• You have the Firebase configuration values saved</p>
              <p>• Your first app is working with authentication</p>
            </div>
          </div>

          <!-- Step 1: Create Repository -->
          <div class="flex items-start space-x-4">
            <div class="bg-green-500 text-white text-lg font-bold rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">1</div>
            <div>
              <h3 class="font-semibold text-slate-800 mb-2">Create Repository from Template</h3>
              <div class="text-slate-600 text-sm space-y-2">
                <p>1. Go to this repository on GitHub</p>
                <p>2. Click the <span class="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">"Use this template"</span> button</p>
                <p>3. Name your new app repository (e.g., <code class="bg-slate-100 px-1 rounded">my-bookkeeping-app</code>, <code class="bg-slate-100 px-1 rounded">my-files-app</code>)</p>
                <p>4. Clone your new repository locally</p>
                <p>5. Run <code class="bg-slate-100 px-1 rounded">npm install</code></p>
              </div>
            </div>
          </div>

          <!-- Step 2: Use Existing Firebase Project -->
          <div class="flex items-start space-x-4">
            <div class="bg-green-500 text-white text-lg font-bold rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">2</div>
            <div>
              <h3 class="font-semibold text-slate-800 mb-2">Configure with Existing Firebase Project</h3>
              <div class="text-slate-600 text-sm space-y-2">
                <p>1. Copy <code class="bg-slate-100 px-1 rounded">.env.example</code> to <code class="bg-slate-100 px-1 rounded">.env</code></p>
                <p>2. Use the <strong>EXACT SAME</strong> Firebase configuration from your first app:</p>
                <div class="bg-slate-50 p-3 rounded mt-2 font-mono text-xs">
                  <div>VITE_FIREBASE_API_KEY=your-same-api-key</div>
                  <div>VITE_FIREBASE_AUTH_DOMAIN=your-same-project.firebaseapp.com</div>
                  <div>VITE_FIREBASE_PROJECT_ID=your-same-project-id</div>
                  <div>VITE_FIREBASE_STORAGE_BUCKET=your-same-project.appspot.com</div>
                  <div>VITE_FIREBASE_MESSAGING_SENDER_ID=same-123456789</div>
                  <div>VITE_FIREBASE_APP_ID=same-1:123456789:web:abcdef123456</div>
                  <div class="text-blue-600">VITE_APP_DOMAIN=yourdomain.com</div>
                </div>
                <div class="bg-red-50 border-l-4 border-red-400 p-3 rounded">
                  🚨 <strong>Critical:</strong> The Firebase configuration must be <strong>identical</strong> to your first app. Different values = no SSO!
                </div>
              </div>
            </div>
          </div>

          <!-- Step 3: Deploy New App -->
          <div class="flex items-start space-x-4">
            <div class="bg-green-500 text-white text-lg font-bold rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">3</div>
            <div>
              <h3 class="font-semibold text-slate-800 mb-2">Deploy Your New App</h3>
              <div class="text-slate-600 text-sm space-y-2">
                <p>1. Test locally: <code class="bg-slate-100 px-1 rounded">npm run dev</code></p>
                <p>2. Build: <code class="bg-slate-100 px-1 rounded">npm run build</code></p>
                <p>3. Deploy to a <strong>different subdomain</strong>:</p>
                <div class="bg-slate-50 p-3 rounded mt-2 font-mono text-xs space-y-1">
                  <div class="text-green-600">• app1.yourdomain.com (existing first app)</div>
                  <div class="text-blue-600">• app2.yourdomain.com (this new app)</div>
                  <div class="text-purple-600">• app3.yourdomain.com (future apps)</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Step 4: Update Firebase Authorized Domains -->
          <div class="flex items-start space-x-4">
            <div class="bg-green-500 text-white text-lg font-bold rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">4</div>
            <div>
              <h3 class="font-semibold text-slate-800 mb-2">Add New Domain to Firebase</h3>
              <div class="text-slate-600 text-sm space-y-2">
                <p>1. Go to <a href="https://console.firebase.google.com" class="text-blue-600 hover:underline" target="_blank">Firebase Console</a></p>
                <p>2. Select your existing project → Authentication → Settings → Authorized domains</p>
                <p>3. Click <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">"Add domain"</span></p>
                <p>4. Add your new app's domain (e.g., <code class="bg-slate-100 px-1 rounded">app2.yourdomain.com</code>)</p>
                <div class="bg-blue-50 border-l-4 border-blue-400 p-3 rounded">
                  💡 Your authorized domains list should look like:
                  <div class="mt-2 font-mono text-xs">
                    <div>• app1.yourdomain.com</div>
                    <div>• app2.yourdomain.com</div>
                    <div>• localhost</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Step 5: Test SSO -->
          <div class="flex items-start space-x-4">
            <div class="bg-green-500 text-white text-lg font-bold rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">5</div>
            <div>
              <h3 class="font-semibold text-slate-800 mb-2">Test Your SSO Connection</h3>
              <div class="text-slate-600 text-sm space-y-2">
                <p>1. Make sure you're logged out of all apps</p>
                <p>2. Go to your first app and login</p>
                <p>3. Navigate to your new app's URL</p>
                <p class="bg-green-50 border-l-4 border-green-400 p-3 rounded">
                  🎉 <strong>Success!</strong> You should be automatically logged in without re-entering credentials!
                </p>
                <p><strong>If SSO isn't working:</strong></p>
                <ul class="ml-4 text-xs space-y-1">
                  <li>• Double-check Firebase configuration is identical</li>
                  <li>• Verify domain is added to authorized domains</li>
                  <li>• Clear browser cache and cookies</li>
                  <li>• Check browser console for errors</li>
                </ul>
              </div>
            </div>
          </div>

          <!-- Step 6: Add Navigation -->
          <div class="flex items-start space-x-4">
            <div class="bg-green-500 text-white text-lg font-bold rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">6</div>
            <div>
              <h3 class="font-semibold text-slate-800 mb-2">Connect Apps with Navigation</h3>
              <div class="text-slate-600 text-sm space-y-2">
                <p>1. Update the <code class="bg-slate-100 px-1 rounded">AppSwitcher.vue</code> component in both apps</p>
                <p>2. Add entries for both apps in the <code class="bg-slate-100 px-1 rounded">availableApps</code> array</p>
                <p>3. Users can now seamlessly navigate between apps using the app switcher</p>
                <div class="bg-green-50 border-l-4 border-green-400 p-3 rounded">
                  🎯 <strong>Pro tip:</strong> Consider creating a shared component library for consistent navigation across all apps.
                </div>
              </div>
            </div>
          </div>

            </div>
          </div>

          <!-- Local Development Tab -->
          <div v-if="activeTab === 'local-dev'">
            <div class="flex items-center mb-6">
              <div class="bg-purple-500 text-white text-2xl font-bold rounded-full w-12 h-12 flex items-center justify-center mr-4">🛠️</div>
              <div>
                <h2 class="text-2xl font-semibold text-slate-800">Local Development Setup</h2>
                <p class="text-slate-600 text-sm">Configure your development environment to test multiple SSO apps locally</p>
              </div>
            </div>

            <div class="space-y-8">
              
              <!-- Step 1: Hosts File Configuration -->
              <div class="flex items-start space-x-4">
                <div class="bg-purple-500 text-white text-lg font-bold rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">1</div>
                <div>
                  <h3 class="font-semibold text-slate-800 mb-2">Configure Hosts File</h3>
                  <div class="text-slate-600 text-sm space-y-2">
                    <p><strong>Windows:</strong> Edit <code class="bg-slate-100 px-1 rounded">C:\Windows\System32\drivers\etc\hosts</code> (as Administrator)</p>
                    <p><strong>macOS/Linux:</strong> Edit <code class="bg-slate-100 px-1 rounded">/etc/hosts</code> (with sudo)</p>
                    <p>Add these lines:</p>
                    <div class="bg-slate-50 p-3 rounded mt-2 font-mono text-xs space-y-1">
                      <div>127.0.0.1 intranet.localhost</div>
                      <div>127.0.0.1 bookkeeping.localhost</div>
                      <div>127.0.0.1 files.localhost</div>
                      <div>127.0.0.1 admin.localhost</div>
                    </div>
                    <div class="bg-blue-50 border-l-4 border-blue-400 p-3 rounded">
                      💡 <strong>Tip:</strong> You may need to restart your browser after editing the hosts file.
                    </div>
                  </div>
                </div>
              </div>

              <!-- Step 2: Environment Setup -->
              <div class="flex items-start space-x-4">
                <div class="bg-purple-500 text-white text-lg font-bold rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">2</div>
                <div>
                  <h3 class="font-semibold text-slate-800 mb-2">Set Up Multiple App Directories</h3>
                  <div class="text-slate-600 text-sm space-y-2">
                    <p>Create separate directories for each app you want to test:</p>
                    <div class="bg-slate-50 p-3 rounded mt-2 font-mono text-xs space-y-1">
                      <div>mkdir my-apps</div>
                      <div>cd my-apps</div>
                      <div>git clone &lt;intranet-repo&gt; intranet-app</div>
                      <div>git clone &lt;bookkeeping-repo&gt; bookkeeping-app</div>
                      <div>git clone &lt;files-repo&gt; files-app</div>
                    </div>
                    <p>Each directory should have identical <code class="bg-slate-100 px-1 rounded">.env</code> files with the same Firebase configuration.</p>
                  </div>
                </div>
              </div>

              <!-- Step 3: Start Development Servers -->
              <div class="flex items-start space-x-4">
                <div class="bg-purple-500 text-white text-lg font-bold rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">3</div>
                <div>
                  <h3 class="font-semibold text-slate-800 mb-2">Start Development Servers</h3>
                  <div class="text-slate-600 text-sm space-y-2">
                    <p>Open separate terminals for each app:</p>
                    <div class="grid md:grid-cols-3 gap-4 mt-3">
                      <div class="border rounded p-3">
                        <p class="font-medium text-slate-700 mb-2">Terminal 1 - Intranet</p>
                        <div class="bg-slate-50 p-2 rounded font-mono text-xs">
                          <div>cd intranet-app</div>
                          <div>npm run dev:intranet</div>
                        </div>
                        <p class="text-xs text-slate-500 mt-1">Runs on intranet.localhost:3000</p>
                      </div>
                      <div class="border rounded p-3">
                        <p class="font-medium text-slate-700 mb-2">Terminal 2 - Bookkeeping</p>
                        <div class="bg-slate-50 p-2 rounded font-mono text-xs">
                          <div>cd bookkeeping-app</div>
                          <div>npm run dev:bookkeeping</div>
                        </div>
                        <p class="text-xs text-slate-500 mt-1">Runs on bookkeeping.localhost:3001</p>
                      </div>
                      <div class="border rounded p-3">
                        <p class="font-medium text-slate-700 mb-2">Terminal 3 - Files</p>
                        <div class="bg-slate-50 p-2 rounded font-mono text-xs">
                          <div>cd files-app</div>
                          <div>npm run dev:files</div>
                        </div>
                        <p class="text-xs text-slate-500 mt-1">Runs on files.localhost:3002</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Step 4: Firebase Configuration -->
              <div class="flex items-start space-x-4">
                <div class="bg-purple-500 text-white text-lg font-bold rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">4</div>
                <div>
                  <h3 class="font-semibold text-slate-800 mb-2">Update Firebase Authorized Domains</h3>
                  <div class="text-slate-600 text-sm space-y-2">
                    <p>Add local development domains to Firebase Console:</p>
                    <p>1. Go to Firebase Console → Authentication → Settings → Authorized domains</p>
                    <p>2. Add these domains:</p>
                    <div class="bg-slate-50 p-3 rounded mt-2 font-mono text-xs space-y-1">
                      <div>• intranet.localhost</div>
                      <div>• bookkeeping.localhost</div>
                      <div>• files.localhost</div>
                      <div>• admin.localhost</div>
                      <div class="text-slate-500">• localhost (fallback)</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Step 5: Test SSO Locally -->
              <div class="flex items-start space-x-4">
                <div class="bg-purple-500 text-white text-lg font-bold rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">5</div>
                <div>
                  <h3 class="font-semibold text-slate-800 mb-2">Test Local SSO</h3>
                  <div class="text-slate-600 text-sm space-y-2">
                    <p>1. Navigate to <code class="bg-slate-100 px-1 rounded">http://intranet.localhost:3000</code></p>
                    <p>2. Login with your credentials</p>
                    <p>3. Open a new tab and go to <code class="bg-slate-100 px-1 rounded">http://bookkeeping.localhost:3001</code></p>
                    <p class="bg-green-50 border-l-4 border-green-400 p-3 rounded">
                      🎉 <strong>Success!</strong> You should be automatically logged in!
                    </p>
                    <p><strong>Troubleshooting:</strong></p>
                    <ul class="ml-4 text-xs space-y-1">
                      <li>• Clear browser cache and cookies</li>
                      <li>• Check that hosts file was saved correctly</li>
                      <li>• Verify all apps have identical Firebase configuration</li>
                      <li>• Check browser console for CORS or network errors</li>
                      <li>• Restart browser after hosts file changes</li>
                    </ul>
                  </div>
                </div>
              </div>

              <!-- Step 6: Development Tips -->
              <div class="flex items-start space-x-4">
                <div class="bg-purple-500 text-white text-lg font-bold rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">6</div>
                <div>
                  <h3 class="font-semibold text-slate-800 mb-2">Development Tips</h3>
                  <div class="text-slate-600 text-sm space-y-2">
                    <div class="grid md:grid-cols-2 gap-4">
                      <div class="bg-blue-50 p-3 rounded">
                        <p class="font-medium text-blue-800 mb-2">🚀 Hot Reloading</p>
                        <p class="text-blue-700 text-xs">All apps support hot reloading. Changes will appear instantly without losing authentication state.</p>
                      </div>
                      <div class="bg-green-50 p-3 rounded">
                        <p class="font-medium text-green-800 mb-2">🔄 Shared State</p>
                        <p class="text-green-700 text-xs">Authentication and team context are shared. Login changes reflect across all running apps.</p>
                      </div>
                      <div class="bg-yellow-50 p-3 rounded">
                        <p class="font-medium text-yellow-800 mb-2">🐛 Debugging</p>
                        <p class="text-yellow-700 text-xs">Use browser dev tools to inspect Firebase auth tokens and localStorage across domains.</p>
                      </div>
                      <div class="bg-purple-50 p-3 rounded">
                        <p class="font-medium text-purple-800 mb-2">⚡ Performance</p>
                        <p class="text-purple-700 text-xs">Run only the apps you're actively developing to save system resources.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

// Component configuration
defineOptions({
  name: 'HomeView'
})

// Tab state management
const activeTab = ref('first-app')
</script>

<style>
/* HomeView component styles */
</style>