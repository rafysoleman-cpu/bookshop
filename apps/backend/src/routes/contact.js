import express from 'express';
import { sendEmail } from '../services/email.service.js';
import { EMAIL_CONFIG } from '../services/emailConfig.js';

const router = express.Router();

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

// @desc    Send a contact message to the store owner
// @route   POST /api/v1/contact
// @access  Public
router.post('/', async (req, res, next) => {
  try {
    const { name, email, subject, message } = req.body;
    const trimmedName = typeof name === 'string' ? name.trim() : '';
    const trimmedEmail = typeof email === 'string' ? email.trim() : '';
    const trimmedSubject = typeof subject === 'string' ? subject.trim() : '';
    const trimmedMessage = typeof message === 'string' ? message.trim() : '';

    if (!trimmedName || !trimmedEmail || !trimmedSubject || !trimmedMessage) {
      return res.status(400).json({
        success: false,
        error: 'Name, email, subject, and message are required.'
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid email address.'
      });
    }

    if (trimmedName.length > 100 || trimmedSubject.length > 150 || trimmedMessage.length > 5000) {
      return res.status(400).json({
        success: false,
        error: 'Your message is too long.'
      });
    }

    const html = `
      <h2>New contact message</h2>
      <p><strong>Name:</strong> ${escapeHtml(trimmedName)}</p>
      <p><strong>Email:</strong> ${escapeHtml(trimmedEmail)}</p>
      <p><strong>Subject:</strong> ${escapeHtml(trimmedSubject)}</p>
      <p><strong>Message:</strong></p>
      <p>${escapeHtml(trimmedMessage).replace(/\n/g, '<br />')}</p>
    `;

    const result = await sendEmail(
      EMAIL_CONFIG.supportEmail,
      `BookShop contact: ${trimmedSubject}`,
      html,
      `Name: ${trimmedName}\nEmail: ${trimmedEmail}\nSubject: ${trimmedSubject}\n\n${trimmedMessage}`
    );

    if (!result?.success) {
      return res.status(502).json({
        success: false,
        error: 'The message could not be sent right now. Please try again later.'
      });
    }

    res.json({
      success: true,
      message: 'Message sent successfully.'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
