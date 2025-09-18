import { Router } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { supabase } from '../config/supabase';

const router = Router();

// Complete onboarding for the current user
router.post('/complete', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    // Update user's onboarding status
    const { error } = await supabase
      .from('users')
      .update({
        has_completed_onboarding: true,
        onboarding_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) throw error;

    res.json({ 
      message: 'Onboarding completed successfully! Welcome to PlantSpace! 🌱',
      completed_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Complete onboarding error:', error);
    res.status(500).json({ error: 'Failed to complete onboarding' });
  }
});

// Reset onboarding status (for testing/admin purposes)
router.post('/reset', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    // Reset user's onboarding status
    const { error } = await supabase
      .from('users')
      .update({
        has_completed_onboarding: false,
        onboarding_completed_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) throw error;

    res.json({ 
      message: 'Onboarding status reset successfully',
      reset_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Reset onboarding error:', error);
    res.status(500).json({ error: 'Failed to reset onboarding' });
  }
});

// Get onboarding status
router.get('/status', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const { data: user, error } = await supabase
      .from('users')
      .select('has_completed_onboarding, onboarding_completed_at, created_at')
      .eq('id', userId)
      .single();

    if (error) throw error;

    const isNewUser = user ? 
      (Date.now() - new Date(user.created_at).getTime()) < (24 * 60 * 60 * 1000) : // Less than 24 hours old
      false;

    res.json({ 
      has_completed_onboarding: user?.has_completed_onboarding || false,
      onboarding_completed_at: user?.onboarding_completed_at,
      is_new_user: isNewUser,
      should_show_onboarding: !user?.has_completed_onboarding
    });
  } catch (error) {
    console.error('Get onboarding status error:', error);
    res.status(500).json({ error: 'Failed to get onboarding status' });
  }
});

export default router;
