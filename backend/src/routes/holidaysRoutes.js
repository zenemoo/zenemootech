import { Router } from 'express';
import { getIndianHolidays } from '../controllers/holidaysController.js';

const router = Router();

// Public route to fetch Indian public holidays via Calendarific server proxy
router.get('/', getIndianHolidays);
router.get('/IN/:year', getIndianHolidays);
router.get('/:year', getIndianHolidays);

export default router;
