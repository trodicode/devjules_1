document.addEventListener('DOMContentLoaded', () => {
    console.log('login.js loaded.');

    const loginForm = document.getElementById('loginForm');
    const loginMessageArea = document.getElementById('loginMessageArea');
    const submitButton = loginForm ? loginForm.querySelector('button[type="submit"]') : null;

    if (!loginForm || !loginMessageArea || !submitButton) {
        console.error('Login form, message area, or submit button not found. Ensure HTML is correct.');
        if (loginMessageArea && typeof i18next !== 'undefined' && i18next.t) { // Try to show an error if message area exists and i18next is available
            showMessage(i18next.t('loginMessages.criticalInterfaceError'), 'error');
        } else if (loginMessageArea) {
            loginMessageArea.textContent = 'Critical error: Login interface is not correctly loaded. Please contact support.';
            loginMessageArea.className = 'p-3 rounded-md mb-4 text-center text-sm bg-slate-800 border border-red-500 text-red-500';
            loginMessageArea.style.display = 'block';
        }
        return;
    }

    // Ensure airtable-api.js and its functions are loaded
    // Also check for i18next
    if (typeof window.getUserByEmail !== 'function' || typeof window.COLUMN_NAMES === 'undefined' || typeof i18next === 'undefined' || typeof i18next.t === 'undefined') {
        console.error('Airtable API functions, COLUMN_NAMES, or i18next are not available.');
        if (typeof i18next !== 'undefined' && i18next.t) {
            showMessage(i18next.t('loginMessages.criticalAuthError'), 'error');
        } else {
            loginMessageArea.textContent = 'Critical error: Cannot connect to authentication system. Please try again later.';
            loginMessageArea.className = 'p-3 rounded-md mb-4 text-center text-sm bg-slate-800 border border-red-500 text-red-500';
            loginMessageArea.style.display = 'block';
        }
        if (submitButton) submitButton.disabled = true; // Disable form if critical components are missing
        return;
    }

    // Helper to display messages in the loginMessageArea
    function showMessage(message, type = 'info') { // Default to info type
        loginMessageArea.textContent = message; // i18next.t() should be called before this function
        let classes = 'p-3 rounded-md mb-4 text-center text-sm '; // Base classes
        switch (type) {
            case 'success':
                classes += 'bg-slate-800 border border-neon-green text-neon-green';
                break;
            case 'error':
                classes += 'bg-slate-800 border border-red-500 text-red-500';
                break;
            case 'info':
            default:
                classes += 'bg-slate-800 border border-neon-blue text-neon-blue';
                break;
        }
        loginMessageArea.className = classes;
        loginMessageArea.style.display = 'block';
    }

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        loginMessageArea.style.display = 'none'; // Clear previous messages
        loginMessageArea.textContent = '';

        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');

        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        if (!email || !password) {
            showMessage(i18next.t('loginMessages.emailPasswordRequired'), 'error');
            return;
        }

        // Disable button to prevent multiple submissions
        submitButton.disabled = true;
        submitButton.textContent = i18next.t('loginPage.loggingInButton');

        try {
            const userRecord = await window.getUserByEmail(email);

            if (userRecord && userRecord.fields) {
                const storedPassword = userRecord.fields[window.COLUMN_NAMES.USER_PASSWORD];
                const userRole = userRecord.fields[window.COLUMN_NAMES.USER_ROLE];

                // Direct string comparison (as specified for the exercise)
                if (storedPassword === password) {
                    // Passwords match
                    sessionStorage.setItem('userEmail', email);
                    sessionStorage.setItem('userRole', userRole);

                    showMessage(i18next.t('loginMessages.loginSuccess'), 'success');

                    // Redirect based on role
                    setTimeout(() => {
                        if (userRole === 'Administrateur') {
                            window.location.href = 'admin.html';
                        } else if (userRole === 'Utilisateur') {
                            window.location.href = 'index.html';
                        } else {
                            showMessage(i18next.t('loginMessages.roleNoAccess', { userRole: userRole }), 'error');
                            // Re-enable button if no redirection occurs for an unknown role
                            submitButton.disabled = false;
                            submitButton.textContent = i18next.t('loginPage.loginButton');
                        }
                    }, 1500); // Delay for message visibility

                } else {
                    // Passwords do not match
                    showMessage(i18next.t('loginMessages.invalidCredentials'), 'error');
                }
            } else {
                // User not found
                showMessage(i18next.t('loginMessages.invalidCredentials'), 'error');
            }
        } catch (error) {
            console.error('Error during login process:', error);
            showMessage(i18next.t('loginMessages.genericLoginError', { errorMessage: error.message || i18next.t('loginMessages.unknownError') }), 'error');
        } finally {
            // Re-enable button if not a success case leading to redirection
            // If redirection is initiated, the page will change, so button state doesn't matter as much.
            // However, if redirection fails or role is invalid, re-enable.
            const userRoleFromStorage = sessionStorage.getItem('userRole'); // Renamed to avoid conflict with userRole variable in scope
            if (!(userRoleFromStorage === 'Administrateur' || userRoleFromStorage === 'Utilisateur') ||
                (loginMessageArea.style.display === 'block' && loginMessageArea.textContent.includes(i18next.t('loginMessages.invalidCredentials'))) || // Check for specific error messages
                (loginMessageArea.style.display === 'block' && loginMessageArea.textContent.includes(i18next.t('loginMessages.genericLoginError', { errorMessage: '' }).split(':')[0])) // Partial check for generic error
            ) {
                 if (submitButton.disabled) { // Check if it was disabled by this process
                    submitButton.disabled = false;
                    submitButton.textContent = i18next.t('loginPage.loginButton');
                }
            }
        }
    });

    console.log('Login form event listeners attached.');
    // Set initial button text if not already set by i18n.js updateContent (e.g. if i18n.js loads after login.js which is not ideal)
    if (submitButton && submitButton.textContent === 'Login' && typeof i18next !== 'undefined' && i18next.t) {
         // This is a fallback, ideally i18n.js runs first and translates this.
        // However, the button has data-i18n attribute, so i18n.js should handle it.
        // submitButton.textContent = i18next.t('loginPage.loginButton');
    }
});
