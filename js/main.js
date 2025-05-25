// JavaScript for index.html (User-facing ticket submission form)

document.addEventListener('DOMContentLoaded', () => {
    console.log('main.js loaded for user form.');

    // Ensure stackby-api.js and its functions are loaded
    if (typeof createTicket !== 'function' || typeof COLUMN_NAMES === 'undefined') {
        console.error('Stackby API functions or COLUMN_NAMES are not available. Ensure stackby-api.js is loaded correctly before main.js and functions are globally accessible.');
        // Display a critical error to the user on the page as well, as the form won't work.
        const userMessageArea = document.getElementById('userMessageArea');
        if (userMessageArea) {
            userMessageArea.innerHTML = 'Critical error: Cannot connect to ticketing system. Please contact support. (API script not loaded)';
            userMessageArea.className = 'message-area error';
            userMessageArea.style.display = 'block';
        }
        return; // Stop further execution if API is not ready
    }

    const ticketForm = document.getElementById('ticketForm');
    const userMessageArea = document.getElementById('userMessageArea');

    // Helper to display messages
    function showMessage(message, type = 'success') {
        if (userMessageArea) {
            userMessageArea.textContent = message;
            userMessageArea.className = `message-area ${type}`;
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
        // Validate email format (basic)
        if (data[COLUMN_NAMES.REQUESTER_EMAIL]) { // Only validate if email is provided (assuming it's required by HTML `required` attribute)
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(data[COLUMN_NAMES.REQUESTER_EMAIL])) {
                showFieldError('email', 'Please enter a valid email address.');
                isValid = false;
            }
        } else { // If required attribute is set, this handles empty case.
             showFieldError('email', 'Email du demandeur is required.');
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
                showMessage('Please correct the errors in the form.', 'error');
                return; // Stop submission if validation fails
            }

            console.log('Form validated successfully. Preparing data for Stackby:', ticketData);
            
            // Disable button to prevent multiple submissions
            const submitButton = ticketForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = 'Submitting...';

            try {
                const result = await createTicket(ticketData); // createTicket is from stackby-api.js
                
                // Corrected check: Stackby returns the created row object directly, which has a top-level 'rowId'.
                // The success check now uses 'id' which is what Airtable returns as the record ID.
                if (result && result.id) { 
                    // For display, prefer a user-defined "Ticket ID" field if it exists in result.fields, otherwise fallback to Airtable record ID.
                    const displayId = (result.fields && result.fields[COLUMN_NAMES.TICKET_ID]) || result.id;
                    showMessage(`Ticket submitted successfully! Your Ticket ID is: ${displayId}. You will receive an email confirmation shortly (placeholder).`, 'success');
                    ticketForm.reset(); // Clear the form
                    // Clear individual field errors as well
                    showFieldError('title', '');
                    showFieldError('description', '');
                    showFieldError('urgency', '');
                    showFieldError('email', ''); // Clear email error on success

                    // Placeholder: Send email confirmation to user.
                    console.log(`Placeholder: Trigger email confirmation for ticket ID ${displayId} to the user.`);
                }
                // Removed the specific "Mock ticket created successfully" check as API is live.
                // The generic 'else' block will now handle cases where result is not as expected from a live API.
                else {
                    console.error('Failed to create ticket or unexpected response:', result);
                    showMessage('Failed to submit ticket. The server returned an unexpected response. Please try again later.', 'error');
                }
            } catch (error) {
                console.error('Error during ticket submission:', error);
                showMessage(`An error occurred while submitting your ticket: ${error.message || 'Unknown error'}. Please try again.`, 'error');
            } finally {
                // Re-enable button
                submitButton.disabled = false;
                submitButton.textContent = 'Submit Ticket';
            }
        });
    } else {
        console.error('#ticketForm not found in the DOM.');
    }
});
