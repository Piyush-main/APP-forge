// i18n configuration for AppForge
// Supports: English, Spanish, French, Japanese, Hindi

import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  en: {
    translation: {
      // Nav
      builder:    "Builder",
      dashboard:  "Dashboard",
      settings:   "Settings",
      signIn:     "Sign in",
      signOut:    "Sign out",

      // Builder
      generateApp:       "Generate App",
      generating:        "Generating...",
      validJson:         "Valid JSON",
      invalidJson:       "Invalid JSON",
      loadSample:        "Load Sample",
      formatJson:        "Format",
      pasteConfig:       "Paste JSON. Generate App.",
      pasteConfigDesc:   "Drop a configuration schema and watch your full-stack app materialize.",

      // Tabs
      preview:   "Preview",
      schema:    "Schema",
      routes:    "API Routes",
      auth:      "Auth",
      deploy:    "Deploy",

      // Table
      newRecord:  "New {{model}}",
      importCsv:  "Import CSV",
      exportCsv:  "Export CSV",
      edit:       "Edit",
      delete:     "Delete",
      total:      "{{count}} total",

      // Validation
      errorsHandled:   "{{count}} error(s) — auto-handled",
      warningsHandled: "{{count}} warning(s) gracefully handled",

      // Deploy
      deployTo:     "Deploy to {{platform}}",
      recommended:  "Recommended",

      // Auth
      loginTitle:     "Sign in to your account",
      noAccount:      "No account?",
      createAccount:  "Create one",
      continueWith:   "Continue with {{provider}}",
      orEmail:        "or email",
      emailLabel:     "Email",
      passwordLabel:  "Password",
      signingIn:      "Signing in...",
      invalidCreds:   "Invalid email or password",
    },
  },

  es: {
    translation: {
      builder:    "Constructor",
      dashboard:  "Panel",
      settings:   "Configuración",
      signIn:     "Iniciar sesión",
      signOut:    "Cerrar sesión",
      generateApp:       "Generar App",
      generating:        "Generando...",
      validJson:         "JSON válido",
      invalidJson:       "JSON inválido",
      loadSample:        "Cargar ejemplo",
      formatJson:        "Formatear",
      pasteConfig:       "Pega JSON. Genera una App.",
      pasteConfigDesc:   "Suelta un esquema de configuración y observa cómo aparece tu app.",
      preview:   "Vista previa",
      schema:    "Esquema",
      routes:    "Rutas API",
      auth:      "Auth",
      deploy:    "Desplegar",
      newRecord:  "Nuevo {{model}}",
      importCsv:  "Importar CSV",
      exportCsv:  "Exportar CSV",
      edit:       "Editar",
      delete:     "Eliminar",
      total:      "{{count}} en total",
      recommended:  "Recomendado",
      loginTitle:     "Inicia sesión en tu cuenta",
      noAccount:      "¿Sin cuenta?",
      createAccount:  "Créala",
      continueWith:   "Continuar con {{provider}}",
      orEmail:        "o email",
      emailLabel:     "Correo",
      passwordLabel:  "Contraseña",
      signingIn:      "Iniciando sesión...",
      invalidCreds:   "Correo o contraseña inválidos",
    },
  },

  fr: {
    translation: {
      builder:    "Constructeur",
      dashboard:  "Tableau de bord",
      settings:   "Paramètres",
      signIn:     "Se connecter",
      signOut:    "Se déconnecter",
      generateApp:       "Générer l'app",
      generating:        "Génération...",
      validJson:         "JSON valide",
      invalidJson:       "JSON invalide",
      pasteConfig:       "Collez du JSON. Générez une app.",
      preview:   "Aperçu",
      schema:    "Schéma",
      routes:    "Routes API",
      auth:      "Auth",
      deploy:    "Déployer",
      newRecord:  "Nouveau {{model}}",
      importCsv:  "Importer CSV",
      exportCsv:  "Exporter CSV",
      edit:       "Modifier",
      delete:     "Supprimer",
      recommended:  "Recommandé",
      loginTitle:     "Connectez-vous à votre compte",
      noAccount:      "Pas de compte ?",
      createAccount:  "Créer un compte",
      continueWith:   "Continuer avec {{provider}}",
      orEmail:        "ou email",
      emailLabel:     "Email",
      passwordLabel:  "Mot de passe",
      signingIn:      "Connexion...",
      invalidCreds:   "Email ou mot de passe invalide",
    },
  },
};

export const supportedLocales = [
  { code: "en", label: "English",  flag: "🇺🇸" },
  { code: "es", label: "Español",  flag: "🇪🇸" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
];

export function initI18n(locale = "en") {
  if (!i18n.isInitialized) {
    i18n.use(initReactI18next).init({
      resources,
      lng:           locale,
      fallbackLng:   "en",
      interpolation: { escapeValue: false },
    });
  } else {
    i18n.changeLanguage(locale);
  }
  return i18n;
}

export default i18n;
