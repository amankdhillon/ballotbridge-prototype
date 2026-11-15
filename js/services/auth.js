// Sessions, profiles, and the facilitator code. No passwords in this prototype.
import { sb, unwrap, AppError } from '../lib/supabase.js';

// Gives the browser an anonymous session the first time it opens the app.
export async function ensureSession() {
  const { data } = await sb().auth.getSession();
  if (!data.session) unwrap(await sb().auth.signInAnonymously());
}

// The signed-in profile plus the counts that drive the unlock rule. Null if they haven't joined yet.
export async function loadMe() {
  const { data } = await sb().auth.getUser();
  if (!data?.user) return null;
  const profile = unwrap(await sb().from('profiles').select('*').eq('id', data.user.id).maybeSingle());
  if (!profile) return null;
  const [stats] = unwrap(await sb().rpc('my_stats'));
  return {
    id: profile.id,
    nickname: profile.nickname,
    icon: profile.icon,
    state: profile.state,
    district: profile.district,
    topics: profile.topics ?? [],
    verified: profile.is_verified,
    explanationsWritten: Number(stats.explanations_written),
    reviewsGiven: Number(stats.reviews_given),
  };
}

export async function createProfile(nickname, icon) {
  const { data } = await sb().auth.getUser();
  if (!data?.user) throw new AppError('Your session expired. Reload the page and try again.');
  unwrap(await sb().from('profiles').insert({ id: data.user.id, nickname: nickname.slice(0, 30), icon }));
}

export async function redeemCode(code) {
  unwrap(await sb().rpc('redeem_verify_code', { code }));
}

export async function saveSetup(userId, fields) {
  unwrap(await sb().from('profiles').update(fields).eq('id', userId));
}
