// JavaScript for index.html (User-facing ticket submission form)

document.addEventListener('DOMContentLoaded', () => {
    console.log('main.js loaded for user form.');

    // Ensure airtable-api.js and its functions are loaded
    if (typeof createTicket !== 'function' || typeof COLUMN_NAMES === 'undefined') {
        console.error('Airtable API functions or COLUMN_NAMES are not available. Ensure airtable-api.js is loaded correctly before main.js and functions are globally accessible.');
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
    function showMessage(message, type = 'success', isHTML = false) {
        if (userMessageArea) {
            if (isHTML) {
                userMessageArea.innerHTML = message;
            } else {
                userMessageArea.textContent = message;
            }
            userMessageArea.className = `message-area ${type}`;
            userMessageArea.style.display = 'block';
        } else {
            // Fallback if message area is not found
            isHTML ? console.log(`HTML Message (${type}): ${message}`) : (type === 'success' ? alert(message) : console.error(message));
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
        showFieldError('requestTitle', ''); // Adjusted for requestTitle
        showFieldError('description', '');
        showFieldError('urgency', '');
        showFieldError('email', ''); // Clear email error

        if (!data[COLUMN_NAMES.TICKET_TITLE]?.trim()) { // Still uses COLUMN_NAMES.TICKET_TITLE for the data key
            showFieldError('requestTitle', 'Request Title is required.'); // Error message for requestTitle
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

            const titleInput = document.getElementById('requestTitle'); // Changed from ticketTitle
            const descriptionInput = document.getElementById('detailedDescription');
            const urgencyInput = document.getElementById('urgencyLevel');
            const requesterEmailInput = document.getElementById('requesterEmail');
            const attachmentsInput = document.getElementById('attachments');

            const ticketData = {
                [COLUMN_NAMES.TICKET_TITLE]: titleInput.value,
                [COLUMN_NAMES.DETAILED_DESCRIPTION]: descriptionInput.value,
                [COLUMN_NAMES.URGENCY_LEVEL]: urgencyInput.value,
                [COLUMN_NAMES.REQUESTER_EMAIL]: requesterEmailInput.value.trim(),
                // Attachment will be handled below
            };

            // Handle file input for API
            if (attachmentsInput.files.length > 0) {
                const file = attachmentsInput.files[0];
                console.log('File selected for attachment:', file.name);
                // Pass the filename to be handled by airtable-api.js
                // It will be formatted as { url: `file://${filename}` } by the API script
                ticketData[COLUMN_NAMES.ATTACHMENT] = file.name;
            } else {
                ticketData[COLUMN_NAMES.ATTACHMENT] = null; // Or omit if API handles missing field gracefully
            }
            
            // Perform validation
            if (!validateForm(ticketData)) { // validateForm now uses requestTitle for field error
                showMessage('Please correct the errors in the form.', 'error');
                return; // Stop submission if validation fails
            }

            console.log('Form validated successfully. Preparing data for Airtable:', ticketData);
            
            // Disable button to prevent multiple submissions
            const submitButton = ticketForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = 'Submitting...';

            // ACTUAL API CALL
            try {
                const result = await createTicket(ticketData);
                if (result && result.id) { 
                    const ticketIdFromAirtable = result.fields && result.fields[COLUMN_NAMES.TICKET_ID] ? result.fields[COLUMN_NAMES.TICKET_ID] : result.id;
                    const userEmail = requesterEmailInput.value.trim();
                    const ticketTitle = titleInput.value;

                    let successMessage = `Ticket submitted successfully! Your Ticket ID is: <strong>${ticketIdFromAirtable}</strong>.`;
                    if (ticketData[COLUMN_NAMES.ATTACHMENT]) {
                        successMessage += `<br>Attachment filename "${ticketData[COLUMN_NAMES.ATTACHMENT]}" has been noted (actual file upload functionality is separate).`;
                    }

                    const mailtoSubject = `Ticket Confirmation - ID: ${ticketIdFromAirtable}`;
                    const mailtoBody = `Dear User,\n\nThank you for your submission.\nYour ticket titled "${ticketTitle}" has been received.\n\nTicket ID: ${ticketIdFromAirtable}\nStatus: New\n\nWe will get back to you shortly.`;
                    const mailtoLink = `mailto:${userEmail}?subject=${encodeURIComponent(mailtoSubject)}&body=${encodeURIComponent(mailtoBody)}`;

                    successMessage += `<br><br>A confirmation email draft has been prepared: <a href="${mailtoLink}" target="_blank">Click here to open email draft</a>`;

                    showMessage(successMessage, 'success', true); // true for isHTML
                    ticketForm.reset();
                    showFieldError('requestTitle', '');
                    showFieldError('description', '');
                    showFieldError('urgency', '');
                    showFieldError('email', '');
                    console.log(`Mailto link generated for ticket ID ${ticketIdFromAirtable} to ${userEmail}.`);
                } else {
                    console.error('Failed to create ticket or unexpected response:', result);
                    showMessage('Failed to submit ticket. The server returned an unexpected response. Please try again later.', 'error');
                }
            } catch (error) {
                console.error('Error during ticket submission:', error);
                showMessage(`An error occurred while submitting your ticket: ${error.message || 'Unknown error'}. Please try again.`, 'error');
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Submit Ticket';
            }
        });
    } else {
        console.error('#ticketForm not found in the DOM.');
    }
});
