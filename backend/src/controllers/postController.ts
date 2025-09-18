import { Response } from 'express';
import { supabase } from '../services/supabase';
import { AuthRequest } from '../middleware/auth';

export const createPost = async (req: AuthRequest, res: Response) => {
  try {
    const { text, image_url } = req.body;
    const userId = req.user!.id;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Post text is required' });
    }

    if (text.length > 500) {
      return res.status(400).json({ error: 'Post text cannot exceed 500 characters' });
    }

    // Extract hashtags from text
    const hashtagRegex = /#[\w]+/g;
    const hashtags = text.match(hashtagRegex) || [];
    const uniqueHashtags = [...new Set(hashtags.map((tag: string) => tag.toLowerCase()))];

    // Create post
    const { data: post, error: postError } = await supabase
      .from('posts')
      .insert({
        user_id: userId,
        text: text.trim(),
        image_url: image_url || null
      })
      .select('*')
      .single();

    if (postError) {
      console.error('Create post error:', postError);
      return res.status(500).json({ error: 'Failed to create post' });
    }

    // Handle hashtags
    if (uniqueHashtags.length > 0) {
      // Insert hashtags (ignore conflicts)
      for (const hashtag of uniqueHashtags) {
        await supabase
          .from('hashtags')
          .upsert({ tag: hashtag }, { onConflict: 'tag' });
      }

      // Get hashtag IDs
      const { data: hashtagData } = await supabase
        .from('hashtags')
        .select('id, tag')
        .in('tag', uniqueHashtags);

      // Link post to hashtags
      if (hashtagData) {
        const postHashtags = hashtagData.map(ht => ({
          post_id: post.id,
          hashtag_id: ht.id
        }));

        await supabase
          .from('post_hashtags')
          .insert(postHashtags);
      }
    }

    // Get post with user info
    const { data: postWithUser } = await supabase
      .from('posts')
      .select(`
        *,
        users:user_id (
          id, username, display_name, avatar_url
        )
      `)
      .eq('id', post.id)
      .single();

    res.status(201).json({
      message: 'Post created successfully',
      post: {
        ...postWithUser,
        hashtags: uniqueHashtags,
        likes_count: 0,
        comments_count: 0,
        is_liked: false
      }
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getFeed = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    // Get posts from followed users + own posts
    const { data: posts, error } = await supabase
      .from('posts')
      .select(`
        *,
        users:user_id (
          id, username, display_name, avatar_url
        )
      `)
      .in('user_id', [
        userId,
        ...(await getFollowingIds(userId))
      ])
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Get feed error:', error);
      return res.status(500).json({ error: 'Failed to fetch feed' });
    }

    // Add hashtags and engagement data to each post
    const enrichedPosts = await Promise.all(
      posts.map(async (post) => {
        const hashtags = await getPostHashtags(post.id);
        return {
          ...post,
          hashtags,
          likes_count: 0, // TODO: Implement likes
          comments_count: 0, // TODO: Implement comments
          is_liked: false // TODO: Check if user liked
        };
      })
    );

    res.json({
      posts: enrichedPosts,
      pagination: {
        page,
        limit,
        hasMore: posts.length === limit
      }
    });
  } catch (error) {
    console.error('Get feed error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPostById = async (req: AuthRequest, res: Response) => {
  try {
    const { postId } = req.params;

    const { data: post, error } = await supabase
      .from('posts')
      .select(`
        *,
        users:user_id (
          id, username, display_name, avatar_url
        )
      `)
      .eq('id', postId)
      .single();

    if (error || !post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const hashtags = await getPostHashtags(post.id);

    res.json({
      ...post,
      hashtags,
      likes_count: 0,
      comments_count: 0,
      is_liked: false
    });
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deletePost = async (req: AuthRequest, res: Response) => {
  try {
    const { postId } = req.params;
    const userId = req.user!.id;

    // Check if post belongs to user
    const { data: post, error: fetchError } = await supabase
      .from('posts')
      .select('user_id')
      .eq('id', postId)
      .single();

    if (fetchError || !post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this post' });
    }

    // Delete post (cascades to post_hashtags)
    const { error: deleteError } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId);

    if (deleteError) {
      console.error('Delete post error:', deleteError);
      return res.status(500).json({ error: 'Failed to delete post' });
    }

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Helper functions
async function getFollowingIds(userId: string): Promise<string[]> {
  const { data: follows } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId);

  return follows?.map(f => f.following_id) || [];
}

async function getPostHashtags(postId: string): Promise<string[]> {
  const { data: hashtags } = await supabase
    .from('post_hashtags')
    .select(`
      hashtags!hashtag_id (
        tag
      )
    `)
    .eq('post_id', postId);

  return hashtags?.map((h: any) => h.hashtags?.tag).filter(Boolean) || [];
}
