/**
 * End-to-End Testing Framework for Multi-App SSO
 * 
 * This test suite validates cross-domain authentication functionality
 * Run with: npm run test:sso
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { chromium } from 'playwright'

const SSO_CONFIG = {
  apps: [
    { name: 'intranet', url: 'http://intranet.localhost:3000' },
    { name: 'bookkeeping', url: 'http://bookkeeping.localhost:3001' },
    { name: 'files', url: 'http://files.localhost:3002' }
  ],
  testUser: {
    email: 'test@example.com',
    password: 'testpassword123'
  }
}

describe('Multi-App SSO End-to-End Tests', () => {
  let browser
  let context
  let page

  beforeAll(async () => {
    // Launch browser with permissive settings for local development
    browser = await chromium.launch({
      headless: false, // Set to true for CI
      args: [
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    })
  })

  afterAll(async () => {
    await browser.close()
  })

  beforeEach(async () => {
    // Create new browser context for each test (isolated cookies/storage)
    context = await browser.newContext({
      ignoreHTTPSErrors: true
    })
    page = await context.newPage()
  })

  describe('Cross-Domain Authentication Flow', () => {
    it('should login on one app and remain authenticated on other apps', async () => {
      // Step 1: Navigate to first app and login
      await page.goto(SSO_CONFIG.apps[0].url)
      
      // Wait for app to load
      await page.waitForSelector('[data-testid="login-form"]', { timeout: 10000 })
      
      // Perform login
      await page.fill('[data-testid="email-input"]', SSO_CONFIG.testUser.email)
      await page.fill('[data-testid="password-input"]', SSO_CONFIG.testUser.password)
      await page.click('[data-testid="login-button"]')
      
      // Wait for successful login
      await page.waitForSelector('[data-testid="user-menu"]', { timeout: 15000 })
      
      // Verify login success on first app
      const userMenu = await page.textContent('[data-testid="user-display-name"]')
      expect(userMenu).toContain(SSO_CONFIG.testUser.email.split('@')[0])
      
      // Step 2: Navigate to second app
      await page.goto(SSO_CONFIG.apps[1].url)
      
      // Should be automatically authenticated
      await page.waitForSelector('[data-testid="user-menu"]', { timeout: 15000 })
      
      // Verify authentication persisted
      const secondAppUser = await page.textContent('[data-testid="user-display-name"]')
      expect(secondAppUser).toContain(SSO_CONFIG.testUser.email.split('@')[0])
      
      // Step 3: Test third app
      await page.goto(SSO_CONFIG.apps[2].url)
      
      // Should still be authenticated
      await page.waitForSelector('[data-testid="user-menu"]', { timeout: 15000 })
      
      const thirdAppUser = await page.textContent('[data-testid="user-display-name"]')
      expect(thirdAppUser).toContain(SSO_CONFIG.testUser.email.split('@')[0])
    }, 60000) // 60 second timeout for full flow

    it('should logout from one app and be logged out of all apps', async () => {
      // First login (reuse logic from previous test)
      await page.goto(SSO_CONFIG.apps[0].url)
      await page.waitForSelector('[data-testid="login-form"]', { timeout: 10000 })
      await page.fill('[data-testid="email-input"]', SSO_CONFIG.testUser.email)
      await page.fill('[data-testid="password-input"]', SSO_CONFIG.testUser.password)
      await page.click('[data-testid="login-button"]')
      await page.waitForSelector('[data-testid="user-menu"]', { timeout: 15000 })
      
      // Navigate to second app and verify authentication
      await page.goto(SSO_CONFIG.apps[1].url)
      await page.waitForSelector('[data-testid="user-menu"]', { timeout: 15000 })
      
      // Logout from second app
      await page.click('[data-testid="user-menu"]')
      await page.click('[data-testid="logout-button"]')
      
      // Should be redirected to login page
      await page.waitForSelector('[data-testid="login-form"]', { timeout: 10000 })
      
      // Navigate back to first app
      await page.goto(SSO_CONFIG.apps[0].url)
      
      // Should also be logged out
      await page.waitForSelector('[data-testid="login-form"]', { timeout: 10000 })
      
      // Verify no authenticated user state
      const loginForm = await page.isVisible('[data-testid="login-form"]')
      expect(loginForm).toBe(true)
    }, 45000)
  })

  describe('Team Context Preservation', () => {
    it('should maintain team context across apps', async () => {
      // Login and verify team context
      await page.goto(SSO_CONFIG.apps[0].url)
      await page.waitForSelector('[data-testid="login-form"]', { timeout: 10000 })
      await page.fill('[data-testid="email-input"]', SSO_CONFIG.testUser.email)
      await page.fill('[data-testid="password-input"]', SSO_CONFIG.testUser.password)
      await page.click('[data-testid="login-button"]')
      await page.waitForSelector('[data-testid="user-menu"]', { timeout: 15000 })
      
      // Wait for team context to load
      await page.waitForSelector('[data-testid="team-context"]', { timeout: 10000 })
      
      const teamInfo1 = await page.textContent('[data-testid="team-context"]')
      
      // Navigate to second app
      await page.goto(SSO_CONFIG.apps[1].url)
      await page.waitForSelector('[data-testid="team-context"]', { timeout: 10000 })
      
      const teamInfo2 = await page.textContent('[data-testid="team-context"]')
      
      // Team context should be identical
      expect(teamInfo1).toBe(teamInfo2)
    }, 45000)
  })

  describe('App Switcher Navigation', () => {
    it('should navigate between apps using AppSwitcher component', async () => {
      // Login to first app
      await page.goto(SSO_CONFIG.apps[0].url)
      await page.waitForSelector('[data-testid="login-form"]', { timeout: 10000 })
      await page.fill('[data-testid="email-input"]', SSO_CONFIG.testUser.email)
      await page.fill('[data-testid="password-input"]', SSO_CONFIG.testUser.password)
      await page.click('[data-testid="login-button"]')
      await page.waitForSelector('[data-testid="user-menu"]', { timeout: 15000 })
      
      // Open app switcher
      await page.click('[data-testid="app-switcher-trigger"]')
      await page.waitForSelector('[data-testid="app-switcher-menu"]')
      
      // Click on second app
      await page.click('[data-testid="app-link-bookkeeping"]')
      
      // Should navigate to second app
      await page.waitForURL('**/bookkeeping.localhost:3001/**')
      
      // Should remain authenticated
      await page.waitForSelector('[data-testid="user-menu"]', { timeout: 15000 })
      
      const currentUrl = page.url()
      expect(currentUrl).toContain('bookkeeping.localhost')
    }, 45000)
  })

  describe('Error Handling', () => {
    it('should handle Firebase configuration errors gracefully', async () => {
      // This test would require a separate build with invalid Firebase config
      // For now, we'll test error handling through console errors
      
      const consoleErrors = []
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text())
        }
      })
      
      await page.goto(SSO_CONFIG.apps[0].url)
      
      // Wait for potential initialization errors
      await page.waitForTimeout(5000)
      
      // Should not have critical Firebase initialization errors
      const criticalErrors = consoleErrors.filter(error => 
        error.includes('Firebase') && 
        (error.includes('configuration') || error.includes('initialization'))
      )
      
      expect(criticalErrors.length).toBe(0)
    })

    it('should handle network failures gracefully', async () => {
      // Simulate network issues
      await page.route('**/*firebase*', route => route.abort())
      
      await page.goto(SSO_CONFIG.apps[0].url)
      
      // Should show error state or fallback UI
      await page.waitForSelector('[data-testid="error-boundary"]', { timeout: 10000 })
      
      const errorMessage = await page.textContent('[data-testid="error-message"]')
      expect(errorMessage).toBeTruthy()
    })
  })
})

// Utility test for validating test environment setup
describe('Test Environment Validation', () => {
  it('should validate all test domains are accessible', async () => {
    const browser = await chromium.launch()
    const context = await browser.newContext()
    const page = await context.newPage()
    
    for (const app of SSO_CONFIG.apps) {
      try {
        const response = await page.goto(app.url, { timeout: 10000 })
        expect(response.status()).toBeLessThan(400)
        console.log(`✅ ${app.name} (${app.url}) is accessible`)
      } catch (error) {
        console.error(`❌ ${app.name} (${app.url}) failed: ${error.message}`)
        throw error
      }
    }
    
    await browser.close()
  })

  it('should validate hosts file configuration', async () => {
    const browser = await chromium.launch()
    const context = await browser.newContext()
    const page = await context.newPage()
    
    // Test that subdomains resolve correctly
    const testDomains = [
      'http://intranet.localhost:3000',
      'http://bookkeeping.localhost:3001'
    ]
    
    for (const domain of testDomains) {
      await page.goto(domain)
      const url = page.url()
      expect(url).toContain('localhost')
      console.log(`✅ Domain ${domain} resolves correctly`)
    }
    
    await browser.close()
  })
})