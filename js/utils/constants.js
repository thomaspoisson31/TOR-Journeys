
// === CONSTANTES DE COULEURS ===
export const colorMap = { 
    red: 'rgba(239, 68, 68, 0.8)', 
    blue: 'rgba(59, 130, 246, 0.8)', 
    green: 'rgba(34, 197, 94, 0.8)', 
    violet: 'rgba(139, 92, 246, 0.8)', 
    orange: 'rgba(252, 169, 3, 0.8)', 
    black: 'rgba(17, 24, 39, 0.8)' 
};

export const regionColorMap = { 
    red: 'rgba(239, 68, 68, 0.15)', 
    blue: 'rgba(59, 130, 246, 0.15)', 
    green: 'rgba(34, 197, 94, 0.15)', 
    violet: 'rgba(139, 92, 246, 0.15)', 
    orange: 'rgba(252, 169, 3, 0.15)', 
    black: 'rgba(17, 24, 39, 0.15)' 
};

// === DONNÉES PAR DÉFAUT ===
export const getDefaultLocations = () => ({ "locations": [] }); // Fallback to empty if fetch fails
export const getDefaultRegions = () => ({ "regions": [] });

// === CONSTANTES DE CARTE ===
export const MAP_DISTANCE_MILES = 1150;
export const PLAYER_MAP_URL = "fr_tor_2nd_eriadors_map_page-0001.webp";
export const LOREMASTER_MAP_URL = "fr_tor_2nd_eriadors_map_page_loremaster.webp";
export const LOCATIONS_URL = "Landmarks1.json";

// === CONSTANTES D'INTERACTION ===
export const PROXIMITY_DISTANCE = 50;

// === CONSTANTES DE SYNCHRONISATION ===
export const SYNC_DELAY = 2000; // 2 seconds delay before auto-sync

// === CONSTANTES DE SAISONS ===
export const seasonSymbols = {
    'printemps': '🌱',
    'ete': '☀️',
    'automne': '🍂',
    'hiver': '❄️'
};

export const seasonNames = {
    'printemps-debut': 'Printemps-début',
    'printemps-milieu': 'Printemps-milieu',
    'printemps-fin': 'Printemps-fin',
    'ete-debut': 'Été-début',
    'ete-milieu': 'Été-milieu',
    'ete-fin': 'Été-fin',
    'automne-debut': 'Automne-début',
    'automne-milieu': 'Automne-milieu',
    'automne-fin': 'Automne-fin',
    'hiver-debut': 'Hiver-début',
    'hiver-milieu': 'Hiver-milieu',
    'hiver-fin': 'Hiver-fin'
};
