# 🚀 Deployment Guide

## Render Deployment

### Prerequisites

1. **Render Account** - Sign up at [render.com](https://render.com)
2. **MongoDB Atlas** - Production database
3. **CoinMarketCap API Key** - For production use

### Backend Deployment (Server)

#### Step 1: Create Web Service

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name:** `crypto-crash-server`
   - **Region:** Choose closest to your users
   - **Branch:** `main`
   - **Root Directory:** `server`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free (or paid for better performance)

#### Step 2: Add Environment Variables

In the "Environment" tab, add:

```
NODE_ENV=production
PORT=3000
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/production-db
API_KEY=your_coinmarketcap_api_key
FRONTEND_URL=https://your-frontend-url.onrender.com
```

**Important:**
- Use a **different MongoDB database** for production
- Use **production credentials** (not development)
- Set `FRONTEND_URL` to your actual frontend URL

#### Step 3: Deploy

Click "Create Web Service" - Render will automatically deploy!

Your backend will be available at: `https://crypto-crash-server.onrender.com`

### Frontend Deployment (Client)

#### Option A: Deploy to Render (Static Site)

1. Click "New +" → "Static Site"
2. Connect your GitHub repository
3. Configure:
   - **Name:** `crypto-crash-client`
   - **Branch:** `main`
   - **Root Directory:** `client`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`

4. Add Environment Variables:
   ```
   VITE_SOCKET_URL=https://crypto-crash-server.onrender.com
   VITE_API_URL=https://crypto-crash-server.onrender.com/api
   ```

#### Option B: Deploy to Netlify

1. Go to [Netlify](https://netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Connect GitHub repository
4. Configure:
   - **Base directory:** `client`
   - **Build command:** `npm run build`
   - **Publish directory:** `client/dist`

5. Add Environment Variables in Netlify dashboard:
   ```
   VITE_SOCKET_URL=https://crypto-crash-server.onrender.com
   VITE_API_URL=https://crypto-crash-server.onrender.com/api
   ```

#### Option C: Deploy to Vercel

1. Go to [Vercel](https://vercel.com)
2. Import your GitHub repository
3. Configure:
   - **Framework Preset:** Vite
   - **Root Directory:** `client`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

4. Add Environment Variables:
   ```
   VITE_SOCKET_URL=https://crypto-crash-server.onrender.com
   VITE_API_URL=https://crypto-crash-server.onrender.com/api
   ```

### Update CORS Settings

After deployment, update `server/server.js`:

```javascript
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  },
});

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true
}));
```

### MongoDB Atlas Configuration

1. **Whitelist Render IPs:**
   - Go to MongoDB Atlas → Network Access
   - Add IP: `0.0.0.0/0` (allow from anywhere)
   - Or add specific Render IPs

2. **Create Production Database:**
   - Use a separate database for production
   - Don't use the same database as development

### Troubleshooting

#### "Environment validation failed"

- Make sure all environment variables are set in Render dashboard
- Check for typos in variable names
- Verify MongoDB URI is correct

#### "Failed to connect to MongoDB"

- Check MongoDB Atlas Network Access settings
- Verify connection string is correct
- Ensure database user has proper permissions

#### "CORS Error"

- Update `FRONTEND_URL` in backend environment variables
- Make sure CORS is configured correctly in `server.js`
- Check that frontend is using correct backend URL

#### WebSocket Connection Issues

- Ensure `VITE_SOCKET_URL` points to backend URL (not /api)
- Check that backend is running and accessible
- Verify WebSocket connections are allowed by hosting provider

### Free Tier Limitations

**Render Free Tier:**
- Services spin down after 15 minutes of inactivity
- First request after spin-down takes 30-60 seconds
- 750 hours/month free

**Solutions:**
- Use a paid plan for production
- Implement a keep-alive ping service
- Add loading state for initial connection

### Production Checklist

- [ ] Use production MongoDB database
- [ ] Rotate all credentials (don't use dev credentials)
- [ ] Set `NODE_ENV=production`
- [ ] Configure CORS with actual frontend URL
- [ ] Enable MongoDB IP whitelist
- [ ] Test all features in production
- [ ] Monitor logs for errors
- [ ] Set up error tracking (Sentry, etc.)
- [ ] Configure custom domain (optional)
- [ ] Enable HTTPS (automatic on Render/Netlify/Vercel)

### Monitoring

**Render Dashboard:**
- View logs in real-time
- Monitor resource usage
- Check deployment history

**MongoDB Atlas:**
- Monitor database connections
- Check query performance
- Set up alerts for issues

### Updating Deployment

Render automatically redeploys when you push to GitHub:

```bash
git add .
git commit -m "Update feature"
git push origin main
```

Render will detect the push and redeploy automatically!

### Cost Optimization

**Free Tier Setup:**
- Backend: Render Free (spins down after inactivity)
- Frontend: Netlify/Vercel Free (always on)
- Database: MongoDB Atlas Free (M0 cluster)
- Total: $0/month

**Paid Setup (Recommended for Production):**
- Backend: Render Starter ($7/month) - always on
- Frontend: Netlify/Vercel Free or Pro
- Database: MongoDB Atlas M2+ ($9/month)
- Total: ~$16/month

### Support

- Render Docs: https://render.com/docs
- MongoDB Atlas: https://docs.atlas.mongodb.com
- Netlify Docs: https://docs.netlify.com
- Vercel Docs: https://vercel.com/docs
