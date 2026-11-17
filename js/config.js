// The only file you edit to connect the app.
// The publishable key is designed to be public. Row Level Security protects the data.
// Never put a service_role or secret key anywhere in this project.
export const SUPABASE_URL = 'https://lqvubdglzxgerfsjskgx.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_KtumIMKhsVUYWWLnv34BMg_z9W24QC-';

// Choices shown in the forms. Keep these in step with the database if you change them.
export const OPTIONS = {
  icons: ['🦊', '🐼', '🐸', '🐙', '🦉', '🐝', '🌵', '🍀'],
  iconLabels: { '🦊': 'Fox', '🐼': 'Panda', '🐸': 'Frog', '🐙': 'Octopus', '🦉': 'Owl', '🐝': 'Bee', '🌵': 'Cactus', '🍀': 'Clover' },
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

// Emoji reactions. The labels are read aloud to screen-reader users.
// Must match the list in migration-2.sql.
export const REACTIONS = [
  { emoji: '👍', label: 'Thumbs up' },
  { emoji: '💡', label: 'Helpful idea' },
  { emoji: '❓', label: 'Raises a question' },
  { emoji: '👏', label: 'Applause' },
];
