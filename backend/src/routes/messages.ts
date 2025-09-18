import express from 'express';
import {
  getConversations,
  getMessages,
  sendMessage,
  markMessagesAsRead,
  deleteMessage,
  getUnreadCount
} from '../controllers/messageController';

const router = express.Router();

// Get all conversations for the authenticated user
router.get('/conversations', getConversations);

// Get unread message count (must come before /:otherUserId route)
router.get('/unread/count', getUnreadCount);

// Get messages between authenticated user and another user
router.get('/:otherUserId', getMessages);

// Send a message (also available via Socket.IO)
router.post('/', sendMessage);

// Mark messages as read
router.put('/:otherUserId/read', markMessagesAsRead);

// Delete a message
router.delete('/:messageId', deleteMessage);

export default router;
