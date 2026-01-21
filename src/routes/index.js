import express from 'express';
import matchRoutes from './matches.js';

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
});

// Match routes
router.use('/matches', matchRoutes);

export default router;
