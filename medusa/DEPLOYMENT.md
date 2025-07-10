# Deploying Medusa Backend to Render

## Prerequisites
1. Create a Render account at https://render.com
2. Connect your GitHub repository to Render

## Step 1: Create Environment Variables Template

Create a `.env.template` file in the medusa directory with the following content:

```env
# Database
DATABASE_URL=postgresql://medusa:password@localhost:5432/medusa

# Redis
REDIS_URL=redis://localhost:6379

# JWT and Cookie Secrets
JWT_SECRET=your-jwt-secret-here
COOKIE_SECRET=your-cookie-secret-here

# URLs
BACKEND_URL=http://localhost:9000
STOREFRONT_URL=http://localhost:8000

# CORS
STORE_CORS=http://localhost:8000
ADMIN_CORS=http://localhost:9000
AUTH_CORS=http://localhost:8000

# Stripe (Optional - for payments)
STRIPE_API_KEY=your-stripe-api-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret

# S3 (Optional - for file uploads)
S3_FILE_URL=your-s3-file-url
S3_ACCESS_KEY_ID=your-s3-access-key
S3_SECRET_ACCESS_KEY=your-s3-secret-key
S3_REGION=your-s3-region
S3_BUCKET=your-s3-bucket
S3_ENDPOINT=your-s3-endpoint
S3_FORCE_PATH_STYLE=false

# Resend (Optional - for emails)
RESEND_API_KEY=your-resend-api-key
RESEND_FROM=noreply@yourdomain.com

# Meilisearch (Optional - for search)
MEILISEARCH_HOST=your-meilisearch-host
MEILISEARCH_API_KEY=your-meilisearch-api-key
```

## Step 2: Deploy to Render

1. **Create a new Web Service**:
   - Go to Render Dashboard
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the repository

2. **Configure the Web Service**:
   - **Name**: `medusa-backend`
   - **Root Directory**: `medusa` (if your repo has both frontend and backend)
   - **Environment**: `Node`
   - **Build Command**: `yarn install && yarn build`
   - **Start Command**: `yarn start`
   - **Plan**: Free

3. **Add Environment Variables**:
   - `NODE_ENV`: `production`
   - `JWT_SECRET`: Generate a random string
   - `COOKIE_SECRET`: Generate a random string
   - `BACKEND_URL`: Will be set after deployment
   - `STOREFRONT_URL`: Your frontend URL
   - `STORE_CORS`: Your frontend URL
   - `ADMIN_CORS`: Your admin URL
   - `AUTH_CORS`: Your frontend URL

4. **Create PostgreSQL Database**:
   - Go to "New +" → "PostgreSQL"
   - Name: `medusa-postgres`
   - Plan: Free
   - Copy the connection string

5. **Create Redis Instance**:
   - Go to "New +" → "Redis"
   - Name: `medusa-redis`
   - Plan: Free
   - Copy the connection string

6. **Link Database and Redis**:
   - In your web service settings
   - Add environment variable `DATABASE_URL` with the PostgreSQL connection string
   - Add environment variable `REDIS_URL` with the Redis connection string

## Step 3: Deploy and Configure

1. **Deploy the service**
2. **Run migrations**: After deployment, you'll need to run database migrations
3. **Seed the database**: Run the seed script
4. **Create admin user**: Create an admin user for the Medusa admin panel

## Step 4: Update URLs

After deployment, update these environment variables with your actual URLs:
- `BACKEND_URL`: Your Render app URL
- `STOREFRONT_URL`: Your frontend URL
- `STORE_CORS`: Your frontend URL
- `ADMIN_CORS`: Your admin URL
- `AUTH_CORS`: Your frontend URL

## Alternative: Railway (30-day free trial)

If you want to try Railway for the 30-day free trial:

1. Create account at https://railway.app
2. Connect your GitHub repository
3. Use the `railway.json` and `Procfile` files already created
4. Add environment variables in Railway dashboard
5. Deploy

## Environment Variables for Production

Make sure to set these in your deployment platform:

### Required:
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `JWT_SECRET`: Random string for JWT signing
- `COOKIE_SECRET`: Random string for cookie signing
- `NODE_ENV`: `production`

### Optional (but recommended):
- `BACKEND_URL`: Your backend URL
- `STOREFRONT_URL`: Your frontend URL
- `STORE_CORS`: Frontend URL for CORS
- `ADMIN_CORS`: Admin URL for CORS
- `AUTH_CORS`: Frontend URL for auth CORS 