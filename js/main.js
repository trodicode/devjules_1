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
            // Default classes
            let classes = 'p-4 rounded-md mb-4'; // Added mb-4 for spacing
            if (type === 'success') {
                // More prominent success styling
                classes += ' bg-green-100 border border-green-400 text-green-700 text-lg p-6'; // Larger font, more padding, distinct colors
            } else if (type === 'error') {
                classes += ' bg-red-100 border border-red-400 text-red-700';
            } else { // For any other type, or a generic info
                classes += ' bg-blue-100 border border-blue-400 text-blue-700';
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

                    // Create and append the "Submit Another Ticket" button
                    const submitAnotherButton = document.createElement('button');
                    submitAnotherButton.type = 'button';
                    submitAnotherButton.id = 'submitAnotherTicket';
                    submitAnotherButton.className = 'mt-4 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500';
                    submitAnotherButton.textContent = 'Submit Another Ticket';

                    // Insert the new button after the message area
                    userMessageArea.parentNode.insertBefore(submitAnotherButton, userMessageArea.nextSibling);

                    submitAnotherButton.addEventListener('click', () => {
                        userMessageArea.style.display = 'none'; // Hide success message
                        submitAnotherButton.remove(); // Remove the button itself

                        // Ensure the main submit button is re-enabled and reset to its original text
                        if (submitButton) {
                            submitButton.disabled = false;
                            submitButton.textContent = 'Submit Ticket';
                        }
                        // Optionally clear lingering field errors if ticketForm.reset() didn't (though it usually does)
                        // This is more of a safeguard.
                        showFieldError('title', '');
                        showFieldError('description', '');
                        showFieldError('urgency', '');
                        showFieldError('email', '');
                    });


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
                // Re-enable button - only if not a success case where new button handles it
                // or if an error occurred.
                const submitAnotherButtonExists = document.getElementById('submitAnotherTicket');
                if (!submitAnotherButtonExists) {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Submit Ticket';
                } else {
                    // If "Submit Another Ticket" button exists, the main submit button should remain disabled
                    // until "Submit Another Ticket" is clicked.
                    submitButton.disabled = true;
                }
            }
        });
    } else {
        console.error('#ticketForm not found in the DOM.');
    }
});
