# PlantSpace Quick Start Guide 🚀

## 5-Minute Deployment

### Step 1: Set Up Database (2 minutes)
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Go to SQL Editor and run the `setup-database.sql` file
3. Note your project URL and API keys from Settings > API

### Step 2: Configure Environment (1 minute)
Update `backend/.env`:
```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
JWT_SECRET=your_super_secure_jwt_secret_here
```

Update `PlantSpace/src/services/api.ts`:
```typescript
const API_BASE_URL = 'https://your-backend-url.com/api';
```

### Step 3: Deploy Backend (2 minutes)
**Option A - Railway:**
1. Connect GitHub repo to Railway
2. Add environment variables in dashboard
3. Deploy automatically

**Option B - Local Testing:**
```bash
cd backend
npm install
npm run dev
```

### Step 4: Run Mobile App
```bash
cd PlantSpace
npm install
npx expo start
```

## 🎉 You're Live!

Your PlantSpace app is now running with:
- ✅ User authentication
- ✅ Post creation and feed
- ✅ Real-time messaging
- ✅ Comments system
- ✅ Search functionality
- ✅ Voice/video calls
- ✅ Push notifications

## Test Features:
1. **Register** a new account
2. **Create** your first post
3. **Search** for content
4. **Message** other users
5. **Comment** on posts

## Need Help?
- Check `DEPLOYMENT_GUIDE.md` for detailed instructions
- Review `IMPLEMENTATION_COMPLETE.md` for feature overview
- All code is production-ready and documented

**Happy farming! 🌱👨‍🌾**
