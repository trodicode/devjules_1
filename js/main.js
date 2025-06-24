// JavaScript for index.html (User-facing ticket submission form)

document.addEventListener('DOMContentLoaded', () => {
    console.log('main.js loaded for user form.');

    // Access Control Check for index.html (user-facing form)
    // Any authenticated user (Utilisateur or Administrateur) can access this page.
    // They just need to be logged in.
    const userEmailForAccess = sessionStorage.getItem('userEmail');
    const userRoleForAccess = sessionStorage.getItem('userRole'); // Role might be useful for UI tweaks later

    if (!userEmailForAccess) {
        console.warn('Access denied for index page. User not logged in. Redirecting to login.');
        window.location.href = 'login.html';
        return; // Stop further execution of main.js
    }
    // Log access, role might be used later for conditional UI elements if needed
    console.log(`User form access granted for user: ${userEmailForAccess}, Role: ${userRoleForAccess}`);


    // Ensure stackby-api.js and its functions are loaded
    // Also check for i18next
    if (typeof createTicket !== 'function' || typeof COLUMN_NAMES === 'undefined' || typeof i18next === 'undefined' || typeof i18next.t === 'undefined') {
        console.error('Airtable API functions, COLUMN_NAMES, or i18next are not available.');
        const userMessageArea = document.getElementById('userMessageArea');
        if (userMessageArea) {
            const errorMessage = (typeof i18next !== 'undefined' && i18next.t) ?
                i18next.t('ticketFormMessages.criticalApiError') :
                'Critical error: Cannot connect to ticketing system. Please contact support. (API script not loaded or i18n error)';
            userMessageArea.innerHTML = errorMessage;
            userMessageArea.className = 'p-4 rounded-md mb-4 text-center bg-slate-800 border border-red-500 text-red-500'; // Error styling
            userMessageArea.style.display = 'block';
        }
        // Disable form if critical components are missing
        const submitButton = document.querySelector('#ticketForm button[type="submit"]');
        if (submitButton) submitButton.disabled = true;
        return;
    }

    const ticketForm = document.getElementById('ticketForm');
    const userMessageArea = document.getElementById('userMessageArea');

    // Helper to display messages
    function showMessage(message, type = 'success') { // message is already translated
        if (userMessageArea) {
            userMessageArea.textContent = message;
            let classes = 'p-4 rounded-md mb-4 text-center';
            if (type === 'success') {
                classes = 'bg-slate-800 border border-neon-green text-neon-green p-4 rounded-md text-lg mb-4 text-center';
            } else if (type === 'error') {
                classes = 'bg-slate-800 border border-red-500 text-red-500 p-4 rounded-md mb-4 text-center';
            } else { // For any other type, or a generic info - using a blue neon for info
                classes = 'bg-slate-800 border border-neon-blue text-neon-blue p-4 rounded-md mb-4 text-center';
            }
            userMessageArea.className = classes;
            userMessageArea.style.display = 'block';
        } else {
            // Fallback if message area is not found (should not happen with correct HTML)
            type === 'success' ? alert(message) : console.error(message);
        }
    }

    // Helper to show/hide field-specific error messages
    function showFieldError(fieldId, message) {
        const errorDiv = document.getElementById(fieldId + 'Error');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = message ? 'block' : 'none';
        }
    }

    // Client-side validation
    function validateForm(data) {
        let isValid = true;
        // Clear previous field errors
        showFieldError('title', '');
        showFieldError('description', '');
        showFieldError('urgency', '');
        showFieldError('email', ''); // Clear email error

        if (!data[COLUMN_NAMES.TICKET_TITLE]?.trim()) {
            showFieldError('title', i18next.t('ticketFormMessages.validation.titleRequired'));
            isValid = false;
        }
        if (!data[COLUMN_NAMES.DETAILED_DESCRIPTION]?.trim()) {
            showFieldError('description', i18next.t('ticketFormMessages.validation.descriptionRequired'));
            isValid = false;
        }
        if (!data[COLUMN_NAMES.URGENCY_LEVEL]) {
            showFieldError('urgency', i18next.t('ticketFormMessages.validation.urgencyRequired'));
            isValid = false;
        }

        if (data[COLUMN_NAMES.REQUESTER_EMAIL]) {
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(data[COLUMN_NAMES.REQUESTER_EMAIL])) {
                showFieldError('email', i18next.t('ticketFormMessages.validation.emailInvalid'));
                isValid = false;
            }
        } else {
             showFieldError('email', i18next.t('ticketFormMessages.validation.emailRequired'));
             isValid = false;
        }
        return isValid;
    }

    if (ticketForm) {
        ticketForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            userMessageArea.style.display = 'none'; // Hide previous general messages
            console.log('Ticket form submission initiated.');

            const titleInput = document.getElementById('ticketTitle');
            const descriptionInput = document.getElementById('detailedDescription');
            const urgencyInput = document.getElementById('urgencyLevel');
            const requesterEmailInput = document.getElementById('requesterEmail'); // New email input
            const attachmentUrlInput = document.getElementById('attachmentUrl');

            const ticketData = {
                [COLUMN_NAMES.TICKET_TITLE]: titleInput.value,
                [COLUMN_NAMES.DETAILED_DESCRIPTION]: descriptionInput.value,
                [COLUMN_NAMES.URGENCY_LEVEL]: urgencyInput.value,
                [COLUMN_NAMES.REQUESTER_EMAIL]: requesterEmailInput.value.trim(), // Add email to ticketData
            };

            const attachmentUrlValue = attachmentUrlInput.value.trim();
            if (attachmentUrlValue) {
                // Airtable expects attachments to be an array of objects, each with a url property.
                ticketData[COLUMN_NAMES.ATTACHMENT] = [{ url: attachmentUrlValue }];
            }
            // If attachmentUrlValue is empty, the ATTACHMENT field will be omitted from ticketData.

            // Perform validation (Note: Attachment URL is optional, so not validated here for presence)
            if (!validateForm(ticketData)) {
                showMessage(i18next.t('ticketFormMessages.correctFormErrors'), 'error');
                return; // Stop submission if validation fails
            }

            console.log('Form validated successfully. Preparing data for Airtable:', ticketData);

            // Disable button to prevent multiple submissions
            const submitButton = ticketForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = i18next.t('ticketForm.submittingButton');

            try {
                const result = await createTicket(ticketData);

                // Corrected check: Stackby returns the created row object directly, which has a top-level 'rowId'.
                // The success check now uses 'id' which is what Airtable returns as the record ID.
                if (result && result.id) {
                    const displayId = (result.fields && result.fields[COLUMN_NAMES.TICKET_ID]) || result.id;
                    showMessage(i18next.t('ticketFormMessages.submissionSuccess', { displayId: displayId }), 'success');
                    ticketForm.reset();
                    showFieldError('title', '');
                    showFieldError('description', '');
                    showFieldError('urgency', '');
                    showFieldError('email', ''); // Clear email error on success

                    const submitAnotherButton = document.createElement('button');
                    submitAnotherButton.type = 'button';
                    submitAnotherButton.id = 'submitAnotherTicket';
                    submitAnotherButton.className = 'font-title mt-4 w-full flex justify-center py-2 px-4 border-2 border-neon-blue text-neon-blue hover:bg-neon-blue hover:text-dark-bg font-semibold rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neon-blue focus:ring-offset-dark-bg';
                    submitAnotherButton.textContent = i18next.t('ticketForm.submitAnotherButton');

                    userMessageArea.parentNode.insertBefore(submitAnotherButton, userMessageArea.nextSibling);

                    submitAnotherButton.addEventListener('click', () => {
                        userMessageArea.style.display = 'none'; // Hide success message
                        submitAnotherButton.remove(); // Remove the button itself

                        if (submitButton) {
                            submitButton.disabled = false;
                            submitButton.textContent = i18next.t('ticketForm.submitButton');
                        }
                        // This is more of a safeguard.
                        showFieldError('title', '');
                        showFieldError('description', '');
                        showFieldError('urgency', '');
                        showFieldError('email', '');
                    });


                    // Placeholder: Send email confirmation to user.
                    console.log(`Placeholder: Trigger email confirmation for ticket ID ${displayId} to the user.`);
                } else {
                    console.error('Failed to create ticket or unexpected response:', result);
                    showMessage(i18next.t('ticketFormMessages.submissionFailed'), 'error');
                }
            } catch (error) {
                console.error('Error during ticket submission:', error);
                showMessage(i18next.t('ticketFormMessages.submissionError', { errorMessage: error.message || i18next.t('ticketFormMessages.unknownError') }), 'error');
            } finally {
                const submitAnotherButtonExists = document.getElementById('submitAnotherTicket');
                if (!submitAnotherButtonExists) {
                    submitButton.disabled = false;
                    submitButton.textContent = i18next.t('ticketForm.submitButton');
                } else {
                    submitButton.disabled = true;
                }
            }
        });
    } else {
        console.error('#ticketForm not found in the DOM.');
    }
});
