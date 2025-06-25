// js/i18n-static.js

const translations = {
    en: {
        // General
        "langSwitcherEN": "EN",
        "langSwitcherFR": "FR",
        // Login Page (example keys)
        "loginPage.title": "Login - Support Ticket System",
        "loginPage.header": "User Login",
        "loginPage.emailLabel": "Email",
        "loginPage.passwordLabel": "Password",
        "loginPage.loginButton": "Login",
        // Index Page (example keys)
        "ticketFormPage.title": "Support Ticket Submission",
        "ticketForm.header": "Submit a New Support Ticket",
        "ticketForm.ticketTitleLabel": "Ticket Title *",
        "ticketForm.detailedDescriptionLabel": "Detailed Description *",
        "ticketForm.urgencyLevelLabel": "Urgency Level *",
        "ticketForm.selectUrgencyDefault": "-- Select Urgency --",
        "ticketForm.urgencyNormal": "Normal",
        "ticketForm.urgencyUrgent": "Urgent",
        "ticketForm.requesterEmailLabel": "Your Email *",
        "ticketForm.attachmentUrlLabel": "Attachment URL (Optional)",
        "ticketForm.attachmentUrlHelpText": "Enter the full, publicly accessible URL for your attachment.",
        "ticketForm.submitButton": "Submit Ticket",
        // Admin Page
        "adminPage.docTitle": "Admin Ticket Dashboard",
        "adminPage.header": "Ticket Management Dashboard",
        "adminPage.logoutButton": "Logout",
        "ticketForm.requesterEmailPlaceholder": "e.g., you@example.com",
        "ticketForm.attachmentUrlPlaceholder": "e.g., https://example.com/image.png",
        "adminFilters.statusLabel": "Filter by Status:",
        "adminFilters.urgencyLabel": "Filter by Urgency:",
        "adminFilters.searchLabel": "Search:",
        "adminFilters.searchPlaceholder": "Search by title, description...",
        "adminFilters.allOption": "All",
        "commonStatuses.new": "New",
        "commonStatuses.acknowledged": "Acknowledged",
        "commonStatuses.inProgress": "In Progress",
        "commonStatuses.pending": "Pending",
        "commonStatuses.resolved": "Resolved",
        "commonStatuses.closed": "Closed",
        "commonUrgencies.normal": "Normal",
        "commonUrgencies.urgent": "Urgent",
        "adminTable.headerTicketId": "Ticket ID",
        "adminTable.headerTitle": "Title",
        "adminTable.headerDateSubmitted": "Date Submitted",
        "adminTable.headerUrgency": "Urgency",
        "adminTable.headerStatus": "Status",
        "adminTable.headerAssignedTo": "Assigned To",
        "adminTable.headerActions": "Actions",
        "adminModal.title": "Ticket Details",
        "adminModal.closeSr": "Close",
        "adminModal.labelTicketId": "Ticket ID:",
        "adminModal.labelTitle": "Title:",
        "adminModal.labelDescription": "Full Description:",
        "adminModal.labelUrgency": "Urgency:",
        "adminModal.labelStatus": "Status:",
        "adminModal.labelAssignedTo": "Assigned Collaborator:",
        "adminModal.labelSubmissionDate": "Submission Date:",
        "adminModal.labelAttachment": "Attachment:",
        "adminModal.updateSectionTitle": "Update Ticket",
        "adminModal.labelChangeStatus": "Change Status:",
        "adminModal.selectStatusDefault": "-- Select Status --",
        "adminModal.saveStatusButton": "Save Status",
        "adminModal.labelAssignCollaborator": "Assign Collaborator:",
        "adminModal.assignCollaboratorPlaceholder": "Enter collaborator name/ID",
        "adminModal.saveAssignmentButton": "Save Assignment"
    },
    fr: {
        // General
        "langSwitcherEN": "EN",
        "langSwitcherFR": "FR",
        // Login Page
        "loginPage.title": "Connexion - Système de Tickets de Support",
        "loginPage.header": "Connexion Utilisateur",
        "loginPage.emailLabel": "Adresse E-mail",
        "loginPage.passwordLabel": "Mot de passe",
        "loginPage.loginButton": "Connexion",
        // Index Page
        "ticketFormPage.title": "Soumission de Ticket de Support",
        "ticketForm.header": "Soumettre un Nouveau Ticket de Support",
        "ticketForm.ticketTitleLabel": "Titre du Ticket *",
        "ticketForm.detailedDescriptionLabel": "Description Détaillée *",
        "ticketForm.urgencyLevelLabel": "Niveau d'Urgence *",
        "ticketForm.selectUrgencyDefault": "-- Sélectionnez une Urgence --",
        "ticketForm.urgencyNormal": "Normal",
        "ticketForm.urgencyUrgent": "Urgent",
        "ticketForm.requesterEmailLabel": "Votre Email *",
        "ticketForm.requesterEmailPlaceholder": "ex: vous@example.com",
        "ticketForm.attachmentUrlLabel": "URL de la Pièce Jointe (Optionnel)",
        "ticketForm.attachmentUrlPlaceholder": "ex: https://example.com/image.png",
        "ticketForm.attachmentUrlHelpText": "Entrez l'URL complète et publiquement accessible de votre pièce jointe.",
        "ticketForm.submitButton": "Soumettre le Ticket",
        // Admin Page
        "adminPage.docTitle": "Tableau de Bord Admin",
        "adminPage.header": "Tableau de Bord de Gestion des Tickets",
        "adminPage.logoutButton": "Déconnexion",
        "adminFilters.statusLabel": "Filtrer par Statut :",
        "adminFilters.urgencyLabel": "Filtrer par Urgence :",
        "adminFilters.searchLabel": "Rechercher :",
        "adminFilters.searchPlaceholder": "Rechercher par titre, description...",
        "adminFilters.allOption": "Tous",
        "commonStatuses.new": "Nouveau",
        "commonStatuses.acknowledged": "Pris en charge",
        "commonStatuses.inProgress": "En cours",
        "commonStatuses.pending": "En attente",
        "commonStatuses.resolved": "Résolu",
        "commonStatuses.closed": "Fermé",
        "commonUrgencies.normal": "Normal",
        "commonUrgencies.urgent": "Urgent",
        "adminTable.headerTicketId": "ID Ticket",
        "adminTable.headerTitle": "Titre",
        "adminTable.headerDateSubmitted": "Date de Soumission",
        "adminTable.headerUrgency": "Urgence",
        "adminTable.headerStatus": "Statut",
        "adminTable.headerAssignedTo": "Assigné À",
        "adminTable.headerActions": "Actions",
        "adminModal.title": "Détails du Ticket",
        "adminModal.closeSr": "Fermer",
        "adminModal.labelTicketId": "ID Ticket :",
        "adminModal.labelTitle": "Titre :",
        "adminModal.labelDescription": "Description Complète :",
        "adminModal.labelUrgency": "Urgence :",
        "adminModal.labelStatus": "Statut :",
        "adminModal.labelAssignedTo": "Collaborateur Assigné :",
        "adminModal.labelSubmissionDate": "Date de Soumission :",
        "adminModal.labelAttachment": "Pièce Jointe :",
        "adminModal.updateSectionTitle": "Mettre à Jour le Ticket",
        "adminModal.labelChangeStatus": "Changer le Statut :",
        "adminModal.selectStatusDefault": "-- Sélectionnez un Statut --",
        "adminModal.saveStatusButton": "Enregistrer Statut",
        "adminModal.labelAssignCollaborator": "Assigner Collaborateur :",
        "adminModal.assignCollaboratorPlaceholder": "Entrez nom/ID collaborateur",
        "adminModal.saveAssignmentButton": "Enregistrer Assignation"
    }
};

let currentLanguage = localStorage.getItem('selectedLanguage') || 'en';

window.setLanguage = function(lang) {
    if (translations[lang]) {
        currentLanguage = lang;
        localStorage.setItem('selectedLanguage', lang);
        console.log(`[i18n-static] Language set to: ${currentLanguage}`);
        translatePage();
        updateLanguageSwitcherUI(); // Update button states
    } else {
        console.warn(`[i18n-static] Language '${lang}' not found in translations.`);
    }
}

function translatePage() {
    console.log(`[i18n-static] Translating page to: ${currentLanguage}`);
    document.querySelectorAll('[data-i18n-static]').forEach(element => {
        const key = element.getAttribute('data-i18n-static');
        if (translations[currentLanguage] && translations[currentLanguage][key]) {
            element.textContent = translations[currentLanguage][key];
        } else {
            // Fallback: if key not found for current lang, try English, then leave as is or show key
            if (translations['en'] && translations['en'][key]) {
                element.textContent = translations['en'][key] + (currentLanguage !== 'en' ? ' (EN)' : ''); // Indicate fallback
            } else {
                console.warn(`[i18n-static] Translation key '${key}' not found for language '${currentLanguage}' or fallback 'en'.`);
                // element.textContent = key; // Optionally display the key itself
            }
        }
    });

    // Add this new part for placeholders:
    document.querySelectorAll('[data-i18n-static-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-static-placeholder');
        if (translations[currentLanguage] && translations[currentLanguage][key]) {
            element.placeholder = translations[currentLanguage][key];
        } else {
            // Fallback for placeholders
            if (translations['en'] && translations['en'][key]) {
                element.placeholder = translations['en'][key] + (currentLanguage !== 'en' ? ' (EN)' : '');
            } else {
                console.warn(`[i18n-static] Placeholder translation key '${key}' not found for language '${currentLanguage}' or fallback 'en'.`);
                // element.placeholder = key; // Optionally display the key
            }
        }
    });
    console.log(`[i18n-static] Page placeholder translation complete for: ${currentLanguage}`);

    // Translate document title (specific handling)
    const pageTitleKey = document.documentElement.getAttribute('data-i18n-page-title-static');
    if (pageTitleKey) {
        if (translations[currentLanguage] && translations[currentLanguage][pageTitleKey]) {
            document.title = translations[currentLanguage][pageTitleKey];
        } else if (translations['en'] && translations['en'][pageTitleKey]) {
            document.title = translations['en'][pageTitleKey];
        }
    }
    console.log(`[i18n-static] Page translation complete for: ${currentLanguage}`);
}

function updateLanguageSwitcherUI() {
    const enButton = document.querySelector('.lang-switcher-static button[data-lang="en"]');
    const frButton = document.querySelector('.lang-switcher-static button[data-lang="fr"]');

    if (enButton) {
        enButton.disabled = currentLanguage === 'en';
        enButton.style.opacity = currentLanguage === 'en' ? '0.5' : '1';
    }
    if (frButton) {
        frButton.disabled = currentLanguage === 'fr';
        frButton.style.opacity = currentLanguage === 'fr' ? '0.5' : '1';
    }
     console.log(`[i18n-static] Language switcher UI updated for: ${currentLanguage}`);
}


// Initial setup on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('[i18n-static] DOMContentLoaded. Initializing static i18n.');
    // Initial translation
    translatePage();
    // Setup switchers (find them and attach events)
    const langSwitcherContainer = document.querySelector('.lang-switcher-static');
    if (langSwitcherContainer) {
        const enButton = langSwitcherContainer.querySelector('button[data-lang="en"]');
        const frButton = langSwitcherContainer.querySelector('button[data-lang="fr"]');

        if (enButton) {
            enButton.addEventListener('click', () => setLanguage('en'));
        } else {
            console.warn('[i18n-static] English language switcher button not found.');
        }
        if (frButton) {
            frButton.addEventListener('click', () => setLanguage('fr'));
        } else {
            console.warn('[i18n-static] French language switcher button not found.');
        }
    } else {
        console.warn('[i18n-static] Language switcher container (.lang-switcher-static) not found.');
    }
    updateLanguageSwitcherUI(); // Set initial state of buttons
    console.log('[i18n-static] Static i18n initialized.');
});
