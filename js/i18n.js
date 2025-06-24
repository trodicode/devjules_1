// js/i18n.js
function updateContent() {
    console.log('[i18n] updateContent called.');
    const elementsToTranslate = document.querySelectorAll('[data-i18n]');
    console.log(`[i18n] Found ${elementsToTranslate.length} elements with data-i18n attribute.`);
    elementsToTranslate.forEach(element => {
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
    const placeholdersToTranslate = document.querySelectorAll('[data-i18n-placeholder]');
    console.log(`[i18n] Found ${placeholdersToTranslate.length} elements with data-i18n-placeholder attribute.`);

    // Update page title
    console.log('[i18n] Attempting to update page title.');
    const pageTitleKey = document.documentElement.getAttribute('data-i18n-page-title'); // Assume we'll add this to <html> tag
    if (pageTitleKey) {
        const translatedTitle = i18next.t(pageTitleKey);
        if (translatedTitle && translatedTitle !== pageTitleKey && document.title !== translatedTitle) {
            document.title = translatedTitle;
        }
    }
}

function setupLanguageSwitcher() {
    console.log('[i18n] setupLanguageSwitcher called.');
    const langSwitcherContainer = document.querySelector('.lang-switcher');
    if (!langSwitcherContainer) {
        console.log('[i18n] Language switcher container not found.');
        return;
    }

    const enButton = langSwitcherContainer.querySelector('button[data-lang="en"]');
    const frButton = langSwitcherContainer.querySelector('button[data-lang="fr"]');
    console.log('[i18n] Language switcher buttons found:', { enButton, frButton });

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
    console.log(`[i18n] changeLanguage called with: ${lang}`);
    if (lang && lang !== i18next.language) {
        console.log(`[i18n] Attempting to change language to: ${lang}`);
        try {
            await i18next.changeLanguage(lang);
            console.log(`[i18n] i18next.changeLanguage to ${lang} completed.`);
            localStorage.setItem('language', lang);
            updateContent();
            updateSwitcherUI(lang);
            console.log(`[i18n] Language preferences updated and UI refreshed for ${lang}.`);
        } catch (err) {
            console.error(`[i18n] Error in i18next.changeLanguage for ${lang}:`, err);
        }
    } else {
        console.log(`[i18n] Language ${lang} is already active or invalid.`);
    }
}

async function initI18next() {
    const initialLang = localStorage.getItem('language') || navigator.language.split('-')[0] || 'en';
    console.log('[i18n] Initializing i18next. Determined initialLang:', initialLang);

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
        console.log('[i18n] i18next initialized successfully.');
        updateContent();
        setupLanguageSwitcher();
            // document.body.style.visibility = 'visible'; // Make body visible after initial translation
    } catch (error) {
        console.error('[i18n] Error initializing i18next:', error);
            // document.body.style.visibility = 'visible'; // Also make body visible in case of error to not leave page blank
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
