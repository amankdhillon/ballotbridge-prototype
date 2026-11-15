// Read-only data every screen needs: settings and measures.
import { sb, unwrap, AppError } from '../lib/supabase.js';

export const toMeasure = r => ({
  id: r.id,
  shortTitle: r.short_title,
  title: r.title,
  scope: r.scope,
  district: r.district,
  officialText: r.official_text,
  aiSummary: r.ai_summary,
  funders: r.funders ?? [],
});

export async function loadSettings() {
  const [row] = unwrap(await sb().from('app_public').select('*'));
  return { reviewsRequired: Number(row.reviews_required) };
}

export async function listMeasures() {
  return unwrap(await sb().from('measures').select('*').order('short_title')).map(toMeasure);
}

export async function getMeasure(id) {
  const row = unwrap(await sb().from('measures').select('*').eq('id', id).maybeSingle());
  if (!row) throw new AppError('That measure could not be found.');
  return toMeasure(row);
}
