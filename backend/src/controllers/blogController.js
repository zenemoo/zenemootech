import { supabaseService } from '../services/supabaseService.js';

let memoryBlog = [
  {
    id: '1',
    title: 'Building High-Accuracy Hindi & Odia Datasets for Speech AI',
    slug: 'hindi-odia-speech-ai-datasets',
    content: 'Deep dive into verbatim audio transcription, speaker diarization, and quality control pipelines.',
    author: 'Prem Prasad Pradhan',
    published: true,
  },
];

export const getBlog = async (req, res, next) => {
  try {
    const data = await supabaseService.selectAll('blog');
    if (data && data.length > 0) return res.json({ success: true, data });
    res.json({ success: true, data: memoryBlog });
  } catch (err) {
    res.json({ success: true, data: memoryBlog });
  }
};

export const createBlog = async (req, res, next) => {
  try {
    const newPost = { id: Date.now().toString(), ...req.body };
    try {
      const created = await supabaseService.insert('blog', newPost);
      if (created) return res.status(201).json({ success: true, data: created });
    } catch (e) {}

    memoryBlog.unshift(newPost);
    res.status(201).json({ success: true, data: newPost });
  } catch (err) {
    next(err);
  }
};
