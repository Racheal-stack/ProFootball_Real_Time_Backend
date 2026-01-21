import express from 'express';
import MatchController from '../controllers/matchController.js';
import SSEController from '../controllers/sseController.js';

const router = express.Router();

// GET /api/matches - Get all matches
router.get('/', MatchController.getAllMatches);

// GET /api/matches/:id/events/stream - SSE stream for match events (must come before /:id)
router.get('/:id/events/stream', (req, res) => SSEController.streamMatchEvents(req, res));

// GET /api/matches/:id - Get match by ID
router.get('/:id', MatchController.getMatchById);

export default router;
