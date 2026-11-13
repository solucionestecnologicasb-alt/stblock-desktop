export const KIDS_VOICE_LOCALES = [
    {id: 'es', label: 'Español de España', voice: 'es_ES-davefx-medium'},
    {id: 'es-MX', label: 'Español latino (México)', voice: 'es_MX-claude-high'}
];
export const KIDS_VOICE_LOCALE_KEY = 'stblockKidsVoiceLocale';
export const normalizeKidsVoiceLocale = value => KIDS_VOICE_LOCALES.some(locale => locale.id === value) ? value : 'es';
export const readKidsVoiceLocale = storage => {
    try { return normalizeKidsVoiceLocale(storage.getItem(KIDS_VOICE_LOCALE_KEY)); } catch (_error) { return 'es'; }
};
