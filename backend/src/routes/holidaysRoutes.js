import { Router } from 'express';
import { getHolidays } from '../controllers/holidaysController.js';

const router = Router();

// Public route to fetch normalized holidays from Calendarific API
router.get('/', getHolidays);
router.get('/holidays', getHolidays);

export default router;
