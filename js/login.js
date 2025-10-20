document.addEventListener('DOMContentLoaded', () => {
    // console.log('login.js loaded.'); // Original log

    // Debug function to check configuration
    function showDebugInfo() {
        if (typeof DEBUG_MODE !== 'undefined' && DEBUG_MODE) {
            const debugPanel = document.getElementById('debugPanel');
            const debugInfo = document.getElementById('debugInfo');

            if (debugPanel && debugInfo) {
                debugPanel.style.display = 'block';

                let info = [];

                // Check if config constants are loaded
                if (typeof BASEROW_API_TOKEN !== 'undefined') {
                    info.push(`✅ API Token: ${BASEROW_API_TOKEN !== 'YOUR_BASEROW_API_TOKEN_HERE' ? 'Configuré' : 'Non configuré'}`);
                } else {
                    info.push(`❌ API Token: Non chargé`);
                }

                if (typeof BASEROW_USERS_TABLE_ID !== 'undefined') {
                    info.push(`✅ Users Table ID: ${BASEROW_USERS_TABLE_ID !== 'YOUR_USERS_TABLE_ID' ? 'Configuré' : 'Non configuré'}`);
                } else {
                    info.push(`❌ Users Table ID: Non chargé`);
                }

                // Check if API functions are available
                if (typeof window.getUserByEmail === 'function') {
                    info.push(`✅ getUserByEmail: Disponible`);
                } else {
                    info.push(`❌ getUserByEmail: Non disponible`);
                }

                if (typeof window.COLUMN_NAMES !== 'undefined') {
                    info.push(`✅ COLUMN_NAMES: Chargé`);
                } else {
                    info.push(`❌ COLUMN_NAMES: Non chargé`);
                }

                debugInfo.innerHTML = info.join('<br>');
            }
        }
    }

    // Show debug info after a short delay to ensure all scripts are loaded
    setTimeout(showDebugInfo, 100);

    const loginForm = document.getElementById('loginForm');
    const loginMessageArea = document.getElementById('loginMessageArea');
    const submitButton = loginForm ? loginForm.querySelector('button[type="submit"]') : null;

    if (!loginForm || !loginMessageArea || !submitButton) {
        // console.error('Login form, message area, or submit button not found. Ensure HTML is correct.'); // Original log
        if (loginMessageArea) {
            loginMessageArea.textContent = 'Critical error: Login interface is not correctly loaded. Please contact support.';
            loginMessageArea.className = 'p-3 rounded-md mb-4 text-center text-sm bg-slate-800 border border-red-500 text-red-500';
            loginMessageArea.style.display = 'block';
        }
        return;
    }

    // Ensure airtable-api.js and its functions are loaded
    if (typeof window.getUserByEmail !== 'function' || typeof window.COLUMN_NAMES === 'undefined') {
        // console.error('Airtable API functions (getUserByEmail) or COLUMN_NAMES are not available.'); // Original log
        loginMessageArea.textContent = 'Critical error: Cannot connect to authentication system. Please try again later.';
        loginMessageArea.className = 'p-3 rounded-md mb-4 text-center text-sm bg-slate-800 border border-red-500 text-red-500';
        loginMessageArea.style.display = 'block';
        if (submitButton) submitButton.disabled = true;
        return;
    }

    // Helper to display messages in the loginMessageArea
    function showMessage(message, type = 'info') {
        loginMessageArea.textContent = message;
        let classes = 'p-3 rounded-md mb-4 text-center text-sm ';
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
            showMessage('Email and Password are required.', 'error');
            return;
        }

        // Disable button to prevent multiple submissions
        submitButton.disabled = true;
        submitButton.textContent = 'Logging in...';

        try {
            console.log('🔍 Debug - Tentative de connexion pour:', email);
            const userRecord = await window.getUserByEmail(email);
            console.log('🔍 Debug - Réponse API reçue:', userRecord);

            if (userRecord && userRecord.fields) {
                const storedPassword = userRecord.fields[window.COLUMN_NAMES.USER_PASSWORD];
                const userRoleObject = userRecord.fields[window.COLUMN_NAMES.USER_ROLE];
                const userRole = userRoleObject ? userRoleObject.value : null;

                // Direct string comparison (as specified for the exercise)
                if (storedPassword === password) {
                    // Passwords match
                    sessionStorage.setItem('userEmail', email);
                    sessionStorage.setItem('userRole', userRole);

                    showMessage('Login successful! Redirecting...', 'success');

                    // Redirect based on role
                    setTimeout(() => {
                        if (userRole === 'Administrateur') {
                            window.location.href = 'admin.html';
                        } else if (userRole === 'Utilisateur') {
                            window.location.href = 'index.html';
                        } else {
                            showMessage(`Your role ('${userRole}') does not have access to any specific page.`, 'error');
                            submitButton.disabled = false;
                            submitButton.textContent = 'Login';
                        }
                    }, 1500);

                } else {
                    showMessage('Invalid email or password.', 'error');
                }
            } else {
                showMessage('Invalid email or password.', 'error');
            }
        } catch (error) {
            // console.error('Error during login process:', error); // Original log
            showMessage(`An error occurred during login: ${error.message || 'Unknown error'}. Please try again.`, 'error');
        } finally {
            const userRoleFromStorage = sessionStorage.getItem('userRole');
            if (!(userRoleFromStorage === 'Administrateur' || userRoleFromStorage === 'Utilisateur') ||
                (loginMessageArea.style.display === 'block' && loginMessageArea.textContent.includes('Invalid email or password.')) ||
                (loginMessageArea.style.display === 'block' && loginMessageArea.textContent.includes('An error occurred during login:'))) {
                 if (submitButton.disabled) {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Login';
                }
            }
        }
    });

    // console.log('Login form event listeners attached.'); // Original log
});
