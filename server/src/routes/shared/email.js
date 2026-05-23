import { Router } from 'express';

const router = Router();

// GET /api/email/scan - return mock complaint emails (demo mode)
// TODO: Replace with Gmail OAuth integration when configured
router.get('/email/scan', async (req, res) => {
  try {
    const mockEmails = [
      {
        id: 'mock-001',
        subject: 'Wrong flavor received - Order #KK-4821',
        from: 'sarah.mitchell@gmail.com',
        date: '2026-05-05T14:23:00Z',
        body: 'Hi, I ordered the Mango Passion Fruit kefir (12-pack) but received Plain instead. This is the second time this has happened. Can I get the correct order shipped out? Order #KK-4821.',
        inbox: 'orders@kefirkultures.com',
      },
      {
        id: 'mock-002',
        subject: 'Bloated bottles in my delivery',
        from: 'james.r.cohen@outlook.com',
        date: '2026-05-04T09:47:00Z',
        body: 'Several bottles in my latest case (Lot KK-2026-0428) arrived visibly bloated and one had leaked inside the box. The best-before date is June 15. I am concerned about safety - is this normal for a fermented product or is this a quality issue? Photos attached.',
        inbox: 'quality@kefirkultures.com',
      },
      {
        id: 'mock-003',
        subject: 'Shipping damage - broken bottles',
        from: 'priya.desai@yahoo.ca',
        date: '2026-05-03T16:05:00Z',
        body: 'My Costco online order arrived with 3 out of 8 bottles shattered. The box was clearly crushed on one side. Lot number on surviving bottles is KK-2026-0501. I would like a replacement or refund. This was supposed to be a gift.',
        inbox: 'orders@kefirkultures.com',
      },
      {
        id: 'mock-004',
        subject: 'Off taste in Blueberry Lavender batch',
        from: 'mike.tanaka@rogers.com',
        date: '2026-05-02T11:30:00Z',
        body: 'Long-time customer here. The latest Blueberry Lavender kefir (bought at Whole Foods, lot KK-2026-0425) has a noticeably sour/vinegary taste compared to what I normally get. Wondering if something changed in the recipe or if this might be a bad batch?',
        inbox: 'quality@kefirkultures.com',
      },
    ];

    res.json(mockEmails);
  } catch (err) {
    console.error('Email scan error:', err);
    res.status(500).json({ error: 'Failed to scan emails' });
  }
});

export default router;
