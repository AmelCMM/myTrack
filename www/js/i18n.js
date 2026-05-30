const EN = {
  appName: 'myTrack',
  greeting: { morning: 'Good morning', afternoon: 'Good afternoon', evening: 'Good evening', night: 'Good night' },
  nav: { home: 'Home', timeline: 'Timeline', insights: 'Insights', journal: 'Journal', settings: 'Settings' },
  home: {
    balance: 'balance',
    computing: 'Computing your rhythm…',
    sleep: 'Sleep',
    water: 'Water',
    habits: 'Habits',
    setGoal: 'Set goal',
    today: 'Today',
    all: 'All →',
    addHabit: '+ Add',
    privacy: 'All data stored locally · AES-GCM encrypted',
  },
  mood: { howAreYou: 'How are you?', gratitude: 'Gratitude', addGratitude: '+ Add' },
  health: { vitals: 'Vitals', symptoms: 'Symptoms', medications: 'Medications', log: '+ Log', add: '+ Add' },
  study: { courses: 'Courses', assignments: 'Assignments', focus: 'Focus Timer', add: '+ Add' },
  projects: { projects: 'Projects', tasks: 'Tasks', new: '+ New', addTask: '+ Add' },
  finance: { accounts: 'Accounts', transactions: 'Transactions', add: '+ Add' },
  settings: {
    appearance: 'Appearance', accent: 'Accent colour', lightMode: 'Light mode', on: 'On', off: 'Off',
    ble: 'Bluetooth Sensors', bleHR: 'BLE Heart Rate', notConnected: 'Not connected',
    privacy: 'Privacy & Data', encryptionPin: 'Encryption PIN', export: 'Export backup',
    import: 'Import backup', clearData: 'Clear all data', irreversible: 'Irreversible',
    about: 'About', version: 'myTrack v2.0.0', github: 'GitHub',
    bestStreak: 'Best streak', doneToday: 'Done today', totalLogs: 'Total logs',
  },
  common: { save: 'Save', cancel: 'Cancel', delete: 'Delete', edit: 'Edit', close: 'Close', confirm: 'Confirm', loading: 'Loading…', empty: 'Nothing here yet', search: 'Search…' },
  errors: { decryption: 'Decryption failed. Wrong PIN or corrupted data.', network: 'Network error', unknown: 'Something went wrong' },
};

const FR = {
  appName: 'myTrack',
  greeting: { morning: 'Bonjour', afternoon: 'Bon après-midi', evening: 'Bonsoir', night: 'Bonne nuit' },
  nav: { home: 'Accueil', timeline: 'Chronologie', insights: 'Analyses', journal: 'Journal', settings: 'Réglages' },
  home: {
    balance: 'équilibre', computing: 'Calcul de votre rythme…',
    sleep: 'Sommeil', water: 'Eau', habits: 'Habitudes',
    setGoal: 'Objectif', today: "Aujourd'hui", all: 'Tout →',
    addHabit: '+ Ajouter',
    privacy: 'Données stockées localement · chiffrées AES-GCM',
  },
  mood: { howAreYou: 'Comment allez-vous ?', gratitude: 'Gratitude', addGratitude: '+ Ajouter' },
  health: { vitals: 'Constantes', symptoms: 'Symptômes', medications: 'Médicaments', log: '+ Noter', add: '+ Ajouter' },
  study: { courses: 'Cours', assignments: 'Devoirs', focus: 'Minuteur', add: '+ Ajouter' },
  projects: { projects: 'Projets', tasks: 'Tâches', new: '+ Nouveau', addTask: '+ Ajouter' },
  finance: { accounts: 'Comptes', transactions: 'Transactions', add: '+ Ajouter' },
  settings: {
    appearance: 'Apparence', accent: 'Couleur d\'accent', lightMode: 'Mode clair', on: 'Activé', off: 'Désactivé',
    ble: 'Capteurs Bluetooth', bleHR: 'FC Bluetooth', notConnected: 'Non connecté',
    privacy: 'Confidentialité', encryptionPin: 'Code PIN', export: 'Exporter',
    import: 'Importer', clearData: 'Tout effacer', irreversible: 'Irréversible',
    about: 'À propos', version: 'myTrack v2.0.0', github: 'GitHub',
    bestStreak: 'Meilleure série', doneToday: 'Faits aujourd\'hui', totalLogs: 'Total entrées',
  },
  common: { save: 'Enregistrer', cancel: 'Annuler', delete: 'Supprimer', edit: 'Modifier', close: 'Fermer', confirm: 'Confirmer', loading: 'Chargement…', empty: 'Rien ici', search: 'Rechercher…' },
  errors: { decryption: 'Échec du déchiffrement.', network: 'Erreur réseau', unknown: 'Erreur inconnue' },
};

const ES = {
  appName: 'myTrack',
  greeting: { morning: 'Buenos días', afternoon: 'Buenas tardes', evening: 'Buenas noches', night: 'Buenas noches' },
  nav: { home: 'Inicio', timeline: 'Cronología', insights: 'Perspectivas', journal: 'Diario', settings: 'Ajustes' },
  home: {
    balance: 'equilibrio', computing: 'Calculando tu ritmo…',
    sleep: 'Sueño', water: 'Agua', habits: 'Hábitos',
    setGoal: 'Meta', today: 'Hoy', all: 'Todo →',
    addHabit: '+ Añadir',
    privacy: 'Datos locales · cifrado AES-GCM',
  },
  mood: { howAreYou: '¿Cómo estás?', gratitude: 'Gratitud', addGratitude: '+ Añadir' },
  health: { vitals: 'Signos vitales', symptoms: 'Síntomas', medications: 'Medicamentos', log: '+ Registrar', add: '+ Añadir' },
  study: { courses: 'Cursos', assignments: 'Tareas', focus: 'Temporizador', add: '+ Añadir' },
  projects: { projects: 'Proyectos', tasks: 'Tareas', new: '+ Nuevo', addTask: '+ Añadir' },
  finance: { accounts: 'Cuentas', transactions: 'Transacciones', add: '+ Añadir' },
  settings: {
    appearance: 'Apariencia', accent: 'Color de acento', lightMode: 'Modo claro', on: 'Sí', off: 'No',
    ble: 'Sensores Bluetooth', bleHR: 'FC Bluetooth', notConnected: 'No conectado',
    privacy: 'Privacidad', encryptionPin: 'PIN', export: 'Exportar',
    import: 'Importar', clearData: 'Borrar todo', irreversible: 'Irreversible',
    about: 'Acerca de', version: 'myTrack v2.0.0', github: 'GitHub',
    bestStreak: 'Mejor racha', doneToday: 'Hoy', totalLogs: 'Total registros',
  },
  common: { save: 'Guardar', cancel: 'Cancelar', delete: 'Eliminar', edit: 'Editar', close: 'Cerrar', confirm: 'Confirmar', loading: 'Cargando…', empty: 'Nada aquí', search: 'Buscar…' },
  errors: { decryption: 'Descifrado fallido.', network: 'Error de red', unknown: 'Error desconocido' },
};

const DE = {
  appName: 'myTrack',
  greeting: { morning: 'Guten Morgen', afternoon: 'Guten Nachmittag', evening: 'Guten Abend', night: 'Gute Nacht' },
  nav: { home: 'Start', timeline: 'Zeitlinie', insights: 'Einblicke', journal: 'Tagebuch', settings: 'Einstellungen' },
  home: {
    balance: 'Gleichgewicht', computing: 'Berechne deinen Rhythmus…',
    sleep: 'Schlaf', water: 'Wasser', habits: 'Gewohnheiten',
    setGoal: 'Ziel', today: 'Heute', all: 'Alle →',
    addHabit: '+ Hinzufügen',
    privacy: 'Alle Daten lokal · AES-GCM verschlüsselt',
  },
  mood: { howAreYou: 'Wie geht es dir?', gratitude: 'Dankbarkeit', addGratitude: '+ Hinzufügen' },
  health: { vitals: 'Vitaldaten', symptoms: 'Symptome', medications: 'Medikamente', log: '+ Erfassen', add: '+ Hinzufügen' },
  study: { courses: 'Kurse', assignments: 'Aufgaben', focus: 'Fokus-Timer', add: '+ Hinzufügen' },
  projects: { projects: 'Projekte', tasks: 'Aufgaben', new: '+ Neu', addTask: '+ Hinzufügen' },
  finance: { accounts: 'Konten', transactions: 'Transaktionen', add: '+ Hinzufügen' },
  settings: {
    appearance: 'Erscheinungsbild', accent: 'Akzentfarbe', lightMode: 'Heller Modus', on: 'An', off: 'Aus',
    ble: 'Bluetooth-Sensoren', bleHR: 'BLE Herzfrequenz', notConnected: 'Nicht verbunden',
    privacy: 'Datenschutz', encryptionPin: 'Sicherheits-PIN', export: 'Exportieren',
    import: 'Importieren', clearData: 'Alle Daten löschen', irreversible: 'Unumkehrbar',
    about: 'Über', version: 'myTrack v2.0.0', github: 'GitHub',
    bestStreak: 'Beste Serie', doneToday: 'Heute erledigt', totalLogs: 'Gesamt',
  },
  common: { save: 'Speichern', cancel: 'Abbrechen', delete: 'Löschen', edit: 'Bearbeiten', close: 'Schließen', confirm: 'Bestätigen', loading: 'Lädt…', empty: 'Nichts hier', search: 'Suchen…' },
  errors: { decryption: 'Entschlüsselung fehlgeschlagen.', network: 'Netzwerkfehler', unknown: 'Unbekannter Fehler' },
};

const locales = { en: EN, fr: FR, es: ES, de: DE };

let _locale = 'en';
let _strings = EN;

function loadLocale(locale) {
  const l = locale.slice(0, 2).toLowerCase();
  _locale = locales[l] ? l : 'en';
  _strings = locales[_locale];
  document.documentElement.lang = _locale;
  return _strings;
}

function t(path, fallback = '') {
  const parts = path.split('.');
  let val = _strings;
  for (const p of parts) {
    if (val && typeof val === 'object' && p in val) {
      val = val[p];
    } else {
      return fallback || path;
    }
  }
  return typeof val === 'string' ? val : fallback || path;
}

function getLocale() { return _locale; }
function getLocales() { return Object.keys(locales); }

export default { loadLocale, t, getLocale, getLocales, locales };
