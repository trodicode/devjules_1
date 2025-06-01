// JavaScript for admin.html (Admin ticket dashboard)

document.addEventListener('DOMContentLoaded', () => {
    console.log('admin.js loaded for admin dashboard.');

    // Ensure airtable-api.js and its functions are loaded
    if (typeof getAllTickets !== 'function' || typeof getTicketById !== 'function' || typeof updateTicket !== 'function' || typeof COLUMN_NAMES === 'undefined') {
        console.error('Airtable API functions or COLUMN_NAMES are not available. Ensure airtable-api.js is loaded correctly before admin.js.');
        showMessageOnPage('Critical error: Cannot connect to ticketing system. (API script not loaded)', 'error');
        return;
    }

    // Main dashboard elements
    const ticketTableBody = document.getElementById('ticketTableBody');
    const adminMessageArea = document.getElementById('adminMessageArea');
    const statusFilter = document.getElementById('statusFilter');
    const urgencyFilter = document.getElementById('urgencyFilter');
    const searchInput = document.getElementById('searchInput');
    let tableHeaders = document.querySelectorAll('#ticketTable th[data-sort-by]'); // Will be re-queried after dynamic header text update

    // Modal elements
    const ticketDetailModal = document.getElementById('ticketDetailModal');
    const modalTicketId = document.getElementById('modalTicketId');
    const modalTicketTitle = document.getElementById('modalTicketTitle');
    const modalTicketDescription = document.getElementById('modalTicketDescription');
    const modalTicketUrgency = document.getElementById('modalTicketUrgency');
    const modalTicketStatus = document.getElementById('modalTicketStatus');
    const modalTicketAssignee = document.getElementById('modalTicketAssignee');
    const modalTicketSubmissionDate = document.getElementById('modalTicketSubmissionDate');
    const modalTicketAttachment = document.getElementById('modalTicketAttachment');
    const modalChangeStatusSelect = document.getElementById('modalChangeStatus');
    const modalSaveStatusButton = document.getElementById('modalSaveStatusButton');
    const modalAssignCollaboratorSelect = document.getElementById('modalAssignCollaborator'); // Changed from Input
    const modalSaveAssigneeButton = document.getElementById('modalSaveAssigneeButton');
    const modalUserMessageArea = document.getElementById('modalUserMessageArea');

    let allTickets = [];
    let currentSort = { column: null, ascending: true };
    let currentlySelectedTicketRowId = null;

    const HARDCODED_COLLABORATORS = ["Admin User 1", "Support Tech A", "Support Tech B", "Specialist C", "Unassigned"];

    // --- Message Display ---
    function showMessageOnPage(message, type = 'info') {
        if (adminMessageArea) {
            adminMessageArea.textContent = message;
            adminMessageArea.className = `message-area ${type}`;
            adminMessageArea.style.display = 'block';
            // Hide table if it's not an info message about loading or no results
            if (type === 'error' || (type === 'info' && message !== 'Loading tickets...' && !message.includes("No tickets"))) {
                 if(ticketTableBody) ticketTableBody.innerHTML = ''; // Clear table on error
            }
        } else {
            type === 'error' ? console.error(message) : console.log(message);
        }
    }

    function showMessageInModal(message, type = 'info') {
        if (modalUserMessageArea) {
            modalUserMessageArea.textContent = message;
            modalUserMessageArea.className = `message-area ${type}`; // Make sure CSS for .message-area.info exists or is handled
            modalUserMessageArea.style.display = 'block';
        } else {
            type === 'error' ? console.error(message) : console.log(message);
        }
    }

    // --- Ticket Rendering ---
    function renderTickets(ticketsToRender) {
        if (!ticketTableBody) return;
        ticketTableBody.innerHTML = ''; // Clear existing rows first

        if (!ticketsToRender || ticketsToRender.length === 0) {
            // Message handled by loadAndDisplayTickets or applyFiltersAndSort
            // showMessageOnPage('No tickets found matching your criteria.', 'info');
            const row = ticketTableBody.insertRow();
            const cell = row.insertCell();
            cell.colSpan = tableHeaders.length;
            cell.textContent = 'No tickets to display.';
            cell.style.textAlign = 'center';
            return;
        }
        
        // Clear general messages if tickets are present
        if(adminMessageArea.textContent === 'Loading tickets...' || adminMessageArea.textContent.includes("No tickets")) {
            adminMessageArea.style.display = 'none';
        }


        ticketsToRender.forEach(ticket => {
            const row = ticketTableBody.insertRow();
            const fields = ticket.fields || {};
            // Use ticket.id (Airtable record ID) instead of ticket.rowId
            const recordId = ticket.id;

            row.insertCell().textContent = fields[COLUMN_NAMES.TICKET_ID] || recordId || 'N/A';
            
            const titleCell = row.insertCell();
            titleCell.textContent = fields[COLUMN_NAMES.TICKET_TITLE] || 'No Title';
            titleCell.style.cursor = 'pointer';
            titleCell.style.color = '#007bff';
            // Pass recordId to openTicketDetailModal
            titleCell.onclick = () => openTicketDetailModal(recordId);

            // Add Requester Email cell
            row.insertCell().textContent = fields[COLUMN_NAMES.REQUESTER_EMAIL] || 'N/A';

            row.insertCell().textContent = ticket.created_at ? new Date(ticket.created_at).toLocaleDateString() : 'Unknown Date';
            row.insertCell().textContent = fields[COLUMN_NAMES.URGENCY_LEVEL] || 'Normal';
            row.insertCell().textContent = fields[COLUMN_NAMES.STATUS] || 'New';
            row.insertCell().textContent = fields[COLUMN_NAMES.ASSIGNED_COLLABORATOR] || 'Unassigned';

            const actionsCell = row.insertCell();
            const viewDetailsButton = document.createElement('button');
            viewDetailsButton.textContent = 'View/Edit';
            viewDetailsButton.className = 'action-btn edit';
            // Pass recordId to openTicketDetailModal
            viewDetailsButton.onclick = () => openTicketDetailModal(recordId);
            actionsCell.appendChild(viewDetailsButton);
        });
    }

    // --- Data Fetching & Processing ---
    async function loadAndDisplayTickets() {
        showMessageOnPage('Loading tickets...', 'info');
        if(ticketTableBody) ticketTableBody.innerHTML = ''; // Clear table while loading
        try {
            const tickets = await getAllTickets();
            if (tickets && Array.isArray(tickets)) {
                allTickets = tickets;
                applyFiltersAndSort(); // This will call renderTickets
                if (allTickets.length === 0) {
                    showMessageOnPage('No tickets currently in the system.', 'info');
                } else {
                     adminMessageArea.style.display = 'none'; // Hide loading/info message if tickets are shown
                }
            } else {
                showMessageOnPage('Could not retrieve tickets. Data format unexpected.', 'error');
                allTickets = [];
                renderTickets([]); // Ensure "No tickets to display" is shown
            }
        } catch (error) {
            showMessageOnPage(`Error loading tickets: ${error.message || 'Unknown error'}.`, 'error');
            allTickets = [];
            renderTickets([]); // Ensure "No tickets to display" is shown
        }
    }

    function filterTickets() {
        let filteredTickets = [...allTickets];
        const statusValue = statusFilter.value;
        const urgencyValue = urgencyFilter.value;
        const searchTerm = searchInput.value.toLowerCase().trim();

        if (statusValue !== 'All') {
            filteredTickets = filteredTickets.filter(t => (t.fields && t.fields[COLUMN_NAMES.STATUS] === statusValue));
        }
        if (urgencyValue !== 'All') {
            filteredTickets = filteredTickets.filter(t => (t.fields && t.fields[COLUMN_NAMES.URGENCY_LEVEL] === urgencyValue));
        }
        if (searchTerm) {
            filteredTickets = filteredTickets.filter(t => {
                const title = (t.fields && t.fields[COLUMN_NAMES.TICKET_TITLE] || '').toLowerCase();
                const description = (t.fields && t.fields[COLUMN_NAMES.DETAILED_DESCRIPTION] || '').toLowerCase();
                const requesterEmail = (t.fields && t.fields[COLUMN_NAMES.REQUESTER_EMAIL] || '').toLowerCase();
                const ticketId = (t.fields && t.fields[COLUMN_NAMES.TICKET_ID] || t.id || '').toLowerCase();
                return title.includes(searchTerm) || description.includes(searchTerm) || requesterEmail.includes(searchTerm) || ticketId.includes(searchTerm);
            });
        }
        return filteredTickets;
    }

    function sortTickets(tickets, sortKey, ascending) {
        // sortKey is now directly from data-sort-by, e.g., "TICKET_TITLE", "REQUESTER_EMAIL", or "created_at"
        const fieldName = COLUMN_NAMES[sortKey] || sortKey; // Get actual field name if mapped, else use sortKey

        const sortedTickets = [...tickets].sort((a, b) => {
            let valA, valB;

            if (sortKey === 'created_at') {
                valA = a.created_at ? new Date(a.created_at).getTime() : 0;
                valB = b.created_at ? new Date(b.created_at).getTime() : 0;
            } else {
                valA = (a.fields && a.fields[fieldName]) || '';
                valB = (b.fields && b.fields[fieldName]) || '';
                valA = String(valA).toLowerCase();
                valB = String(valB).toLowerCase();
            }

            if (valA < valB) return ascending ? -1 : 1;
            if (valA > valB) return ascending ? 1 : -1;
            return 0;
        });
        return sortedTickets;
    }
    
    function applyFiltersAndSort() {
        let processedTickets = filterTickets();
        if (currentSort.column) {
            processedTickets = sortTickets(processedTickets, currentSort.column, currentSort.ascending);
        }
        if (processedTickets.length === 0 && allTickets.length > 0) { // Check if filters/search resulted in no tickets
            showMessageOnPage('No tickets found matching your criteria.', 'info');
        } else if (allTickets.length === 0 && processedTickets.length === 0) {
            // This case is handled by loadAndDisplayTickets initially
            // but if filters are applied to an empty set, this ensures the message stays correct.
            showMessageOnPage('No tickets currently in the system.', 'info');
        }
        renderTickets(processedTickets);
    }

    // --- Modal Functionality ---
    async function openTicketDetailModal(recordId) { // Parameter changed from rowId to recordId
        currentlySelectedTicketRowId = recordId; // Store recordId
        showMessageInModal('Loading ticket details...', 'info');
        modalSaveStatusButton.disabled = true;
        modalSaveAssigneeButton.disabled = true;
        ticketDetailModal.style.display = 'flex';

        try {
            const ticket = await getTicketById(recordId); // Use recordId
            if (ticket && ticket.fields) {
                const fields = ticket.fields;
                modalTicketId.textContent = fields[COLUMN_NAMES.TICKET_ID] || recordId || 'N/A'; // Use recordId as fallback
                modalTicketTitle.textContent = fields[COLUMN_NAMES.TICKET_TITLE] || 'N/A';
                modalTicketDescription.textContent = fields[COLUMN_NAMES.DETAILED_DESCRIPTION] || 'N/A';
                modalTicketUrgency.textContent = fields[COLUMN_NAMES.URGENCY_LEVEL] || 'N/A';
                modalTicketStatus.textContent = fields[COLUMN_NAMES.STATUS] || 'N/A';
                modalTicketAssignee.textContent = fields[COLUMN_NAMES.ASSIGNED_COLLABORATOR] || 'Unassigned';
                modalTicketSubmissionDate.textContent = ticket.created_at ? new Date(ticket.created_at).toLocaleString() : 'N/A';
                const attachmentValue = fields[COLUMN_NAMES.ATTACHMENT];
                if (attachmentValue) {
                    // Existing attachment handling logic...
                    if (typeof attachmentValue === 'string' && (attachmentValue.startsWith('http://') || attachmentValue.startsWith('https://'))) {
                        modalTicketAttachment.innerHTML = `<a href="${attachmentValue}" target="_blank" rel="noopener noreferrer">${attachmentValue}</a>`;
                    } else if (Array.isArray(attachmentValue) && attachmentValue.length > 0 && attachmentValue[0].url) {
                        modalTicketAttachment.innerHTML = `<a href="${attachmentValue[0].url}" target="_blank" rel="noopener noreferrer">${attachmentValue[0].filename || 'View Attachment'}</a>`;
                    } else {
                        modalTicketAttachment.textContent = String(attachmentValue);
                    }
                } else {
                    modalTicketAttachment.textContent = 'None';
                }

                // Populate Status Dropdown
                modalChangeStatusSelect.value = fields[COLUMN_NAMES.STATUS] || "";

                // Populate Collaborator Dropdown
                modalAssignCollaboratorSelect.innerHTML = ''; // Clear existing options
                HARDCODED_COLLABORATORS.forEach(collab => {
                    const option = document.createElement('option');
                    option.value = collab === "Unassigned" ? "" : collab; // Store empty value for "Unassigned"
                    option.textContent = collab;
                    modalAssignCollaboratorSelect.appendChild(option);
                });
                const currentAssignee = fields[COLUMN_NAMES.ASSIGNED_COLLABORATOR] || "";
                modalAssignCollaboratorSelect.value = currentAssignee;

                showMessageInModal('', 'info'); // Clear loading message
                modalUserMessageArea.style.display = 'none';
            } else {
                showMessageInModal('Could not load ticket details.', 'error');
            }
        } catch (error) {
            showMessageInModal(`Error: ${error.message || 'Could not fetch details.'}`, 'error');
        } finally {
            // Re-enable save buttons after details are loaded or if an error occurs
            modalSaveStatusButton.disabled = false;
            modalSaveAssigneeButton.disabled = false;
        }
    }

    window.closeTicketDetailModal = function() {
        ticketDetailModal.style.display = 'none';
        currentlySelectedTicketRowId = null;
        modalUserMessageArea.style.display = 'none';
    }

    // --- Update Ticket Functionality (Modal) ---
    modalSaveStatusButton.addEventListener('click', async () => {
        if (!currentlySelectedTicketRowId) return;
        const newStatus = modalChangeStatusSelect.value;
        if (!newStatus) {
            showMessageInModal('Please select a status.', 'error');
            return;
        }
        showMessageInModal('Updating status...', 'info');
        modalSaveStatusButton.disabled = true;
        modalSaveStatusButton.textContent = 'Saving...';
        try {
            const updatedTicket = await updateTicket(currentlySelectedTicketRowId, { [COLUMN_NAMES.STATUS]: newStatus });
            if (updatedTicket && updatedTicket.fields) {
                const newStatusDisplay = updatedTicket.fields[COLUMN_NAMES.STATUS];
                showMessageInModal('Status updated successfully!', 'success');
                modalTicketStatus.textContent = newStatusDisplay;
                const ticketIndex = allTickets.findIndex(t => t.rowId === currentlySelectedTicketRowId);
                if (ticketIndex > -1) {
                    // Update the local cache of tickets
                    allTickets[ticketIndex].fields[COLUMN_NAMES.STATUS] = newStatusDisplay;
                    if(updatedTicket.fields[COLUMN_NAMES.TICKET_ID]) { // If Airtable returns the Ticket ID field
                         allTickets[ticketIndex].fields[COLUMN_NAMES.TICKET_ID] = updatedTicket.fields[COLUMN_NAMES.TICKET_ID];
                    }
                    applyFiltersAndSort();
                } else {
                     loadAndDisplayTickets(); // Fallback to reload all if not found (should not happen)
                }
                const userNotifyStatuses = ["Acknowledged", "In Progress", "Resolved", "Acknowledged (Pris en charge)", "In Progress (En cours)", "Resolved (Résolu)"];
                if (userNotifyStatuses.includes(newStatusDisplay)) {
                    showMessageOnPage(`Status updated to ${newStatusDisplay}. REMINDER: Manually notify the user.`, 'info');
                }
            } else {
                showMessageInModal('Failed to update status. Unexpected response.', 'error');
            }
        } catch (error) {
            showMessageInModal(`Error updating status: ${error.message || 'Unknown error'}.`, 'error');
        } finally {
            modalSaveStatusButton.disabled = false;
            modalSaveStatusButton.textContent = 'Save Status';
        }
    });

    modalSaveAssigneeButton.addEventListener('click', async () => {
        if (!currentlySelectedTicketRowId) return;
        const newAssignee = modalAssignCollaboratorSelect.value; // Read from select
        showMessageInModal('Updating assignment...', 'info');
        modalSaveAssigneeButton.disabled = true;
        modalSaveAssigneeButton.textContent = 'Saving...';
        try {
            // Pass newAssignee (which is "" if "Unassigned" was selected)
            const updatedTicket = await updateTicket(currentlySelectedTicketRowId, { [COLUMN_NAMES.ASSIGNED_COLLABORATOR]: newAssignee });
            if (updatedTicket && updatedTicket.fields) {
                // Airtable might return empty if field is cleared, or the value itself.
                // Default to "Unassigned" for display if the field is empty or not present.
                const newAssigneeDisplay = updatedTicket.fields[COLUMN_NAMES.ASSIGNED_COLLABORATOR] || 'Unassigned';
                showMessageInModal('Collaborator assigned successfully!', 'success');
                modalTicketAssignee.textContent = newAssigneeDisplay;
                modalAssignCollaboratorSelect.value = updatedTicket.fields[COLUMN_NAMES.ASSIGNED_COLLABORATOR] || ""; // Set select to new value

                const ticketIndex = allTickets.findIndex(t => t.id === currentlySelectedTicketRowId);
                if (ticketIndex > -1) {
                    allTickets[ticketIndex].fields[COLUMN_NAMES.ASSIGNED_COLLABORATOR] = updatedTicket.fields[COLUMN_NAMES.ASSIGNED_COLLABORATOR];
                     if(updatedTicket.fields[COLUMN_NAMES.TICKET_ID]) {
                         allTickets[ticketIndex].fields[COLUMN_NAMES.TICKET_ID] = updatedTicket.fields[COLUMN_NAMES.TICKET_ID];
                    }
                    applyFiltersAndSort();
                } else {
                    loadAndDisplayTickets(); // Fallback to reload all if not found
                }
                if (newAssignee.trim() !== "") {
                    showMessageOnPage(`Ticket assigned to ${newAssigneeDisplay}. REMINDER: Manually notify the collaborator.`, 'info');
                }
            } else {
                showMessageInModal('Failed to assign collaborator. Unexpected response.', 'error');
            }
        } catch (error) {
            showMessageInModal(`Error assigning collaborator: ${error.message || 'Unknown error'}.`, 'error');
        } finally {
            modalSaveAssigneeButton.disabled = false;
            modalSaveAssigneeButton.textContent = 'Save Assignment';
        }
    });

    // --- Event Listeners for Controls ---
    statusFilter.addEventListener('change', applyFiltersAndSort);
    urgencyFilter.addEventListener('change', applyFiltersAndSort);
    let searchTimeout;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(applyFiltersAndSort, 300);
    });

    tableHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const sortKey = header.getAttribute('data-sort-by');
            if (currentSort.column === sortKey) {
                currentSort.ascending = !currentSort.ascending;
            } else {
                currentSort.column = sortKey;
                currentSort.ascending = true;
            }
            updateSortIndicators();
            applyFiltersAndSort();
        });
    });
    
    // This function might not be strictly necessary if headers are static HTML
    // but useful if headers could be dynamically generated or need complex display names.
    function getHeaderDisplayName(sortKey) {
        // sortKey is directly from data-sort-by, e.g., "TICKET_TITLE"
        if (COLUMN_NAMES[sortKey]) {
            return COLUMN_NAMES[sortKey]; // Returns "Ticket Title"
        }
        if (sortKey === 'created_at') {
            return 'Date Submitted';
        }
        // Fallback for keys not in COLUMN_NAMES (should ideally not happen for sortable columns)
        return sortKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    function updateSortIndicators() {
        // Re-query tableHeaders in case they are dynamically added or changed, though not in current setup.
        // If headers are static, this could be done once.
        tableHeaders = document.querySelectorAll('#ticketTable th[data-sort-by]');
        tableHeaders.forEach(header => {
            const sortKey = header.getAttribute('data-sort-by');
            // Get the original text from the TH element itself if it's set, or generate it.
            // For this setup, the original HTML text in admin.html is the source of truth for display.
            // The getHeaderDisplayName can be used if a more dynamic mapping is needed.
            // For now, let's assume the HTML text is what we want to preserve.
            let headerText = header.textContent.replace(/ [▲▼]$/, '').trim(); // Remove old arrows

            if (sortKey === currentSort.column) {
                header.classList.add('sorted');
                header.innerHTML = `${headerText} <span class="sort-arrow">${currentSort.ascending ? '&#9650;' : '&#9660;'}</span>`;
            } else {
                header.classList.remove('sorted');
                // Ensure no arrows if not sorted, using original text
                header.innerHTML = headerText;
            }
        });
    }

    window.addEventListener('click', (event) => {
        if (event.target === ticketDetailModal) {
            closeTicketDetailModal();
        }
    });
    window.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && ticketDetailModal.style.display !== 'none') {
            closeTicketDetailModal();
        }
    });

    // --- Initial Load ---
    loadAndDisplayTickets(); // This will also call updateSortIndicators via applyFiltersAndSort
    // updateSortIndicators(); // Call once at load to set initial header text without arrows, if not done by applyFiltersAndSort
});

// Ensure the tableHeaders are initialized correctly with their display names for updateSortIndicators
// This can be done by setting their textContent explicitly in HTML or ensuring updateSortIndicators
// correctly fetches the desired display name. The current updateSortIndicators tries to preserve existing text.
