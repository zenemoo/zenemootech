import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabase } from '../config/supabase.js';
import { cloudinaryService } from './cloudinaryService.js';
import { generateCloudinaryPublicId } from '../utils/imageSeoHelper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCAL_STORE_DIR = path.resolve(__dirname, '../database');
const LOCAL_STORE_FILE = path.resolve(LOCAL_STORE_DIR, 'staff_id_cards_store.json');

const STAFF_PROJECTION_COLUMNS = 'id, name, designation, department, employee_id, slug, image_url, email, phone, status, badge, joining_date, experience, location';

export class StaffIdCardService {
  constructor() {
    this.memoryStore = new Map();
    this.ensureLocalStorage();
    this.loadFromDisk();
  }

  ensureLocalStorage() {
    try {
      if (!fs.existsSync(LOCAL_STORE_DIR)) {
        fs.mkdirSync(LOCAL_STORE_DIR, { recursive: true });
      }
      if (!fs.existsSync(LOCAL_STORE_FILE)) {
        fs.writeFileSync(LOCAL_STORE_FILE, JSON.stringify({ cards: [] }, null, 2), 'utf8');
      }
    } catch (e) {
      console.warn('Failed to initialize local staff_id_cards_store.json:', e.message);
    }
  }

  loadFromDisk() {
    try {
      if (fs.existsSync(LOCAL_STORE_FILE)) {
        const raw = fs.readFileSync(LOCAL_STORE_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed?.cards)) {
          this.memoryStore.clear();
          for (const card of parsed.cards) {
            if (card.id) this.memoryStore.set(card.id, card);
          }
        }
      }
    } catch (e) {
      console.warn('Error reading staff_id_cards_store.json:', e.message);
    }
  }

  saveToDisk() {
    try {
      const cards = Array.from(this.memoryStore.values());
      fs.writeFileSync(LOCAL_STORE_FILE, JSON.stringify({ cards }, null, 2), 'utf8');
    } catch (e) {
      console.warn('Error saving to staff_id_cards_store.json:', e.message);
    }
  }

  /**
   * Egress-Minimized Single/Multi Staff Lookup
   * Queries exact Staff ID, UUID, derived fallback ZNM-XXXXX prefix, or name.
   */
  async lookupStaff(queryStr) {
    const clean = String(queryStr || '').trim();
    if (!clean) return { found: false, count: 0, records: [] };

    const cleanUpper = clean.toUpperCase();
    const cleanId = cleanUpper.startsWith('ZNM-') ? cleanUpper.replace('ZNM-', '') : cleanUpper;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean);

    if (supabase) {
      try {
        // 1. Exact UUID match
        if (isUuid) {
          const { data, error } = await supabase
            .from('team')
            .select(STAFF_PROJECTION_COLUMNS)
            .eq('id', clean)
            .limit(1);
          if (!error && data?.length > 0) {
            return { found: true, count: 1, records: data };
          }
        }

        // 2. Exact employee_id or name match
        const { data: textMatches, error: textErr } = await supabase
          .from('team')
          .select(STAFF_PROJECTION_COLUMNS)
          .or(`employee_id.ilike.${clean},name.ilike.%${clean}%`)
          .limit(10);

        if (!textErr && textMatches?.length > 0) {
          return { found: true, count: textMatches.length, records: textMatches };
        }

        // 3. Derived ZNM fallback ID matching (UUID range search on first 5 chars)
        if (cleanId.length >= 4 && cleanId.length <= 8 && /^[0-9A-F]+$/i.test(cleanId)) {
          const minUuid = cleanId.toLowerCase().padEnd(8, '0') + '-0000-0000-0000-000000000000';
          const maxUuid = cleanId.toLowerCase().padEnd(8, 'f') + '-ffff-ffff-ffff-ffffffffffff';
          const { data: rangeMatches, error: rangeErr } = await supabase
            .from('team')
            .select(STAFF_PROJECTION_COLUMNS)
            .gte('id', minUuid)
            .lte('id', maxUuid)
            .limit(5);

          if (!rangeErr && rangeMatches?.length > 0) {
            return { found: true, count: rangeMatches.length, records: rangeMatches };
          }
        }
      } catch (err) {
        console.warn('Supabase lookup error, falling back:', err.message);
      }
    }

    return { found: false, count: 0, records: [] };
  }

  /**
   * Get all saved card configurations (minimal list projection)
   */
  async getSavedCards(options = {}) {
    const { search = '' } = options;

    if (supabase) {
      try {
        let query = supabase
          .from('staff_id_cards')
          .select('id, staff_id, team_member_id, mode, card_full_name, card_designation, card_department, card_email, card_phone, card_photo_url, card_photo_public_id, card_photo_is_owned, card_joining_year, qr_destination_url, field_visibility, theme_preset, updated_at')
          .order('updated_at', { ascending: false });

        if (search) {
          query = query.or(`staff_id.ilike.%${search}%,card_full_name.ilike.%${search}%`);
        }

        const { data, error } = await query;
        if (!error && Array.isArray(data)) {
          return { success: true, count: data.length, cards: data };
        }
      } catch (err) {
        console.warn('Supabase getSavedCards error, using local fallback:', err.message);
      }
    }

    // Local file fallback
    this.loadFromDisk();
    let cards = Array.from(this.memoryStore.values());
    if (search) {
      const q = search.toLowerCase();
      cards = cards.filter((c) =>
        (c.staff_id || '').toLowerCase().includes(q) || (c.card_full_name || '').toLowerCase().includes(q)
      );
    }
    cards.sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime());
    return { success: true, count: cards.length, cards };
  }

  /**
   * Get a single saved card by ID and verify source team member
   */
  async getCardById(id) {
    if (!id) return null;

    let card = null;

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('staff_id_cards')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        if (!error && data) card = data;
      } catch (e) {}
    }

    if (!card) {
      this.loadFromDisk();
      card = this.memoryStore.get(id) || null;
    }

    if (!card) return null;

    // Verify if source team record still exists
    let sourceMember = null;
    let sourceMemberMissing = false;
    if (card.team_member_id && supabase) {
      try {
        const { data, error } = await supabase
          .from('team')
          .select(STAFF_PROJECTION_COLUMNS)
          .eq('id', card.team_member_id)
          .maybeSingle();
        if (!error && data) {
          sourceMember = data;
        } else {
          sourceMemberMissing = true;
        }
      } catch (e) {
        sourceMemberMissing = true;
      }
    }

    return {
      card,
      sourceMember,
      sourceMemberMissing,
    };
  }

  /**
   * Save or Update a card configuration
   */
  async saveCard(payload, adminEmail = 'admin') {
    const {
      id,
      staff_id,
      team_member_id,
      mode = 'manual',
      card_full_name,
      card_designation = '',
      card_department = '',
      card_email = '',
      card_phone = '',
      card_photo_url = '',
      card_photo_public_id = '',
      card_photo_is_owned = false,
      card_joining_year = '',
      qr_destination_url = '',
      field_visibility = {},
      theme_preset = 'signature_light',
      notes = '',
    } = payload;

    if (!staff_id || !staff_id.trim()) {
      throw new Error('Staff ID is required to save an ID card.');
    }
    if (!card_full_name || !card_full_name.trim()) {
      throw new Error('Employee name is required to save an ID card.');
    }

    const cleanStaffId = staff_id.trim();
    const now = new Date().toISOString();

    // Check for existing card with this staff_id or id
    let existingCard = null;
    if (id) {
      const found = await this.getCardById(id);
      existingCard = found?.card || null;
    }
    if (!existingCard) {
      // Check by staff_id
      if (supabase) {
        try {
          const { data } = await supabase
            .from('staff_id_cards')
            .select('*')
            .ilike('staff_id', cleanStaffId)
            .maybeSingle();
          if (data) existingCard = data;
        } catch (e) {}
      }
      if (!existingCard) {
        existingCard = Array.from(this.memoryStore.values()).find(
          (c) => (c.staff_id || '').toLowerCase() === cleanStaffId.toLowerCase()
        ) || null;
      }
    }

    const targetId = existingCard?.id || id || `card_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const cardRecord = {
      id: targetId,
      staff_id: cleanStaffId,
      team_member_id: team_member_id || existingCard?.team_member_id || null,
      mode: mode === 'fetched' ? 'fetched' : 'manual',
      card_full_name: card_full_name.trim(),
      card_designation: card_designation.trim(),
      card_department: card_department.trim(),
      card_email: card_email.trim(),
      card_phone: card_phone.trim(),
      card_photo_url: card_photo_url.trim(),
      card_photo_public_id: card_photo_public_id.trim(),
      card_photo_is_owned: Boolean(card_photo_is_owned),
      card_joining_year: card_joining_year ? String(card_joining_year).trim() : '',
      qr_destination_url: qr_destination_url.trim(),
      field_visibility: typeof field_visibility === 'object' && field_visibility !== null ? field_visibility : {
        designation: true,
        staff_id: true,
        email: true,
        phone: true,
        department: true,
        joining_year: true,
        qr_code: true,
      },
      theme_preset: theme_preset || 'signature_light',
      notes: notes || '',
      created_by: adminEmail || 'admin',
      created_at: existingCard?.created_at || now,
      updated_at: now,
    };

    // Safe Cloudinary replacement check:
    // If the card owned an old photo and it was replaced with a new one, clean the old one
    if (
      existingCard &&
      existingCard.card_photo_is_owned &&
      existingCard.card_photo_public_id &&
      card_photo_public_id &&
      existingCard.card_photo_public_id !== card_photo_public_id
    ) {
      await this.safelyCleanCloudinaryAsset(existingCard.card_photo_public_id, targetId);
    }

    let savedRecord = null;
    if (supabase) {
      try {
        if (existingCard?.id) {
          const { data, error } = await supabase
            .from('staff_id_cards')
            .update(cardRecord)
            .eq('id', existingCard.id)
            .select()
            .maybeSingle();
          if (!error && data) savedRecord = data;
        } else {
          const { data, error } = await supabase
            .from('staff_id_cards')
            .insert([cardRecord])
            .select()
            .maybeSingle();
          if (!error && data) savedRecord = data;
        }
      } catch (err) {
        console.warn('Supabase saveCard warning, updating local disk store:', err.message);
      }
    }

    // Update memory and disk
    const finalRecord = savedRecord || cardRecord;
    this.memoryStore.set(finalRecord.id, finalRecord);
    this.saveToDisk();

    return finalRecord;
  }

  /**
   * Delete a card configuration with safe Cloudinary asset cleanup
   */
  async deleteCard(id) {
    if (!id) throw new Error('Card ID is required for deletion.');

    const found = await this.getCardById(id);
    const card = found?.card;
    if (!card) {
      throw new Error('Staff ID card not found.');
    }

    // CRITICAL OWNERSHIP RULE:
    // If card owned a Cloudinary asset, safely check ownership and clean ONLY if unreferenced!
    if (card.card_photo_is_owned && card.card_photo_public_id) {
      await this.safelyCleanCloudinaryAsset(card.card_photo_public_id, id);
    }

    if (supabase) {
      try {
        await supabase.from('staff_id_cards').delete().eq('id', id);
      } catch (err) {
        console.warn('Supabase deleteCard warning:', err.message);
      }
    }

    this.memoryStore.delete(id);
    this.saveToDisk();

    return { success: true, deletedId: id };
  }

  /**
   * CRITICAL OWNERSHIP VERIFICATION & CLEANUP:
   * 1. Never delete original photo referenced by team.image_url.
   * 2. Never delete asset shared by other staff records, cards or media.
   * 3. Never delete asset when ownership cannot be established.
   */
  async safelyCleanCloudinaryAsset(publicId, cardId) {
    if (!publicId) return;

    try {
      // Check 1: Does any team member use this photo in team.image_url?
      if (supabase) {
        const { data: teamMembers } = await supabase
          .from('team')
          .select('id, image_url')
          .ilike('image_url', `%${publicId}%`)
          .limit(1);

        if (teamMembers && teamMembers.length > 0) {
          console.warn(`[Safe Cloudinary Guard] Asset ${publicId} is referenced by team member ${teamMembers[0].id}. Skipping deletion.`);
          return;
        }
      }

      // Check 2: Does any OTHER card in staff_id_cards use this asset?
      if (supabase) {
        const { data: otherCards } = await supabase
          .from('staff_id_cards')
          .select('id')
          .neq('id', cardId)
          .eq('card_photo_public_id', publicId)
          .limit(1);

        if (otherCards && otherCards.length > 0) {
          console.warn(`[Safe Cloudinary Guard] Asset ${publicId} is shared with other card ${otherCards[0].id}. Skipping deletion.`);
          return;
        }
      }

      // Check 3: Does media table reference this asset?
      if (supabase) {
        const { data: mediaRows } = await supabase
          .from('media')
          .select('id')
          .or(`public_id.eq.${publicId},cloudinary_public_id.eq.${publicId}`)
          .limit(1);

        if (mediaRows && mediaRows.length > 0) {
          console.warn(`[Safe Cloudinary Guard] Asset ${publicId} is tracked in site media. Skipping deletion.`);
          return;
        }
      }

      // Check 4: Check local memory store for other cards referencing this publicId
      const otherLocalCards = Array.from(this.memoryStore.values()).filter(
        (c) => c.id !== cardId && c.card_photo_public_id === publicId
      );
      if (otherLocalCards.length > 0) {
        console.warn(`[Safe Cloudinary Guard] Asset ${publicId} referenced in local store card ${otherLocalCards[0].id}. Skipping deletion.`);
        return;
      }

      // All safety checks passed. The asset is strictly card-owned and unreferenced.
      console.log(`[Safe Cloudinary Cleanup] Permanently deleting unreferenced card-owned asset: ${publicId}`);
      await cloudinaryService.deleteMedia(publicId);
    } catch (err) {
      console.warn('Error during safe Cloudinary asset cleanup:', err.message);
    }
  }

  /**
   * Upload cropped card photo to Cloudinary
   */
  async uploadCardPhoto(fileBuffer, staffId, originalFilename = 'card-photo.png') {
    if (!fileBuffer || !fileBuffer.length) {
      throw new Error('No image buffer provided for upload.');
    }

    const cleanTitle = (staffId || 'staff-card').replace(/[^a-zA-Z0-9_-]/g, '');
    const customPublicId = generateCloudinaryPublicId('zenemoo/team', `idcard_${cleanTitle}_${Date.now()}`, 'image');

    const result = await cloudinaryService.uploadStream(fileBuffer, 'zenemoo/team', {
      public_id: customPublicId,
    });

    return {
      secure_url: result.secure_url,
      public_id: result.public_id,
      is_card_owned: true,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
    };
  }
}

export const staffIdCardService = new StaffIdCardService();
