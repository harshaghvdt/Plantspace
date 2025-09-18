import { Router } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { supabase } from '../config/supabase';

const router = Router();

// Get comments for a post
router.get('/posts/:postId/comments', async (req, res) => {
  try {
    const { postId } = req.params;

    const { data: comments, error } = await supabase
      .from('comments')
      .select(`
        *,
        user:user_id (
          id,
          username,
          display_name,
          avatar_url,
          is_verified
        )
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get comments error:', error);
      return res.status(500).json({ error: 'Failed to fetch comments' });
    }

    res.json({ comments: comments || [] });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add comment to a post
router.post('/posts/:postId/comments', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { postId } = req.params;
    const { text } = req.body;
    const userId = req.user!.id;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Comment text is required' });
    }

    if (text.length > 500) {
      return res.status(400).json({ error: 'Comment cannot exceed 500 characters' });
    }

    // Verify post exists
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('id')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Create comment
    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        user_id: userId,
        post_id: postId,
        text: text.trim()
      })
      .select(`
        *,
        user:user_id (
          id,
          username,
          display_name,
          avatar_url,
          is_verified
        )
      `)
      .single();

    if (error) {
      console.error('Create comment error:', error);
      return res.status(500).json({ error: 'Failed to create comment' });
    }

    res.status(201).json({ comment });
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete comment
router.delete('/:commentId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user!.id;

    // Verify comment exists and user owns it
    const { data: comment, error: fetchError } = await supabase
      .from('comments')
      .select('*')
      .eq('id', commentId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !comment) {
      return res.status(404).json({ error: 'Comment not found or unauthorized' });
    }

    // Delete comment
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      console.error('Delete comment error:', error);
      return res.status(500).json({ error: 'Failed to delete comment' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
