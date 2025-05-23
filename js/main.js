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
            const attachmentInput = document.getElementById('attachment');

            const ticketData = {
                [COLUMN_NAMES.TICKET_TITLE]: titleInput.value,
                [COLUMN_NAMES.DETAILED_DESCRIPTION]: descriptionInput.value,
                [COLUMN_NAMES.URGENCY_LEVEL]: urgencyInput.value,
                [COLUMN_NAMES.ATTACHMENT]: attachmentInput.files.length > 0 ? attachmentInput.files[0].name : '' // Store filename as string
            };
            
            // Perform validation
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
                
                if (result && result[COLUMN_NAMES.ROW_ID]) { // Check if result is valid and has a rowId (Stackby usually returns the created row object)
                    // Stackby's response for create is often an array with one element, the created row.
                    // The actual unique ID might be in a field like "Ticket ID" (if auto-incremented) or just the internal "rowId".
                    // Let's assume result is the created row object and it might have a 'Ticket ID' field or use rowId.
                    const displayId = result[COLUMN_NAMES.TICKET_ID] || result[COLUMN_NAMES.ROW_ID];
                    showMessage(`Ticket submitted successfully! Your Ticket ID is: ${displayId}. You will receive an email confirmation shortly (placeholder).`, 'success');
                    ticketForm.reset(); // Clear the form
                    // Clear individual field errors as well
                    showFieldError('title', '');
                    showFieldError('description', '');
                    showFieldError('urgency', '');

                    // Placeholder: Send email confirmation to user.
                    console.log(`Placeholder: Trigger email confirmation for ticket ID ${displayId} to the user.`);

                } else if (result && result.message && result.message.includes("Mock ticket created successfully")) {
                    // Handling for the mock success message if API is still in mock mode
                    const displayId = result.id || 'N/A';
                    showMessage(`Ticket submitted successfully (Mock)! Your Ticket ID is: ${displayId}. You will receive an email confirmation shortly (placeholder).`, 'success');
                    ticketForm.reset();
                    showFieldError('title', '');
                    showFieldError('description', '');
                    showFieldError('urgency', '');
                    console.log(`Placeholder: Trigger email confirmation for MOCK ticket ID ${displayId} to the user.`);
                }
                
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
