// src/routes/saveSubscription.js
const express = require('express');
const router = express.Router();
const User = require('../models/Auth');

// Save user's push subscription
router.post('/', async (req, res) => {
  const { userId, subscription } = req.body;

  if (!userId || !subscription) {
    return res.status(400).json({ message: 'Missing userId or subscription' });
  }

  try {
    await User.findByIdAndUpdate(userId, { subscription }, { new: true, upsert: true });
    res.status(200).json({ message: 'Subscription saved successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error saving subscription', error: err.message });
  }
});

module.exports = router;
