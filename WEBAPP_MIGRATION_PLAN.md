# MealPlan Web App Migration Plan (Option A - Budget)

## Overview

**Goal:** Deploy MealPlan as a web application accessible from anywhere
**Budget:** $5-15/month
**Timeline:** ~32-47 hours of development
**Target Stack:**
- **Frontend:** Vercel (free tier)
- **Backend:** Railway.app ($5-7/month)
- **Database:** Supabase PostgreSQL (free tier - 500MB)
- **Puppeteer:** Runs on Railway (Linux - no freeze issues!)

---

## Phase 1: Database Migration (SQLite → PostgreSQL)
**Estimated Time:** 4-6 hours

### 1.1 Update Prisma Schema
- [ ] Change provider from `sqlite` to `postgresql`
- [ ] Update any SQLite-specific syntax
- [ ] Add proper DateTime handling (SQLite uses strings)

### 1.2 Set Up Local PostgreSQL for Development
- [ ] Install Docker Desktop (if not installed)
- [ ] Create docker-compose.yml for local PostgreSQL
- [ ] Test connection locally

### 1.3 Migrate Existing Data
- [ ] Export current SQLite data to JSON
- [ ] Create migration script to import into PostgreSQL
- [ ] Verify all data migrated correctly

### Files to Modify:
- `packages/backend/prisma/schema.prisma`
- `packages/backend/.env`
- New: `docker-compose.yml`
- New: `scripts/migrate-data.ts`

---

## Phase 2: User Authentication
**Estimated Time:** 8-12 hours

### 2.1 Database Schema Updates
- [ ] Add User model with email, passwordHash, name, createdAt
- [ ] Add Session model for JWT refresh tokens (optional)
- [ ] Add userId foreign key to: Recipe, MealPlan, ShoppingList, CookingPlan

### 2.2 Backend Authentication
- [ ] Install dependencies: bcrypt, jsonwebtoken
- [ ] Create auth controller: register, login, logout, me
- [ ] Create auth middleware to protect routes
- [ ] Update all controllers to filter by userId

### 2.3 Frontend Authentication
- [ ] Create AuthContext for global auth state
- [ ] Create Login page
- [ ] Create Register page
- [ ] Add ProtectedRoute component
- [ ] Update Navigation with user info / logout
- [ ] Store JWT in localStorage or httpOnly cookie

### Files to Create:
- `packages/backend/src/controllers/auth.controller.ts`
- `packages/backend/src/middleware/auth.ts`
- `packages/backend/src/routes/auth.ts`
- `packages/backend/src/validators/auth.validator.ts`
- `packages/frontend/src/contexts/AuthContext.tsx`
- `packages/frontend/src/pages/LoginPage.tsx`
- `packages/frontend/src/pages/RegisterPage.tsx`
- `packages/frontend/src/components/ProtectedRoute.tsx`

### Files to Modify:
- `packages/backend/prisma/schema.prisma` (add User model)
- `packages/backend/src/server.ts` (add auth routes)
- All controllers (add userId filtering)
- `packages/frontend/src/App.tsx` (add auth routes, wrap with AuthProvider)
- `packages/frontend/src/components/Navigation.tsx` (show user, logout)

---

## Phase 3: Multi-User Data Isolation
**Estimated Time:** 6-8 hours

### 3.1 Update All Models
- [ ] Recipe: add userId, add relation to User
- [ ] MealPlan: add userId, add relation to User
- [ ] ShoppingList: add userId, add relation to User
- [ ] CookingPlan: add userId, add relation to User
- [ ] Ingredient: keep global (shared across users) OR per-user

### 3.2 Update All Services
- [ ] recipe.service.ts: filter by userId in all queries
- [ ] mealPlan.service.ts: filter by userId in all queries
- [ ] shoppingList.service.ts: filter by userId in all queries
- [ ] cookingPlan.service.ts: filter by userId in all queries

### 3.3 Update All Controllers
- [ ] Extract userId from JWT in request
- [ ] Pass userId to service methods
- [ ] Verify ownership before update/delete operations

---

## Phase 4: Environment & Configuration
**Estimated Time:** 2-3 hours

### 4.1 Environment Variables
- [ ] Create `.env.example` with all required vars
- [ ] Update code to use environment variables for:
  - DATABASE_URL
  - JWT_SECRET
  - JWT_EXPIRES_IN
  - FRONTEND_URL (for CORS)
  - NODE_ENV

### 4.2 Security Hardening
- [ ] Add rate limiting (express-rate-limit)
- [ ] Add CORS configuration for production
- [ ] Add helmet.js security headers (already installed)
- [ ] Ensure passwords are never logged or returned

### Files to Create:
- `.env.example`
- `packages/backend/src/config/index.ts`

---

## Phase 5: Deployment Setup
**Estimated Time:** 4-6 hours

### 5.1 Supabase Database Setup
- [ ] Create Supabase account
- [ ] Create new project
- [ ] Get connection string
- [ ] Run Prisma migrations against Supabase

### 5.2 Railway Backend Deployment
- [ ] Create Railway account
- [ ] Connect GitHub repository
- [ ] Configure environment variables
- [ ] Deploy backend
- [ ] Verify health endpoint

### 5.3 Vercel Frontend Deployment
- [ ] Create Vercel account
- [ ] Connect GitHub repository
- [ ] Configure build settings (packages/frontend)
- [ ] Set VITE_API_URL environment variable
- [ ] Deploy frontend

### 5.4 Domain & SSL (Optional)
- [ ] Configure custom domain (if desired)
- [ ] SSL is automatic on Vercel/Railway

---

## Phase 6: Testing & Polish
**Estimated Time:** 8-12 hours

### 6.1 End-to-End Testing
- [ ] Test registration flow
- [ ] Test login/logout flow
- [ ] Test all CRUD operations as authenticated user
- [ ] Test Puppeteer scraping on Railway (should work on Linux!)
- [ ] Test on mobile devices

### 6.2 Error Handling
- [ ] Add global error boundary in React
- [ ] Improve error messages for users
- [ ] Add loading states for all async operations

### 6.3 Data Migration
- [ ] Export your current local recipes/meal plans
- [ ] Import into production database
- [ ] Verify all data is correct

---

## Implementation Order

```
Week 1:
├── Day 1-2: Phase 1 (Database Migration)
├── Day 3-5: Phase 2 (Authentication)
└── Day 6-7: Phase 3 (Multi-User Isolation)

Week 2:
├── Day 1: Phase 4 (Environment & Config)
├── Day 2-3: Phase 5 (Deployment)
└── Day 4-7: Phase 6 (Testing & Polish)
```

---

## Cost Breakdown

| Service | Plan | Monthly Cost |
|---------|------|--------------|
| Supabase | Free | $0 |
| Railway | Hobby | $5-7 |
| Vercel | Free | $0 |
| **Total** | | **$5-7/month** |

### Free Tier Limits:
- **Supabase:** 500MB database, 1GB file storage, 50,000 monthly active users
- **Railway:** $5 free credits, then pay-as-you-go (~$5-7 for this app)
- **Vercel:** 100GB bandwidth, unlimited sites

---

## Files Summary

### New Files to Create:
```
docker-compose.yml                              # Local PostgreSQL
.env.example                                    # Environment template
scripts/migrate-data.ts                         # SQLite → PostgreSQL migration
scripts/export-data.ts                          # Export local data
packages/backend/src/config/index.ts            # Centralized config
packages/backend/src/controllers/auth.controller.ts
packages/backend/src/middleware/auth.ts
packages/backend/src/routes/auth.ts
packages/backend/src/validators/auth.validator.ts
packages/frontend/src/contexts/AuthContext.tsx
packages/frontend/src/pages/LoginPage.tsx
packages/frontend/src/pages/RegisterPage.tsx
packages/frontend/src/components/ProtectedRoute.tsx
packages/frontend/src/services/auth.service.ts
packages/frontend/src/hooks/useAuth.ts
railway.json                                    # Railway config
vercel.json                                     # Vercel config
```

### Files to Modify:
```
packages/backend/prisma/schema.prisma           # Add User, update relations
packages/backend/package.json                   # Add bcrypt, jsonwebtoken
packages/backend/src/server.ts                  # Add auth routes, middleware
packages/backend/src/controllers/*.ts           # Add userId filtering
packages/backend/src/services/*.ts              # Add userId to queries
packages/frontend/src/App.tsx                   # Add auth routes, provider
packages/frontend/src/components/Navigation.tsx # User menu, logout
packages/frontend/src/services/api.ts           # Add auth header
packages/frontend/package.json                  # Add any new deps
```

---

## Rollback Plan

If anything goes wrong:
1. Keep local SQLite database as backup
2. Railway/Vercel have instant rollback to previous deploys
3. Supabase has point-in-time recovery (on paid plan)

---

## Post-Launch Checklist

- [ ] Verify all features work in production
- [ ] Test Puppeteer scraping (Akis, Argiro)
- [ ] Import your personal recipe data
- [ ] Set up database backups (Supabase does daily on free tier)
- [ ] Monitor Railway usage to stay within budget
- [ ] Test on phone/tablet

---

## Ready to Start?

Begin with **Phase 1: Database Migration** - this is the foundation everything else builds on.
