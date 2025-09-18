import { Router } from 'express';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';
import { supabase } from '../config/supabase';
import { 
  PostReport, 
  PostReportRequest, 
  ContentModerationAction,
  ModerationStats
} from '../types';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Report a post
router.post('/report', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const reporterId = req.user!.id;
    const { post_id, reason, description }: PostReportRequest = req.body;

    if (!post_id || !reason) {
      return res.status(400).json({ 
        error: 'Post ID and reason are required' 
      });
    }

    // Check if post exists
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('id, user_id')
      .eq('id', post_id)
      .single();

    if (postError || !post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Check if user already reported this post
    const { data: existingReport } = await supabase
      .from('post_reports')
      .select('id')
      .eq('post_id', post_id)
      .eq('reporter_id', reporterId)
      .single();

    if (existingReport) {
      return res.status(400).json({ 
        error: 'You have already reported this post' 
      });
    }

    // Create report
    const report: Omit<PostReport, 'post' | 'reporter'> = {
      id: uuidv4(),
      post_id,
      reporter_id: reporterId,
      reason,
      description,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: newReport, error: reportError } = await supabase
      .from('post_reports')
      .insert(report)
      .select()
      .single();

    if (reportError) throw reportError;

    // Update post status to reported if this is the first report
    const { data: reportCount } = await supabase
      .from('post_reports')
      .select('id', { count: 'exact' })
      .eq('post_id', post_id);

    if (reportCount && reportCount.length === 1) {
      await supabase
        .from('posts')
        .update({ 
          moderation_status: 'reported',
          reports_count: 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', post_id);
    } else {
      await supabase
        .from('posts')
        .update({ 
          reports_count: reportCount?.length || 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', post_id);
    }

    res.status(201).json({ 
      message: 'Post reported successfully. Our team will review it shortly.',
      report: newReport 
    });
  } catch (error) {
    console.error('Report post error:', error);
    res.status(500).json({ error: 'Failed to report post' });
  }
});

// Get user's reports
router.get('/my-reports', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const { data: reports, error } = await supabase
      .from('post_reports')
      .select(`
        *,
        post:posts(id, text, image_url, user_id, moderation_status)
      `)
      .eq('reporter_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ reports });
  } catch (error) {
    console.error('Get user reports error:', error);
    res.status(500).json({ error: 'Failed to get reports' });
  }
});

// Admin: Get all pending reports
router.get('/admin/reports', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { status = 'pending' } = req.query;

    const { data: reports, error } = await supabase
      .from('post_reports')
      .select(`
        *,
        post:posts(
          id, text, image_url, user_id, moderation_status, created_at,
          user:users(id, username, display_name, is_verified)
        ),
        reporter:users(id, username, display_name, is_verified)
      `)
      .eq('status', status)
      .order('created_at', { ascending: true });

    if (error) throw error;

    res.json({ reports });
  } catch (error) {
    console.error('Get admin reports error:', error);
    res.status(500).json({ error: 'Failed to get reports' });
  }
});

// Admin: Get posts pending moderation
router.get('/admin/pending-posts', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { data: posts, error } = await supabase
      .from('posts')
      .select(`
        *,
        user:users(id, username, display_name, is_verified, avatar_url)
      `)
      .in('moderation_status', ['pending', 'reported'])
      .order('created_at', { ascending: true });

    if (error) throw error;

    res.json({ posts });
  } catch (error) {
    console.error('Get pending posts error:', error);
    res.status(500).json({ error: 'Failed to get pending posts' });
  }
});

// Admin: Moderate post content
router.post('/admin/moderate-post', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const adminId = req.user!.id;
    const { 
      post_id, 
      action, 
      moderation_notes, 
      is_agriculture_related 
    }: ContentModerationAction = req.body;

    if (!post_id || !action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ 
        error: 'Valid post ID and action (approve/reject) are required' 
      });
    }

    // Get post
    const { data: post, error: fetchError } = await supabase
      .from('posts')
      .select('*')
      .eq('id', post_id)
      .single();

    if (fetchError || !post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    // Update post moderation status
    const { error: updateError } = await supabase
      .from('posts')
      .update({
        moderation_status: newStatus,
        is_agriculture_related,
        moderation_notes,
        moderated_by: adminId,
        moderated_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', post_id);

    if (updateError) throw updateError;

    // If post is rejected, mark all related reports as reviewed
    if (action === 'reject') {
      await supabase
        .from('post_reports')
        .update({
          status: 'reviewed',
          admin_notes: `Post rejected: ${moderation_notes || 'Not agriculture/environment related'}`,
          reviewed_by: adminId,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('post_id', post_id);
    }

    res.json({ 
      message: `Post ${action}d successfully`,
      status: newStatus
    });
  } catch (error) {
    console.error('Moderate post error:', error);
    res.status(500).json({ error: 'Failed to moderate post' });
  }
});

// Admin: Review report
router.post('/admin/review-report', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const adminId = req.user!.id;
    const { report_id, action, admin_notes } = req.body;

    if (!report_id || !action || !['dismiss', 'uphold'].includes(action)) {
      return res.status(400).json({ 
        error: 'Valid report ID and action (dismiss/uphold) are required' 
      });
    }

    // Get report
    const { data: report, error: fetchError } = await supabase
      .from('post_reports')
      .select('*')
      .eq('id', report_id)
      .single();

    if (fetchError || !report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    if (report.status !== 'pending') {
      return res.status(400).json({ 
        error: 'Report has already been reviewed' 
      });
    }

    // Update report status
    const { error: updateError } = await supabase
      .from('post_reports')
      .update({
        status: 'reviewed',
        admin_notes,
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', report_id);

    if (updateError) throw updateError;

    // If upholding the report, mark post for further review
    if (action === 'uphold') {
      await supabase
        .from('posts')
        .update({
          moderation_status: 'reported',
          updated_at: new Date().toISOString()
        })
        .eq('id', report.post_id);
    }

    res.json({ 
      message: `Report ${action === 'dismiss' ? 'dismissed' : 'upheld'} successfully`
    });
  } catch (error) {
    console.error('Review report error:', error);
    res.status(500).json({ error: 'Failed to review report' });
  }
});

// Admin: Get moderation statistics
router.get('/admin/stats', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    // Get post statistics
    const { data: postStats, error: postError } = await supabase
      .rpc('get_moderation_post_stats');

    // Get report statistics  
    const { data: reportStats, error: reportError } = await supabase
      .rpc('get_moderation_report_stats');

    if (postError || reportError) {
      throw postError || reportError;
    }

    const stats: ModerationStats = {
      total_posts: postStats?.total_posts || 0,
      pending_posts: postStats?.pending_posts || 0,
      reported_posts: postStats?.reported_posts || 0,
      approved_posts: postStats?.approved_posts || 0,
      rejected_posts: postStats?.rejected_posts || 0,
      total_reports: reportStats?.total_reports || 0,
      pending_reports: reportStats?.pending_reports || 0,
    };

    res.json({ stats });
  } catch (error) {
    console.error('Moderation stats error:', error);
    res.status(500).json({ error: 'Failed to get moderation statistics' });
  }
});

export default router;
