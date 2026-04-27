export const t = (field: any, lang: 'ar' | 'en' = 'ar') => {
  if (!field) return "";
  if (typeof field === 'string') return field;
  // If it's an object with ar/en keys
  if (typeof field === 'object') {
    return field[lang] || field['ar'] || field['en'] || "";
  }
  return String(field);
};
