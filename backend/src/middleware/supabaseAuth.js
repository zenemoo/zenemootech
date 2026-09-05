import { supabase } from '../config/supabase.js';

/**
 * Middleware to authenticate requests using Supabase Auth Bearer JWT tokens.
 * Verifies the token with Supabase and extracts the verified email address.
 */
export const supabaseAuthMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Missing or invalid Supabase bearer token',
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token || token === 'undefined' || token === 'null') {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Empty bearer token',
      });
    }

    if (!supabase) {
      return res.status(500).json({
        success: false,
        message: 'Server configuration error: Supabase client is not available',
      });
    }

    // Securely verify token via Supabase Auth API
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Invalid or expired Supabase session',
        error: error ? error.message : undefined,
      });
    }

    // Attach verified user and normalized email
    const email = (user.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Verified email is missing from auth token',
      });
    }

    req.supabaseUser = user;
    req.talentEmail = email;
    next();
  } catch (err) {
    console.error('[Supabase Auth Middleware Error]:', err.message);
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Authentication failed',
    });
  }
};
