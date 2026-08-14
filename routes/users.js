const express = require('express');
const router = express.Router();
const supabase = require('../db');
const authenticateUser = require('../middleware/auth');

// POST /api/users - persist the signed-in user's profile after signup.
router.post('/', authenticateUser, async (req, res) => {
  try {
    const { name, email } = req.body;

    if (typeof name !== 'string' || !name.trim() || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Name and email are required.' }
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const authenticatedEmail = req.user.email?.trim().toLowerCase();

    if (!authenticatedEmail || normalizedEmail !== authenticatedEmail) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Email must match the authenticated user.' }
      });
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .upsert({
        id: req.user.id,
        name: name.trim(),
        email: normalizedEmail
      }, { onConflict: 'id' })
      .select('id, email, name, created_at')
      .single();

    if (error) {
      return res.status(500).json({ error: { code: 'DB_ERROR', message: error.message } });
    }

    res.status(201).json(profile);
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

module.exports = router;