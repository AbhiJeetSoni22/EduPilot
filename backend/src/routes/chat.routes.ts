import { Router } from 'express';
import { sendMessage, getConversation } from '../controllers/chat.controller';

const router = Router();

// Public Chatbot Endpoints (No student authentication required)
router.post('/', sendMessage);
router.get('/:id', getConversation);

export default router;
