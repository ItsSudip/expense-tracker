// Default expense categories.
//
// Names and colours follow the top-level expense presets in ezBookkeeping
// (https://github.com/mayswind/ezbookkeeping, src/consts/category.ts).
// ezBookkeeping also defines sub-categories under each of these; this app
// stores a flat Category | Color list in the config spreadsheet, so only the
// parent categories are used here. Users can add their own rows to the
// "Categories" tab of the config spreadsheet.
export const DEFAULT_CATEGORIES = [
  { name: 'Food & Drink',           color: '#FF6B22' },
  { name: 'Clothing & Appearance',  color: '#673AB7' },
  { name: 'Housing & Houseware',    color: '#000000' },
  { name: 'Transportation',         color: '#009688' },
  { name: 'Communication',          color: '#2196F3' },
  { name: 'Entertainment',          color: '#FF2D55' },
  { name: 'Education & Studying',   color: '#CDDC39' },
  { name: 'Gifts & Donations',      color: '#4CD964' },
  { name: 'Medical & Healthcare',   color: '#FF3B30' },
  { name: 'Finance & Insurance',    color: '#FF9500' },
  { name: 'Miscellaneous',          color: '#8E8E93' },
];

// Rows in the shape the Categories sheet expects: [name, color]
export const DEFAULT_CATEGORY_ROWS = DEFAULT_CATEGORIES.map((c) => [c.name, c.color]);
