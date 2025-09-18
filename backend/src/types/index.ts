export interface User {
  id: string;
  username: string; // Unique username/ID - no duplicates allowed
  email: string;
  display_name: string;
  bio?: string;
  avatar_url?: string;
  cover_url?: string;
  is_verified: boolean; // Verification badge status
  verification_status: 'none' | 'pending' | 'approved' | 'rejected';
  has_completed_onboarding: boolean; // Track if user has seen the tour
  onboarding_completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: string;
  user_id: string;
  text: string;
  image_url?: string;
  hashtags: string[];
  created_at: string;
  updated_at: string;
  user?: User;
  likes_count?: number;
  comments_count?: number;
  is_liked?: boolean;
  // Content moderation fields
  moderation_status: 'approved' | 'pending' | 'rejected' | 'reported';
  is_agriculture_related: boolean;
  moderation_notes?: string;
  moderated_by?: string; // Admin user ID
  moderated_at?: string;
  reports_count?: number;
}

export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  text: string;
  image_url?: string;
  created_at: string;
  read_at?: string;
  sender?: User;
  receiver?: User;
}

export interface Call {
  id: string;
  caller_id: string;
  callee_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'ended' | 'missed';
  call_type: 'voice' | 'video';
  started_at?: string;
  ended_at?: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'like' | 'comment' | 'follow' | 'message' | 'call';
  actor_id: string;
  entity_id?: string;
  message: string;
  read_at?: string;
  created_at: string;
  actor?: User;
}

export interface AuthRequest extends Request {
  user?: User;
}

export interface LoginRequest {
  identifier: string; // email or username
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  display_name: string;
}

export interface VerificationRequest {
  id: string;
  user_id: string;
  proof_of_work_url: string; // Live capture of proof of work
  selfie_url: string; // Live selfie capture
  work_description: string; // Description of agricultural/environmental work
  status: 'pending' | 'approved' | 'rejected';
  admin_notes?: string;
  submitted_at: string;
  reviewed_at?: string;
  reviewed_by?: string; // Admin user ID
  created_at: string;
  updated_at: string;
  user?: User;
}

export interface UsernameCheckRequest {
  username: string;
}

export interface UsernameCheckResponse {
  available: boolean;
  suggestions?: string[]; // Alternative username suggestions if not available
}

export interface VerificationSubmissionRequest {
  proof_of_work_url: string;
  selfie_url: string;
  work_description: string;
}

export interface AdminVerificationAction {
  verification_id: string;
  action: 'approve' | 'reject';
  admin_notes?: string;
}

export interface PostReport {
  id: string;
  post_id: string;
  reporter_id: string;
  reason: 'not_agriculture_related' | 'spam' | 'inappropriate' | 'misinformation' | 'other';
  description?: string;
  status: 'pending' | 'reviewed' | 'dismissed';
  admin_notes?: string;
  reviewed_by?: string; // Admin user ID
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
  post?: Post;
  reporter?: User;
}

export interface PostReportRequest {
  post_id: string;
  reason: 'not_agriculture_related' | 'spam' | 'inappropriate' | 'misinformation' | 'other';
  description?: string;
}

export interface ContentModerationAction {
  post_id: string;
  action: 'approve' | 'reject';
  moderation_notes?: string;
  is_agriculture_related: boolean;
}

export interface ModerationStats {
  total_posts: number;
  pending_posts: number;
  reported_posts: number;
  approved_posts: number;
  rejected_posts: number;
  total_reports: number;
  pending_reports: number;
}
