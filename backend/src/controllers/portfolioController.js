import { supabaseService } from '../services/supabaseService.js';

let memoryPortfolio = [
  {
    id: '1',
    title: 'DesiCrew Multilingual Speech Dataset',
    category: 'Speech AI',
    image_url: '/assets/hero_enhanced.png',
    description: '3,600+ minutes of timestamped verbatim Hindi and Odia speech datasets.',
    client: 'DesiCrew Solutions',
  },
];

export const getPortfolio = async (req, res, next) => {
  try {
    const data = await supabaseService.selectAll('portfolio');
    if (data && data.length > 0) return res.json({ success: true, data });
    res.json({ success: true, data: memoryPortfolio });
  } catch (err) {
    res.json({ success: true, data: memoryPortfolio });
  }
};

export const createPortfolio = async (req, res, next) => {
  try {
    const newItem = { id: Date.now().toString(), ...req.body };
    try {
      const created = await supabaseService.insert('portfolio', newItem);
      if (created) return res.status(201).json({ success: true, data: created });
    } catch (e) {}

    memoryPortfolio.unshift(newItem);
    res.status(201).json({ success: true, data: newItem });
  } catch (err) {
    next(err);
  }
};
