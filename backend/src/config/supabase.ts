import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Database helper functions
export class DatabaseService {
  // User operations
  static async createUser(userData: {
    username: string;
    email: string;
    password_hash: string;
    display_name: string;
  }) {
    const { data, error } = await supabase
      .from('users')
      .insert(userData)
      .select()
      .single();
    
    return { data, error };
  }

  static async getUserByEmail(email: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    return { data, error };
  }

  static async getUserByUsername(username: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();
    
    return { data, error };
  }

  static async getUserById(id: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    return { data, error };
  }

  static async updateUser(id: string, updates: any) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    return { data, error };
  }

  // Post operations
  static async createPost(postData: {
    user_id: string;
    text: string;
    image_url?: string;
    hashtags?: string[];
  }) {
    const { data, error } = await supabase
      .from('posts')
      .insert(postData)
      .select(`
        *,
        users:user_id (
          id,
          username,
          display_name,
          avatar_url,
          is_verified
        )
      `)
      .single();
    
    return { data, error };
  }

  static async getPosts(page: number = 1, limit: number = 20, userId?: string) {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        users:user_id (
          id,
          username,
          display_name,
          avatar_url,
          is_verified
        )
      `)
      .eq('moderation_status', 'approved')
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    return { data, error };
  }

  static async getPostById(id: string, userId?: string) {
    let query = supabase
      .from('posts')
      .select(`
        *,
        users:user_id (
          id,
          username,
          display_name,
          avatar_url,
          is_verified
        )
      `)
      .eq('id', id)
      .single();

    const { data, error } = await query;
    return { data, error };
  }

  static async updatePost(id: string, updates: any) {
    const { data, error } = await supabase
      .from('posts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    return { data, error };
  }

  static async deletePost(id: string) {
    const { data, error } = await supabase
      .from('posts')
      .delete()
      .eq('id', id);
    
    return { data, error };
  }

  // Like operations
  static async likePost(userId: string, postId: string) {
    const { data, error } = await supabase
      .from('likes')
      .insert({ user_id: userId, post_id: postId })
      .select()
      .single();
    
    return { data, error };
  }

  static async unlikePost(userId: string, postId: string) {
    const { data, error } = await supabase
      .from('likes')
      .delete()
      .eq('user_id', userId)
      .eq('post_id', postId);
    
    return { data, error };
  }

  static async isPostLiked(userId: string, postId: string) {
    const { data, error } = await supabase
      .from('likes')
      .select('id')
      .eq('user_id', userId)
      .eq('post_id', postId)
      .single();
    
    return { data: !!data, error };
  }

  // Follow operations
  static async followUser(followerId: string, followingId: string) {
    const { data, error } = await supabase
      .from('follows')
      .insert({ follower_id: followerId, following_id: followingId })
      .select()
      .single();
    
    return { data, error };
  }

  static async unfollowUser(followerId: string, followingId: string) {
    const { data, error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId);
    
    return { data, error };
  }

  static async isFollowing(followerId: string, followingId: string) {
    const { data, error } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .single();
    
    return { data: !!data, error };
  }

  // Comment operations
  static async createComment(commentData: {
    user_id: string;
    post_id: string;
    text: string;
  }) {
    const { data, error } = await supabase
      .from('comments')
      .insert(commentData)
      .select(`
        *,
        users:user_id (
          id,
          username,
          display_name,
          avatar_url,
          is_verified
        )
      `)
      .single();
    
    return { data, error };
  }

  static async getCommentsByPostId(postId: string) {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        users:user_id (
          id,
          username,
          display_name,
          avatar_url,
          is_verified
        )
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    
    return { data, error };
  }

  // Search operations
  static async searchPosts(query: string, page: number = 1, limit: number = 20) {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        users:user_id (
          id,
          username,
          display_name,
          avatar_url,
          is_verified
        )
      `)
      .eq('moderation_status', 'approved')
      .or(`text.ilike.%${query}%,hashtags.cs.{${query}}`)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);
    
    return { data, error };
  }

  static async searchUsers(query: string, page: number = 1, limit: number = 20) {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, display_name, avatar_url, is_verified, bio')
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .order('is_verified', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);
    
    return { data, error };
  }

  // Verification operations
  static async createVerificationRequest(requestData: {
    user_id: string;
    proof_of_work_url: string;
    selfie_url: string;
    work_description: string;
  }) {
    const { data, error } = await supabase
      .from('verification_requests')
      .insert(requestData)
      .select()
      .single();
    
    return { data, error };
  }

  // Report operations
  static async createPostReport(reportData: {
    post_id: string;
    reporter_id: string;
    reason: string;
    description?: string;
  }) {
    const { data, error } = await supabase
      .from('post_reports')
      .insert(reportData)
      .select()
      .single();
    
    return { data, error };
  }

  // File upload helper
  static async uploadFile(bucket: string, path: string, file: File) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file);
    
    if (error) return { data: null, error };
    
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);
    
    return { data: urlData.publicUrl, error: null };
  }

  // Get file URL
  static getFileUrl(bucket: string, path: string) {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);
    
    return data.publicUrl;
  }
}
