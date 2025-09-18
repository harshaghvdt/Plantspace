import { Router } from 'express';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';
import { supabase } from '../config/supabase';
import { 
  VerificationRequest, 
  VerificationSubmissionRequest, 
  AdminVerificationAction,
  UsernameCheckRequest,
  UsernameCheckResponse
} from '../types';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Check username availability
router.post('/check-username', async (req, res) => {
  try {
    const { username }: UsernameCheckRequest = req.body;

    if (!username || username.length < 3) {
      return res.status(400).json({ 
        error: 'Username must be at least 3 characters long' 
      });
    }

    // Check if username exists
    const { data: existingUser, error } = await supabase
      .from('users')
      .select('username')
      .eq('username', username.toLowerCase())
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error;
    }

    const available = !existingUser;
    let suggestions: string[] = [];

    // Generate suggestions if username is taken
    if (!available) {
      const baseUsername = username.toLowerCase();
      suggestions = [
        `${baseUsername}_farmer`,
        `${baseUsername}_green`,
        `${baseUsername}_eco`,
        `${baseUsername}${Math.floor(Math.random() * 999)}`,
        `eco_${baseUsername}`,
        `green_${baseUsername}`
      ];
    }

    const response: UsernameCheckResponse = {
      available,
      suggestions: available ? undefined : suggestions
    };

    res.json(response);
  } catch (error) {
    console.error('Username check error:', error);
    res.status(500).json({ error: 'Failed to check username availability' });
  }
});

// Submit verification request
router.post('/submit', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { 
      proof_of_work_url, 
      selfie_url, 
      work_description 
    }: VerificationSubmissionRequest = req.body;

    if (!proof_of_work_url || !selfie_url || !work_description) {
      return res.status(400).json({ 
        error: 'All verification materials are required' 
      });
    }

    // Check if user already has a pending or approved verification
    const { data: existingRequest } = await supabase
      .from('verification_requests')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['pending', 'approved'])
      .single();

    if (existingRequest) {
      return res.status(400).json({ 
        error: existingRequest.status === 'approved' 
          ? 'User is already verified' 
          : 'Verification request already pending'
      });
    }

    // Create verification request
    const verificationRequest: Omit<VerificationRequest, 'user'> = {
      id: uuidv4(),
      user_id: userId,
      proof_of_work_url,
      selfie_url,
      work_description,
      status: 'pending',
      submitted_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('verification_requests')
      .insert(verificationRequest)
      .select()
      .single();

    if (error) throw error;

    // Update user verification status to pending
    await supabase
      .from('users')
      .update({ 
        verification_status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    res.status(201).json({ 
      message: 'Verification request submitted successfully',
      verification_request: data 
    });
  } catch (error) {
    console.error('Verification submission error:', error);
    res.status(500).json({ error: 'Failed to submit verification request' });
  }
});

// Get user's verification status
router.get('/status', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const { data: verificationRequest, error } = await supabase
      .from('verification_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    res.json({ 
      verification_request: verificationRequest || null,
      user_verification_status: req.user!.verification_status,
      is_verified: req.user!.is_verified
    });
  } catch (error) {
    console.error('Verification status error:', error);
    res.status(500).json({ error: 'Failed to get verification status' });
  }
});

// Admin: Get all pending verification requests
router.get('/admin/pending', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { data: requests, error } = await supabase
      .from('verification_requests')
      .select(`
        *,
        user:users(id, username, display_name, email, avatar_url)
      `)
      .eq('status', 'pending')
      .order('submitted_at', { ascending: true });

    if (error) throw error;

    res.json({ verification_requests: requests });
  } catch (error) {
    console.error('Admin pending verifications error:', error);
    res.status(500).json({ error: 'Failed to get pending verification requests' });
  }
});

// Admin: Approve or reject verification request
router.post('/admin/review', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const adminId = req.user!.id;
    const { 
      verification_id, 
      action, 
      admin_notes 
    }: AdminVerificationAction = req.body;

    if (!verification_id || !action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ 
        error: 'Valid verification ID and action (approve/reject) are required' 
      });
    }

    // Get verification request
    const { data: verificationRequest, error: fetchError } = await supabase
      .from('verification_requests')
      .select('*')
      .eq('id', verification_id)
      .single();

    if (fetchError || !verificationRequest) {
      return res.status(404).json({ error: 'Verification request not found' });
    }

    if (verificationRequest.status !== 'pending') {
      return res.status(400).json({ 
        error: 'Verification request has already been reviewed' 
      });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const isVerified = action === 'approve';

    // Update verification request
    const { error: updateError } = await supabase
      .from('verification_requests')
      .update({
        status: newStatus,
        admin_notes,
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminId,
        updated_at: new Date().toISOString()
      })
      .eq('id', verification_id);

    if (updateError) throw updateError;

    // Update user verification status
    const { error: userUpdateError } = await supabase
      .from('users')
      .update({
        is_verified: isVerified,
        verification_status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', verificationRequest.user_id);

    if (userUpdateError) throw userUpdateError;

    res.json({ 
      message: `Verification request ${action}d successfully`,
      status: newStatus
    });
  } catch (error) {
    console.error('Admin verification review error:', error);
    res.status(500).json({ error: 'Failed to review verification request' });
  }
});

// Admin: Get verification statistics
router.get('/admin/stats', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { data: stats, error } = await supabase
      .rpc('get_verification_stats');

    if (error) throw error;

    res.json({ stats });
  } catch (error) {
    console.error('Verification stats error:', error);
    res.status(500).json({ error: 'Failed to get verification statistics' });
  }
});

export default router;
