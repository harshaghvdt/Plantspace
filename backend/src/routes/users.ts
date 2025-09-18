import express from 'express';
import { 
  followUser, 
  unfollowUser, 
  getUserProfile, 
  searchUsers, 
  updateProfile 
} from '../controllers/userController';

const router = express.Router();

router.post('/:userId/follow', followUser);
router.delete('/:userId/follow', unfollowUser);
router.get('/search', searchUsers);
router.get('/:userId', getUserProfile);
router.put('/profile', updateProfile);

export default router;
