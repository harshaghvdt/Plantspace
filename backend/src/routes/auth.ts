import { Router } from 'express';
import { 
  generateToken, 
  hashPassword, 
  comparePassword,
  authenticateToken,
  validateRegistration,
  validateLogin,
  createRateLimit,
  AuthRequest
} from '../middleware/auth';
import { DatabaseService } from '../config/supabase';

const router = Router();

// Rate limiting
const authRateLimit = createRateLimit(15 * 60 * 1000, 5); // 5 requests per 15 minutes
const loginRateLimit = createRateLimit(15 * 60 * 1000, 10); // 10 requests per 15 minutes

// Register
router.post('/register', authRateLimit, validateRegistration, async (req, res) => {
  try {
    const { username, email, password, display_name } = req.body;

    // Check if user already exists
    const { data: existingUserByEmail } = await DatabaseService.getUserByEmail(email);
    if (existingUserByEmail) {
      return res.status(400).json({ 
        error: 'User with this email already exists',
        code: 'EMAIL_EXISTS'
      });
    }

    const { data: existingUserByUsername } = await DatabaseService.getUserByUsername(username);
    if (existingUserByUsername) {
      return res.status(400).json({ 
        error: 'Username is already taken',
        code: 'USERNAME_EXISTS'
      });
    }

    // Hash password
    const password_hash = await hashPassword(password);

    // Create user
    const { data: user, error } = await DatabaseService.createUser({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password_hash,
      display_name: display_name.trim(),
    });

    if (error) {
      console.error('User creation error:', error);
      return res.status(500).json({ 
        error: 'Failed to create user account',
        code: 'USER_CREATION_FAILED'
      });
    }

    // Generate token
    const token = generateToken(user);

    // Return success response
    res.status(201).json({
      message: 'Welcome to PlantSpace! Your account has been created successfully 🌱',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        is_verified: user.is_verified,
        has_completed_onboarding: user.has_completed_onboarding,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      error: 'Registration failed. Please try again.',
      code: 'REGISTRATION_ERROR'
    });
  }
});

// Login
router.post('/login', loginRateLimit, validateLogin, async (req, res) => {
  try {
    const { identifier, password } = req.body;

    // Find user by email or username
    let user = null;
    let error = null;

    // Try to find by email first
    if (identifier.includes('@')) {
      const result = await DatabaseService.getUserByEmail(identifier.toLowerCase());
      user = result.data;
      error = result.error;
    } else {
      // Try to find by username
      const result = await DatabaseService.getUserByUsername(identifier.toLowerCase());
      user = result.data;
      error = result.error;
    }

    if (error || !user) {
      return res.status(401).json({ 
        error: 'Invalid email/username or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Check password
    const isValidPassword = await comparePassword(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ 
        error: 'Invalid email/username or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Generate token
    const token = generateToken(user);

    // Update last login (optional)
    await DatabaseService.updateUser(user.id, {
      updated_at: new Date().toISOString()
    });

    // Return success response
    res.json({
      message: 'Welcome back to PlantSpace! 🌿',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        cover_url: user.cover_url,
        bio: user.bio,
        is_verified: user.is_verified,
        verification_status: user.verification_status,
        has_completed_onboarding: user.has_completed_onboarding,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Login failed. Please try again.',
      code: 'LOGIN_ERROR'
    });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;
    
    // Get fresh user data
    const { data: user, error } = await DatabaseService.getUserById(userId);
    
    if (error || !user) {
      return res.status(404).json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Remove sensitive data
    const { password_hash, ...userProfile } = user;

    res.json({ 
      user: userProfile,
      message: 'Profile retrieved successfully'
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ 
      error: 'Failed to get profile',
      code: 'PROFILE_ERROR'
    });
  }
});

// Update profile
router.put('/profile', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;
    const { display_name, bio, avatar_url, cover_url } = req.body;
    
    // Validate input
    const updates: any = {};
    
    if (display_name !== undefined) {
      if (display_name.length < 1 || display_name.length > 100) {
        return res.status(400).json({
          error: 'Display name must be between 1 and 100 characters',
          code: 'INVALID_DISPLAY_NAME'
        });
      }
      updates.display_name = display_name.trim();
    }
    
    if (bio !== undefined) {
      if (bio.length > 500) {
        return res.status(400).json({
          error: 'Bio must be less than 500 characters',
          code: 'INVALID_BIO'
        });
      }
      updates.bio = bio.trim();
    }
    
    if (avatar_url !== undefined) {
      updates.avatar_url = avatar_url;
    }
    
    if (cover_url !== undefined) {
      updates.cover_url = cover_url;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        error: 'No valid fields to update',
        code: 'NO_UPDATES'
      });
    }

    // Update user
    const { data: updatedUser, error } = await DatabaseService.updateUser(userId, updates);
    
    if (error) {
      console.error('Profile update error:', error);
      return res.status(500).json({
        error: 'Failed to update profile',
        code: 'UPDATE_FAILED'
      });
    }

    // Remove sensitive data
    const { password_hash, ...userProfile } = updatedUser;

    res.json({
      message: 'Profile updated successfully 🌱',
      user: userProfile
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ 
      error: 'Failed to update profile',
      code: 'PROFILE_UPDATE_ERROR'
    });
  }
});

// Change password
router.put('/password', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({
        error: 'Current password and new password are required',
        code: 'MISSING_PASSWORDS'
      });
    }

    // Get user with password hash
    const { data: user, error: userError } = await DatabaseService.getUserById(userId);
    
    if (userError || !user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Verify current password
    const isValidPassword = await comparePassword(current_password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Current password is incorrect',
        code: 'INVALID_CURRENT_PASSWORD'
      });
    }

    // Validate new password
    const { validatePassword } = await import('../middleware/auth');
    const passwordValidation = validatePassword(new_password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        error: 'New password does not meet requirements',
        errors: passwordValidation.errors,
        code: 'INVALID_NEW_PASSWORD'
      });
    }

    // Hash new password
    const new_password_hash = await hashPassword(new_password);

    // Update password
    const { error: updateError } = await DatabaseService.updateUser(userId, {
      password_hash: new_password_hash
    });

    if (updateError) {
      console.error('Password update error:', updateError);
      return res.status(500).json({
        error: 'Failed to update password',
        code: 'PASSWORD_UPDATE_FAILED'
      });
    }

    res.json({
      message: 'Password updated successfully 🔒'
    });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ 
      error: 'Failed to change password',
      code: 'PASSWORD_CHANGE_ERROR'
    });
  }
});

// Refresh token
router.post('/refresh', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    
    // Generate new token
    const token = generateToken(user);
    
    res.json({
      message: 'Token refreshed successfully',
      token
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ 
      error: 'Failed to refresh token',
      code: 'TOKEN_REFRESH_ERROR'
    });
  }
});

// Logout (client-side token invalidation)
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // In a more complex setup, you might want to blacklist the token
    // For now, we'll just send a success response
    res.json({
      message: 'Logged out successfully. See you in the garden! 🌱'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      error: 'Logout failed',
      code: 'LOGOUT_ERROR'
    });
  }
});

export default router;
