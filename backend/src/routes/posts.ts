import { Router } from 'express';
import { authenticateToken, optionalAuth, createRateLimit, AuthRequest } from '../middleware/auth';
import { DatabaseService } from '../config/supabase';

const router = Router();

// Rate limiting
const postRateLimit = createRateLimit(60 * 60 * 1000, 10); // 10 posts per hour
const feedRateLimit = createRateLimit(60 * 1000, 30); // 30 requests per minute

// Validation middleware for posts
const validatePost = (req: any, res: any, next: any) => {
  const { text, image_url } = req.body;
  const errors: string[] = [];

  if (!text || typeof text !== 'string') {
    errors.push('Post text is required');
  } else {
    const trimmedText = text.trim();
    if (trimmedText.length === 0) {
      errors.push('Post text cannot be empty');
    } else if (trimmedText.length > 2000) {
      errors.push('Post text must be less than 2000 characters');
    }
  }

  if (image_url && typeof image_url !== 'string') {
    errors.push('Image URL must be a valid string');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      errors,
      code: 'VALIDATION_ERROR'
    });
  }

  next();
};

// Extract hashtags from text
const extractHashtags = (text: string): string[] => {
  const hashtags = text.match(/#[\w]+/g) || [];
  return hashtags.map(tag => tag.toLowerCase()).slice(0, 10); // Limit to 10 hashtags
};

// Get feed with pagination
router.get('/feed', feedRateLimit, optionalAuth, async (req: AuthRequest, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit as string) || 20), 50);
    const userId = req.user?.id;

    const { data: posts, error } = await DatabaseService.getPosts(page, limit, userId);

    if (error) {
      console.error('Feed error:', error);
      return res.status(500).json({ 
        error: 'Failed to load feed',
        code: 'FEED_ERROR'
      });
    }

    // Process posts to add user-specific data
    const processedPosts = posts?.map((post: any) => ({
      id: post.id,
      user_id: post.user_id,
      text: post.text,
      image_url: post.image_url,
      created_at: post.created_at,
      updated_at: post.updated_at,
      users: post.users,
      likes_count: 0, // Will be populated by separate query if needed
      comments_count: 0, // Will be populated by separate query if needed
      is_liked: false, // Will be populated by separate query if needed
    })) || [];

    const hasMore = processedPosts.length === limit;

    res.json({
      posts: processedPosts,
      pagination: {
        page,
        limit,
        hasMore,
        total: processedPosts.length
      },
      message: 'Feed loaded successfully'
    });
  } catch (error) {
    console.error('Feed error:', error);
    res.status(500).json({ 
      error: 'Failed to load feed',
      code: 'FEED_ERROR'
    });
  }
});

// Create new post
router.post('/', postRateLimit, authenticateToken, validatePost, async (req: AuthRequest, res) => {
  try {
    const { text, image_url } = req.body;
    const userId = req.user.id;

    // Extract hashtags
    const hashtags = extractHashtags(text);

    // Create post
    const { data: post, error } = await DatabaseService.createPost({
      user_id: userId,
      text: text.trim(),
      image_url: image_url || undefined,
      hashtags
    });

    if (error) {
      console.error('Create post error:', error);
      return res.status(500).json({ 
        error: 'Failed to create post',
        code: 'POST_CREATION_FAILED'
      });
    }

    // Add default counts
    const processedPost = {
      ...post,
      likes_count: 0,
      comments_count: 0,
      is_liked: false
    };

    res.status(201).json({ 
      post: processedPost,
      message: 'Seed planted successfully! 🌱 Your post is now growing in the garden.'
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ 
      error: 'Failed to create post',
      code: 'POST_CREATION_ERROR'
    });
  }
});

// Like a post
router.post('/:id/like', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;

    // Check if post exists
    const { data: post, error: postError } = await DatabaseService.getPostById(postId);
    
    if (postError || !post) {
      return res.status(404).json({ 
        error: 'Post not found',
        code: 'POST_NOT_FOUND'
      });
    }

    // Check if already liked
    const { data: isLiked } = await DatabaseService.isPostLiked(userId, postId);
    
    if (isLiked) {
      return res.status(400).json({ 
        error: 'Post already liked',
        code: 'ALREADY_LIKED'
      });
    }

    // Like the post
    const { error } = await DatabaseService.likePost(userId, postId);

    if (error) {
      console.error('Like post error:', error);
      return res.status(500).json({ 
        error: 'Failed to like post',
        code: 'LIKE_FAILED'
      });
    }

    res.json({ 
      message: 'Post watered successfully! 💧 Your appreciation helps this seed grow.'
    });
  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json({ 
      error: 'Failed to like post',
      code: 'LIKE_ERROR'
    });
  }
});

// Unlike a post
router.delete('/:id/like', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;

    // Check if post exists
    const { data: post, error: postError } = await DatabaseService.getPostById(postId);
    
    if (postError || !post) {
      return res.status(404).json({ 
        error: 'Post not found',
        code: 'POST_NOT_FOUND'
      });
    }

    // Check if actually liked
    const { data: isLiked } = await DatabaseService.isPostLiked(userId, postId);
    
    if (!isLiked) {
      return res.status(400).json({ 
        error: 'Post not liked',
        code: 'NOT_LIKED'
      });
    }

    // Unlike the post
    const { error } = await DatabaseService.unlikePost(userId, postId);

    if (error) {
      console.error('Unlike post error:', error);
      return res.status(500).json({ 
        error: 'Failed to unlike post',
        code: 'UNLIKE_FAILED'
      });
    }

    res.json({ 
      message: 'Post un-watered successfully 🏺'
    });
  } catch (error) {
    console.error('Unlike post error:', error);
    res.status(500).json({ 
      error: 'Failed to unlike post',
      code: 'UNLIKE_ERROR'
    });
  }
});

export default router;
