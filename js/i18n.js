// js/i18n.js
function updateContent() {
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        const translation = i18next.t(key);
        // To prevent FOUC (Flash of Untranslated Content) or empty elements if key is missing,
        // only update if translation is found and different.
        if (translation && translation !== key && element.innerHTML !== translation) {
             element.innerHTML = translation; // Use innerHTML for now
        }
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        const translation = i18next.t(key);
        if (translation && translation !== key && element.placeholder !== translation) {
            element.placeholder = translation;
        }
    });

    // Update page title
    const pageTitleKey = document.documentElement.getAttribute('data-i18n-page-title'); // Assume we'll add this to <html> tag
    if (pageTitleKey) {
        const translatedTitle = i18next.t(pageTitleKey);
        if (translatedTitle && translatedTitle !== pageTitleKey && document.title !== translatedTitle) {
            document.title = translatedTitle;
        }
    }
}

function setupLanguageSwitcher() {
    const langSwitcherContainer = document.querySelector('.lang-switcher');
    if (!langSwitcherContainer) return;

    const enButton = langSwitcherContainer.querySelector('button[data-lang="en"]');
    const frButton = langSwitcherContainer.querySelector('button[data-lang="fr"]');

    if (enButton) enButton.addEventListener('click', () => changeLanguage('en'));
    if (frButton) frButton.addEventListener('click', () => changeLanguage('fr'));

    updateSwitcherUI(i18next.language);
}

function updateSwitcherUI(currentLang) {
    const langButtons = document.querySelectorAll('.lang-switcher button[data-lang]');
    langButtons.forEach(button => {
        const lang = button.getAttribute('data-lang');
        if (button) { // Check if button itself is not null
            button.disabled = currentLang === lang;
            button.style.opacity = currentLang === lang ? '0.5' : '1';
        }
    });
}


async function changeLanguage(lang) {
    if (lang && lang !== i18next.language) {
        await i18next.changeLanguage(lang);
        localStorage.setItem('language', lang);
        updateContent();
        updateSwitcherUI(lang);
        console.log(`Language changed to ${lang}`);
    }
}

async function initI18next() {
    const initialLang = localStorage.getItem('language') || navigator.language.split('-')[0] || 'en';

    try {
        await i18next
            .use(i18nextHttpBackend)
            .init({
                lng: initialLang,
                fallbackLng: 'en',
                debug: true, // Set to false in production
                ns: ['translation'], // default namespace
                defaultNS: 'translation',
                backend: {
                    loadPath: 'locales/{{lng}}.json' // Path to translation files
                }
            });
        updateContent();
        setupLanguageSwitcher();
            document.body.style.visibility = 'visible'; // Make body visible after initial translation
    } catch (error) {
        console.error("Error initializing i18next:", error);
            document.body.style.visibility = 'visible'; // Also make body visible in case of error to not leave page blank
    }
}

// Initialize i18next when the script loads
if (typeof i18next !== 'undefined' && typeof i18nextHttpBackend !== 'undefined') {
    initI18next();
} else {
    console.error('i18next or i18nextHttpBackend is not loaded. Make sure the CDN links are correct and before this script.');
    // Fallback: still set up switcher so buttons are there, even if non-functional
    // This part might be removed if we ensure scripts load order
    document.addEventListener('DOMContentLoaded', () => {
        // Attempt to set up switcher even if i18next failed, so buttons appear
        // and might get initialized later if scripts load out of order.
        // The event listeners in setupLanguageSwitcher won't work without i18next fully initialized.
        const langSwitcherContainer = document.querySelector('.lang-switcher');
        if (!langSwitcherContainer) return;

        const enButton = langSwitcherContainer.querySelector('button[data-lang="en"]');
        const frButton = langSwitcherContainer.querySelector('button[data-lang="fr"]');

        // Mock basic UI update if i18next is not there
        const currentLang = localStorage.getItem('language') || 'en';
        if (enButton) {
            enButton.disabled = currentLang === 'en';
            enButton.style.opacity = currentLang === 'en' ? '0.5' : '1';
        }
        if (frButton) {
            frButton.disabled = currentLang === 'fr';
            frButton.style.opacity = currentLang === 'fr' ? '0.5' : '1';
        }
    });
}
