# PlantSpace 🌱

A social media mobile app for agriculture and environmental enthusiasts. Connect with farmers, gardeners, and eco-conscious individuals to share knowledge, experiences, and grow together.

## Features

### Core Social Features
- **Text Posts with Images**: Share your agricultural insights, environmental tips, and garden updates
- **Follow System**: Follow other users and build your network in the green community
- **Real-time Messaging**: One-on-one conversations with other community members
- **Voice & Video Calls**: Connect face-to-face with fellow farmers and gardeners
- **Profile Pages**: Showcase your agricultural journey and expertise

### Discovery & Search
- **Explore Feed**: Discover new content and users
- **Hashtag Search**: Find posts by topics like #organic, #farming, #sustainability
- **User Search**: Connect with specific farmers, gardeners, or environmental experts

### Authentication
- **Email/Username Login**: Simple and secure authentication
- **Profile Management**: Customize your agricultural profile

## Tech Stack

### Mobile App (React Native + Expo)
- **Framework**: React Native with Expo
- **Navigation**: React Navigation v6
- **State Management**: React Hooks + Context API
- **UI Components**: Custom components with Expo Vector Icons
- **Image Handling**: Expo Image Picker & Camera
- **Real-time**: Socket.IO Client
- **WebRTC**: React Native WebRTC for voice/video calls

### Backend (Node.js + Express)
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL via Supabase
- **Authentication**: JWT tokens
- **Real-time**: Socket.IO
- **File Storage**: Supabase Storage
- **API**: RESTful API with real-time WebSocket support

### Database (PostgreSQL)
- **Users**: Profile information, authentication
- **Posts**: Text content, images, hashtags
- **Social Graph**: Follow relationships
- **Messages**: Real-time messaging
- **Calls**: Call history and metadata

## Project Structure

```
PlantSpace/
├── backend/                 # Node.js API server
│   ├── src/
│   │   ├── controllers/     # API route handlers
│   │   ├── middleware/      # Authentication, validation
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic, Supabase
│   │   ├── types/           # TypeScript interfaces
│   │   └── index.ts         # Server entry point
│   ├── package.json
│   └── tsconfig.json
│
├── PlantSpace/              # React Native mobile app
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── navigation/      # App navigation setup
│   │   ├── screens/         # App screens
│   │   │   ├── auth/        # Login, Register
│   │   │   └── main/        # Feed, Profile, Chat, etc.
│   │   ├── services/        # API client, utilities
│   │   └── types/           # TypeScript interfaces
│   ├── App.tsx              # App entry point
│   └── package.json
│
└── README.md
```

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- Supabase account
- Android Studio (for Android) or Xcode (for iOS)

### Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```
   
   Fill in your Supabase credentials:
   ```env
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   JWT_SECRET=your_jwt_secret_key_here
   PORT=3000
   NODE_ENV=development
   ```

4. **Set up database schema**:
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Run the SQL schema from `src/services/supabase.ts`

5. **Start the development server**:
   ```bash
   npm run dev
   ```

### Mobile App Setup

1. **Navigate to mobile app directory**:
   ```bash
   cd PlantSpace
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Update API URL**:
   - Edit `src/services/api.ts`
   - Change `API_BASE_URL` to your backend URL (e.g., `http://your-ip:3000/api`)

4. **Start the Expo development server**:
   ```bash
   npx expo start
   ```

5. **Run on device/simulator**:
   - Install Expo Go app on your phone
   - Scan the QR code from the terminal
   - Or press `a` for Android emulator, `i` for iOS simulator

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Login with email/username
- `GET /api/auth/profile` - Get current user profile

### Posts
- `GET /api/posts/feed` - Get personalized feed
- `POST /api/posts` - Create new post
- `GET /api/posts/:id` - Get specific post
- `DELETE /api/posts/:id` - Delete post

### Users
- `GET /api/users/:id` - Get user profile
- `POST /api/users/:id/follow` - Follow user
- `DELETE /api/users/:id/follow` - Unfollow user
- `GET /api/users/search` - Search users
- `PUT /api/users/profile` - Update profile

### Real-time Events (Socket.IO)
- `join_conversation` - Join chat room
- `send_message` - Send message
- `new_message` - Receive message
- `call_user` - Initiate call
- `incoming_call` - Receive call

## Development Roadmap

### Phase 1: Core Features ✅
- [x] Authentication (login/register)
- [x] Basic post creation and feed
- [x] User profiles and follow system
- [x] Real-time messaging foundation
- [x] Voice/video call UI

### Phase 2: Enhanced Features 🚧
- [ ] Image upload to Supabase Storage
- [ ] Real-time messaging with Socket.IO
- [ ] WebRTC implementation for calls
- [ ] Push notifications
- [ ] Hashtag and post search

### Phase 3: Advanced Features 📋
- [ ] Content moderation
- [ ] Reporting system
- [ ] Advanced search filters
- [ ] User blocking
- [ ] Email notifications

### Phase 4: Production 🎯
- [ ] Performance optimization
- [ ] Security hardening
- [ ] App store deployment
- [ ] Analytics integration

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue in this repository
- Join our community discussions
- Contact the development team

---

**PlantSpace** - Growing connections in the agricultural and environmental community 🌱🌍
