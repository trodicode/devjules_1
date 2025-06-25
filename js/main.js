// JavaScript for index.html (User-facing ticket submission form)

document.addEventListener('DOMContentLoaded', () => {
    // console.log('main.js loaded for user form.'); // Original log

    // Access Control Check for index.html
    const userEmailForAccess = sessionStorage.getItem('userEmail');
    // const userRoleForAccess = sessionStorage.getItem('userRole');

    if (!userEmailForAccess) {
        // console.warn('Access denied for index page. User not logged in. Redirecting to login.'); // Original log
        window.location.href = 'login.html';
        return;
    }
    // console.log(`User form access granted for user: ${userEmailForAccess}, Role: ${userRoleForAccess}`); // Original log


    // Ensure airtable-api.js and its functions are loaded
    if (typeof createTicket !== 'function' || typeof COLUMN_NAMES === 'undefined') {
        // console.error('Airtable API functions or COLUMN_NAMES are not available.'); // Original log
        const userMessageArea = document.getElementById('userMessageArea');
        if (userMessageArea) {
            userMessageArea.innerHTML = 'Critical error: Cannot connect to ticketing system. Please contact support. (API script not loaded)';
            userMessageArea.className = 'p-4 rounded-md mb-4 text-center bg-slate-800 border border-red-500 text-red-500';
            userMessageArea.style.display = 'block';
        }
        const submitButton = document.querySelector('#ticketForm button[type="submit"]');
        if (submitButton) submitButton.disabled = true;
        return;
    }

    const ticketForm = document.getElementById('ticketForm');
    const userMessageArea = document.getElementById('userMessageArea');

    // Helper to display messages
    function showMessage(message, type = 'success') {
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
        showFieldError('email', '');

        if (!data[COLUMN_NAMES.TICKET_TITLE]?.trim()) {
            showFieldError('title', 'Ticket Title is required.');
            isValid = false;
        }
        if (!data[COLUMN_NAMES.DETAILED_DESCRIPTION]?.trim()) {
            showFieldError('description', 'Detailed Description is required.');
            isValid = false;
        }
        if (!data[COLUMN_NAMES.URGENCY_LEVEL]) {
            showFieldError('urgency', 'Urgency Level is required.');
            isValid = false;
        }

        if (data[COLUMN_NAMES.REQUESTER_EMAIL]) {
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(data[COLUMN_NAMES.REQUESTER_EMAIL])) {
                showFieldError('email', 'Please enter a valid email address.');
                isValid = false;
            }
        } else {
             showFieldError('email', 'Your Email is required.'); // Changed from "Email du demandeur" for consistency
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

            // Perform validation
            if (!validateForm(ticketData)) {
                showMessage('Please correct the errors in the form.', 'error');
                return;
            }

            // console.log('Form validated successfully. Preparing data for Airtable:', ticketData); // Original log

            // Disable button to prevent multiple submissions
            const submitButton = ticketForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = 'Submitting...';

            try {
                const result = await createTicket(ticketData);

                // Corrected check: Stackby returns the created row object directly, which has a top-level 'rowId'.
                if (result && result.id) {
                    const displayId = (result.fields && result.fields[COLUMN_NAMES.TICKET_ID]) || result.id;
                    showMessage(`Ticket submitted successfully! Your Ticket ID is: ${displayId}. You will receive an email confirmation shortly (placeholder).`, 'success');
                    ticketForm.reset();
                    showFieldError('title', '');
                    showFieldError('description', '');
                    showFieldError('urgency', '');
                    showFieldError('email', ''); // Clear email error on success

                    const submitAnotherButton = document.createElement('button');
                    submitAnotherButton.type = 'button';
                    submitAnotherButton.id = 'submitAnotherTicket';
                    submitAnotherButton.className = 'font-title mt-4 w-full flex justify-center py-2 px-4 border-2 border-neon-blue text-neon-blue hover:bg-neon-blue hover:text-dark-bg font-semibold rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neon-blue focus:ring-offset-dark-bg';
                    submitAnotherButton.textContent = 'Submit Another Ticket';

                    userMessageArea.parentNode.insertBefore(submitAnotherButton, userMessageArea.nextSibling);

                    submitAnotherButton.addEventListener('click', () => {
                        userMessageArea.style.display = 'none'; // Hide success message
                        submitAnotherButton.remove(); // Remove the button itself

                        if (submitButton) {
                            submitButton.disabled = false;
                            submitButton.textContent = 'Submit Ticket';
                        }
                        showFieldError('title', '');
                        showFieldError('description', '');
                        showFieldError('urgency', '');
                        showFieldError('email', '');
                    });


                    // console.log(`Placeholder: Trigger email confirmation for ticket ID ${displayId} to the user.`); // Original log
                } else {
                    // console.error('Failed to create ticket or unexpected response:', result); // Original log
                    showMessage('Failed to submit ticket. The server returned an unexpected response. Please try again later.', 'error');
                }
            } catch (error) {
                // console.error('Error during ticket submission:', error); // Original log
                showMessage(`An error occurred while submitting your ticket: ${error.message || 'Unknown error'}. Please try again.`, 'error');
            } finally {
                const submitAnotherButtonExists = document.getElementById('submitAnotherTicket');
                if (!submitAnotherButtonExists) {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Submit Ticket';
                } else {
                    submitButton.disabled = true;
                }
            }
        });
    } else {
        // console.error('#ticketForm not found in the DOM.'); // Original log
    }
});
