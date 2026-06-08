// core/db.js — Supabase client wrapper with standardized error handling
// Loaded as ES module, exposes `sb` (Supabase client) + `query`, `mutate` helpers

// EMBED build: points at ThaiMate's Supabase so login/identity is shared.
// storageKey matches ThaiMate's default (sb-<ref>-auth-token) → same-origin
// session is auto-shared when served from thaimate domain /golf/.
const SUPABASE_URL = 'https://jhtsncdeoulanvytfwrl.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_ChPPAnOQnOUWh-huy83ckg_pK4343IF';

// Load Supabase JS via dynamic import (esm.sh provides ES module build)
const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.39.0');
export const sb = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'sb-jhtsncdeoulanvytfwrl-auth-token' }
});

// ── CENTRAL golf-course master ──────────────────────────────────────────────
// Golf course data (name·region·홀별 pars) is a shared community asset across
// ALL golf instances (this embed, standalone golfdong, future buyers). It lives
// in the golfdong project and is READ here with its public anon key (no secret).
// WRITES go through the local `contribute_course` RPC (checks email-verification
// then forwards to the central DB) — see domain/courses.js.
const COURSE_URL = 'https://bxhkcodvxtoacbozfhwx.supabase.co';
const COURSE_ANON = 'sb_publishable_306uPiqTXeg7xZDqEL2MTw_2wPMr2VN';
export const sbCourses = createClient(COURSE_URL, COURSE_ANON, {
  auth: { persistSession: false, autoRefreshToken: false, storageKey: 'sb-courses-readonly' }
});

// Standard query helper — always returns { data, error, rls }
export async function query(builder) {
  try {
    const { data, error } = await builder;
    if (error) {
      const isRls = error.code === 'PGRST116' || /policy/i.test(error.message);
      return { data: null, error, rls: isRls };
    }
    return { data, error: null, rls: false };
  } catch (e) {
    return { data: null, error: e, rls: false };
  }
}

// Mutation helper — appends .select() and detects RLS denial via 0 rows
export async function mutate(builder, { rlsMessage = '권한이 없습니다' } = {}) {
  try {
    const { data, error } = await builder.select();
    if (error) {
      const isRls = error.code === 'PGRST116' || /policy/i.test(error.message);
      return { data: null, error, rls: isRls };
    }
    if (!data || data.length === 0) {
      return { data: null, error: new Error(rlsMessage), rls: true };
    }
    return { data, error: null, rls: false };
  } catch (e) {
    return { data: null, error: e, rls: false };
  }
}
