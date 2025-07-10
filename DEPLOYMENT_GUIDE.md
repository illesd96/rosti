# 🚀 Complete Deployment Guide

This guide will help you deploy your Fashion E-commerce Starter to free hosting platforms.

## 📋 Prerequisites

- GitHub account
- Render account (for backend)
- Vercel account (for frontend)
- Stripe account (optional, for payments)

## 🎯 Deployment Strategy

- **Backend (Medusa)**: Render (Free tier with PostgreSQL & Redis)
- **Frontend (Next.js)**: Vercel (Free tier)
- **Database**: PostgreSQL on Render (Free tier)
- **Cache**: Redis on Render (Free tier)

## 🔧 Backend Deployment (Render)

### Step 1: Prepare Your Repository

1. **Push your code to GitHub** (if not already done)
2. **Create environment template**:
   ```bash
   cd medusa
   # Create .env.template file with the content from DEPLOYMENT.md
   ```

### Step 2: Deploy to Render

1. **Create Render Account**
   - Go to https://render.com
   - Sign up with your GitHub account

2. **Create Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the repository

3. **Configure Web Service**
   ```
   Name: medusa-backend
   Root Directory: medusa (if your repo has both frontend and backend)
   Environment: Node
   Build Command: yarn install && yarn build
   Start Command: yarn start
   Plan: Free
   ```

4. **Create PostgreSQL Database**
   - Go to "New +" → "PostgreSQL"
   - Name: `medusa-postgres`
   - Plan: Free
   - Copy the connection string

5. **Create Redis Instance**
   - Go to "New +" → "Redis"
   - Name: `medusa-redis`
   - Plan: Free
   - Copy the connection string

6. **Set Environment Variables**
   In your web service settings, add these variables:

   **Required:**
   ```
   NODE_ENV=production
   DATABASE_URL=<your-postgresql-connection-string>
   REDIS_URL=<your-redis-connection-string>
   JWT_SECRET=<generate-random-string>
   COOKIE_SECRET=<generate-random-string>
   ```

   **Optional (but recommended):**
   ```
   BACKEND_URL=https://your-app-name.onrender.com
   STOREFRONT_URL=https://your-frontend-url.vercel.app
   STORE_CORS=https://your-frontend-url.vercel.app
   ADMIN_CORS=https://your-app-name.onrender.com
   AUTH_CORS=https://your-frontend-url.vercel.app
   ```

7. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment to complete

### Step 3: Post-Deployment Setup

After deployment, you need to:

1. **Run Database Migrations**
   ```bash
   # You'll need to run this via Render's shell or add it to your build script
   yarn medusa db:migrate
   ```

2. **Seed the Database**
   ```bash
   yarn seed
   ```

3. **Create Admin User**
   ```bash
   yarn medusa user -e "admin@yourdomain.com" -p "your-password"
   ```

## 🎨 Frontend Deployment (Vercel)

### Step 1: Prepare Frontend

1. **Update Environment Variables**
   Create `.env.local` in the `storefront` directory:
   ```env
   NEXT_PUBLIC_MEDUSA_BACKEND_URL=https://your-backend-url.onrender.com
   NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=<your-publishable-key>
   ```

2. **Get Publishable Key**
   - Go to your Medusa admin panel: `https://your-backend-url.onrender.com/app`
   - Navigate to Settings → API Keys
   - Copy the publishable key

### Step 2: Deploy to Vercel

1. **Create Vercel Account**
   - Go to https://vercel.com
   - Sign up with your GitHub account

2. **Import Project**
   - Click "New Project"
   - Import your GitHub repository
   - Set the root directory to `storefront`

3. **Configure Build Settings**
   ```
   Framework Preset: Next.js
   Root Directory: storefront
   Build Command: yarn build
   Output Directory: .next
   Install Command: yarn install
   ```

4. **Set Environment Variables**
   ```
   NEXT_PUBLIC_MEDUSA_BACKEND_URL=https://your-backend-url.onrender.com
   NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=<your-publishable-key>
   ```

5. **Deploy**
   - Click "Deploy"
   - Wait for deployment to complete

## 🔗 Connect Backend and Frontend

1. **Update Backend CORS Settings**
   In your Render backend environment variables:
   ```
   STOREFRONT_URL=https://your-frontend-url.vercel.app
   STORE_CORS=https://your-frontend-url.vercel.app
   AUTH_CORS=https://your-frontend-url.vercel.app
   ```

2. **Update Frontend Backend URL**
   In your Vercel frontend environment variables:
   ```
   NEXT_PUBLIC_MEDUSA_BACKEND_URL=https://your-backend-url.onrender.com
   ```

## 🛠️ Useful Commands

### Generate Deployment Secrets
```bash
cd medusa
yarn deploy:setup
```

### Local Development
```bash
# Backend
cd medusa
yarn dev

# Frontend
cd storefront
yarn dev
```

## 🔍 Troubleshooting

### Common Issues:

1. **Database Connection Errors**
   - Check your `DATABASE_URL` in Render
   - Ensure PostgreSQL is running
   - Run migrations: `yarn medusa db:migrate`

2. **CORS Errors**
   - Update CORS settings in backend environment variables
   - Ensure frontend URL is correct

3. **Build Failures**
   - Check Node.js version (requires >=20)
   - Ensure all dependencies are installed
   - Check build logs in Render/Vercel

4. **Environment Variables**
   - Double-check all environment variables are set
   - Ensure no typos in URLs
   - Verify secrets are properly generated

## 📞 Support

- **Render Documentation**: https://render.com/docs
- **Vercel Documentation**: https://vercel.com/docs
- **Medusa Documentation**: https://docs.medusajs.com
- **Medusa Community**: https://discord.gg/medusajs

## 🎉 Success!

Once deployed, you should have:
- ✅ Backend running on Render
- ✅ Frontend running on Vercel
- ✅ Database and Redis on Render
- ✅ Admin panel accessible
- ✅ Storefront accessible

Your e-commerce site is now live! 🚀 