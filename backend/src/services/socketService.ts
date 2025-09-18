import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { supabase } from './supabase';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

export const setupSocketHandlers = (io: Server) => {
  // Authentication middleware for Socket.IO
  io.use(async (socket: any, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
      
      // Verify user exists
      const { data: user, error } = await supabase
        .from('users')
        .select('id')
        .eq('id', decoded.userId)
        .single();

      if (error || !user) {
        return next(new Error('Authentication error'));
      }

      socket.userId = decoded.userId;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User ${socket.userId} connected`);

    // Join user to their personal room
    socket.join(`user:${socket.userId}`);

    // Handle messaging
    socket.on('join_conversation', (data: { otherUserId: string }) => {
      const conversationId = [socket.userId, data.otherUserId].sort().join(':');
      socket.join(`conversation:${conversationId}`);
    });

    socket.on('send_message', async (data: { receiverId: string; text: string; imageUrl?: string }) => {
      try {
        // Save message to database
        const { data: message, error } = await supabase
          .from('messages')
          .insert({
            sender_id: socket.userId,
            receiver_id: data.receiverId,
            text: data.text,
            image_url: data.imageUrl || null
          })
          .select(`
            *,
            sender:sender_id (
              id, username, display_name, avatar_url
            )
          `)
          .single();

        if (error) {
          socket.emit('message_error', { error: 'Failed to send message' });
          return;
        }

        // Send to conversation room
        const conversationId = [socket.userId, data.receiverId].sort().join(':');
        io.to(`conversation:${conversationId}`).emit('new_message', message);

        // Send notification to receiver
        io.to(`user:${data.receiverId}`).emit('message_notification', {
          senderId: socket.userId,
          message: message
        });
      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('message_error', { error: 'Failed to send message' });
      }
    });

    // Handle typing indicators
    socket.on('typing_start', (data: { receiverId: string }) => {
      socket.to(`user:${data.receiverId}`).emit('user_typing', {
        userId: socket.userId,
        isTyping: true
      });
    });

    socket.on('typing_stop', (data: { receiverId: string }) => {
      socket.to(`user:${data.receiverId}`).emit('user_typing', {
        userId: socket.userId,
        isTyping: false
      });
    });

    // Handle WebRTC signaling for calls
    socket.on('call_user', (data: { calleeId: string; offer: any; callType: 'voice' | 'video' }) => {
      socket.to(`user:${data.calleeId}`).emit('incoming_call', {
        callerId: socket.userId,
        offer: data.offer,
        callType: data.callType
      });
    });

    socket.on('answer_call', (data: { callerId: string; answer: any }) => {
      socket.to(`user:${data.callerId}`).emit('call_answered', {
        answer: data.answer
      });
    });

    socket.on('reject_call', (data: { callerId: string }) => {
      socket.to(`user:${data.callerId}`).emit('call_rejected');
    });

    socket.on('end_call', (data: { otherUserId: string }) => {
      socket.to(`user:${data.otherUserId}`).emit('call_ended');
    });

    socket.on('ice_candidate', (data: { otherUserId: string; candidate: any }) => {
      socket.to(`user:${data.otherUserId}`).emit('ice_candidate', {
        candidate: data.candidate
      });
    });

    socket.on('disconnect', () => {
      console.log(`User ${socket.userId} disconnected`);
    });
  });
};
