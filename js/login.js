document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Login system completely refactored');

    // === CONFIGURATION CHECK ===
    const debugPanel = document.getElementById('debugPanel');
    const debugInfo = document.getElementById('debugInfo');

    if (debugPanel && debugInfo && typeof DEBUG_MODE !== 'undefined' && DEBUG_MODE) {
        debugPanel.style.display = 'block';
        const configStatus = [
            typeof BASEROW_API_TOKEN !== 'undefined' ? '✅ API Token: Configuré' : '❌ API Token: Non chargé',
            typeof BASEROW_USERS_TABLE_ID !== 'undefined' ? '✅ Users Table ID: Configuré' : '❌ Users Table ID: Non chargé',
            typeof window.getUserByEmail === 'function' ? '✅ getUserByEmail: Disponible' : '❌ getUserByEmail: Non disponible',
            typeof window.COLUMN_NAMES !== 'undefined' ? '✅ COLUMN_NAMES: Chargé' : '❌ COLUMN_NAMES: Non chargé'
        ];
        debugInfo.innerHTML = configStatus.join('<br>');
    }

    // === UTILITY FUNCTIONS ===
    function clearAllStorage() {
        sessionStorage.clear();
        localStorage.clear();
        console.log('🔧 All storage cleared');
    }

    function clearFormFields() {
        const emailField = document.getElementById('email');
        const passwordField = document.getElementById('password');
        if (emailField) {
            emailField.value = '';
            emailField.setAttribute('value', '');
        }
        if (passwordField) {
            passwordField.value = '';
            passwordField.setAttribute('value', '');
        }
        console.log('🔧 Form fields cleared');
    }

    function showMessage(message, type = 'info') {
        const messageArea = document.getElementById('loginMessageArea');
        if (messageArea) {
            messageArea.textContent = message;
            messageArea.style.display = 'block';
            const baseClasses = 'p-3 rounded-md mb-4 text-center text-sm';
            switch (type) {
                case 'success': messageArea.className = `${baseClasses} bg-slate-800 border border-neon-green text-neon-green`; break;
                case 'error': messageArea.className = `${baseClasses} bg-slate-800 border border-red-500 text-red-500`; break;
                default: messageArea.className = `${baseClasses} bg-slate-800 border border-neon-blue text-neon-blue`; break;
            }
        }
    }

    // === EVENT LISTENERS FOR CONTROL BUTTONS ===
    document.getElementById('forceLogoutBtn')?.addEventListener('click', () => {
        clearAllStorage();
        alert('All sessions cleared! Please refresh the page.');
    });

    document.getElementById('clearFieldsBtn')?.addEventListener('click', () => {
        clearFormFields();
    });

    document.getElementById('showStorageBtn')?.addEventListener('click', () => {
        console.log('🔍 sessionStorage:', {
            userEmail: sessionStorage.getItem('userEmail'),
            userRole: sessionStorage.getItem('userRole')
        });
        console.log('🔍 localStorage:', Object.fromEntries(
            Array.from({length: localStorage.length}, (_, i) => [
                localStorage.key(i),
                localStorage.getItem(localStorage.key(i))
            ])
        ));
        alert('Check console for storage details');
    });

    // === MAIN LOGIN FORM ===
    const loginForm = document.getElementById('loginForm');
    const submitButton = loginForm?.querySelector('button[type="submit"]');

    if (!loginForm || !submitButton) {
        console.error('❌ Login form elements not found');
        showMessage('Critical error: Login interface not found.', 'error');
        return;
    }

    // === FORM SUBMISSION HANDLER ===
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        console.log('🔐 Login form submitted');

        // Get form values
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');

        const email = emailInput?.value?.trim() || '';
        const password = passwordInput?.value?.trim() || '';

        console.log('📝 Form values:', { email: email || '(empty)', password: password ? '***' : '(empty)' });

        // Validation
        if (!email || !password) {
            showMessage('Email and Password are required.', 'error');
            return;
        }

        // Disable form during submission
        submitButton.disabled = true;
        submitButton.textContent = 'Logging in...';
        showMessage('Connecting to authentication system...', 'info');

        try {
            // CRITICAL: Clear ALL storage before login
            clearAllStorage();

            console.log('🔍 Searching for user:', email);
            const userRecord = await window.getUserByEmail(email);

            if (!userRecord) {
                throw new Error('User not found in database');
            }

            console.log('👤 User found:', {
                id: userRecord.id,
                hasFields: !!userRecord.fields,
                fieldsCount: userRecord.fields ? Object.keys(userRecord.fields).length : 0
            });

            if (!userRecord.fields) {
                throw new Error('User data is incomplete');
            }

            // Extract user data with detailed logging
            const userFields = userRecord.fields;
            const storedPassword = userFields[window.COLUMN_NAMES.USER_PASSWORD];
            const userRoleRaw = userFields[window.COLUMN_NAMES.USER_ROLE];

            console.log('🔐 Authentication data:', {
                storedPassword: storedPassword ? '***' : '(empty)',
                userRoleRaw: userRoleRaw,
                roleType: typeof userRoleRaw
            });

            // Determine user role (handle both object and string formats)
            let userRole = null;
            if (userRoleRaw) {
                if (typeof userRoleRaw === 'object' && userRoleRaw.value) {
                    userRole = userRoleRaw.value;
                } else if (typeof userRoleRaw === 'string') {
                    userRole = userRoleRaw;
                }
            }

            console.log('🏷️ Final user role:', userRole);

            // Password verification
            if (storedPassword !== password) {
                throw new Error('Password does not match');
            }

            // Authentication successful
            console.log('✅ Authentication successful for:', email, 'with role:', userRole);

            // Set session data
            sessionStorage.setItem('userEmail', email);
            sessionStorage.setItem('userRole', userRole || '');

            showMessage('Login successful! Redirecting...', 'success');

            // Redirect based on role
            setTimeout(() => {
                const redirectUrl = userRole === 'Administrateur' ? 'admin.html' : 'index.html';
                console.log('🔀 Redirecting to:', redirectUrl);
                window.location.href = redirectUrl;
            }, 1000);

        } catch (error) {
            console.error('❌ Login error:', error.message);
            showMessage(`Authentication failed: ${error.message}`, 'error');

            // Re-enable form
            submitButton.disabled = false;
            submitButton.textContent = 'Login';
        }
    });



    // === INITIALIZATION ===
    console.log('✅ Login system initialized');
    clearFormFields();
});
