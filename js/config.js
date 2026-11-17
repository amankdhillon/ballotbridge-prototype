// The only file you edit to connect the app.
// The publishable key is designed to be public. Row Level Security protects the data.
// Never put a service_role or secret key anywhere in this project.
export const SUPABASE_URL = 'https://lqvubdglzxgerfsjskgx.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_KtumIMKhsVUYWWLnv34BMg_z9W24QC-';

// Choices shown in the forms. Keep these in step with the database if you change them.
export const OPTIONS = {
  states: ['California'],
  districts: ['Sample District A', 'Sample District B'],
  categories: [
    'Funding / who pays', 'Taxes and fees', 'Housing', 'Schools', 'Transportation',
    'Public safety', 'Health', 'Environment', 'Something else',
  ],
  readingLevels: ['Grade 6', 'Grade 8', 'Grade 10'],
  defaultLevel: 'Grade 8',
  sourceTypes: ['Official', 'Nonpartisan analysis', 'News', 'Advocacy or campaign'],
  reviewChecks: [
    { id: 'matches', label: 'Matches the official text' },
    { id: 'neutral', label: 'Neutral wording' },
    { id: 'sourced', label: 'Every claim has a source' },
    { id: 'plain', label: 'Clear for a new voter' },
  ],
};

// The single reaction. `key` is the value stored in the database. The page shows a thumbs-up icon, not the character.
export const REACTION = { key: '👍', label: 'Thumbs up' };
