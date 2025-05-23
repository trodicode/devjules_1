// JavaScript for admin.html (Admin ticket dashboard)

document.addEventListener('DOMContentLoaded', () => {
    console.log('admin.js loaded for admin dashboard.');

    // Ensure stackby-api.js and its functions are loaded
    if (typeof getAllTickets !== 'function' || typeof getTicketById !== 'function' || typeof updateTicket !== 'function' || typeof COLUMN_NAMES === 'undefined') {
        console.error('Stackby API functions or COLUMN_NAMES are not available. Ensure stackby-api.js is loaded correctly before admin.js.');
        showMessageOnPage('Critical error: Cannot connect to ticketing system. (API script not loaded)', 'error');
        return;
    }

    // Main dashboard elements
    const ticketTableBody = document.getElementById('ticketTableBody');
    const adminMessageArea = document.getElementById('adminMessageArea');
    const statusFilter = document.getElementById('statusFilter');
    const urgencyFilter = document.getElementById('urgencyFilter');
    const searchInput = document.getElementById('searchInput');
    const tableHeaders = document.querySelectorAll('#ticketTable th[data-sort-by]');

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
    const modalAssignCollaboratorInput = document.getElementById('modalAssignCollaborator');
    const modalSaveAssigneeButton = document.getElementById('modalSaveAssigneeButton');
    const modalUserMessageArea = document.getElementById('modalUserMessageArea');

    let allTickets = [];
    let currentSort = { column: null, ascending: true };
    let currentlySelectedTicketRowId = null;

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
            const rowId = ticket.rowId;

            row.insertCell().textContent = fields[COLUMN_NAMES.TICKET_ID] || rowId || 'N/A';
            
            const titleCell = row.insertCell();
            titleCell.textContent = fields[COLUMN_NAMES.TICKET_TITLE] || 'No Title';
            titleCell.style.cursor = 'pointer';
            titleCell.style.color = '#007bff';
            titleCell.onclick = () => openTicketDetailModal(rowId);

            row.insertCell().textContent = fields.created_at ? new Date(fields.created_at).toLocaleDateString() : 'Unknown Date';
            row.insertCell().textContent = fields[COLUMN_NAMES.URGENCY_LEVEL] || 'Normal';
            row.insertCell().textContent = fields[COLUMN_NAMES.STATUS] || 'New';
            row.insertCell().textContent = fields[COLUMN_NAMES.ASSIGNED_COLLABORATOR] || 'Unassigned';

            const actionsCell = row.insertCell();
            const viewDetailsButton = document.createElement('button');
            viewDetailsButton.textContent = 'View/Edit';
            viewDetailsButton.className = 'action-btn edit';
            viewDetailsButton.onclick = () => openTicketDetailModal(rowId);
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
                return title.includes(searchTerm) || description.includes(searchTerm);
            });
        }
        return filteredTickets;
    }

    function sortTickets(tickets, columnKey, ascending) {
        const fieldName = COLUMN_NAMES[columnKey] || columnKey;
        const sortedTickets = [...tickets].sort((a, b) => {
            let valA = (a.fields && a.fields[fieldName]) || '';
            let valB = (b.fields && b.fields[fieldName]) || '';
            if (fieldName === 'created_at') {
                valA = valA ? new Date(valA).getTime() : 0;
                valB = valB ? new Date(valB).getTime() : 0;
            } else {
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
    async function openTicketDetailModal(rowId) {
        currentlySelectedTicketRowId = rowId;
        showMessageInModal('Loading ticket details...', 'info');
        // Disable save buttons while loading details
        modalSaveStatusButton.disabled = true;
        modalSaveAssigneeButton.disabled = true;
        ticketDetailModal.style.display = 'flex';

        try {
            const ticket = await getTicketById(rowId);
            if (ticket && ticket.fields) {
                const fields = ticket.fields;
                modalTicketId.textContent = fields[COLUMN_NAMES.TICKET_ID] || ticket.rowId || 'N/A';
                modalTicketTitle.textContent = fields[COLUMN_NAMES.TICKET_TITLE] || 'N/A';
                modalTicketDescription.textContent = fields[COLUMN_NAMES.DETAILED_DESCRIPTION] || 'N/A';
                modalTicketUrgency.textContent = fields[COLUMN_NAMES.URGENCY_LEVEL] || 'N/A';
                modalTicketStatus.textContent = fields[COLUMN_NAMES.STATUS] || 'N/A';
                modalTicketAssignee.textContent = fields[COLUMN_NAMES.ASSIGNED_COLLABORATOR] || 'Unassigned';
                modalTicketSubmissionDate.textContent = fields.created_at ? new Date(fields.created_at).toLocaleString() : 'N/A';
                const attachmentValue = fields[COLUMN_NAMES.ATTACHMENT];
                if (attachmentValue) {
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
                modalChangeStatusSelect.value = fields[COLUMN_NAMES.STATUS] || "";
                modalAssignCollaboratorInput.value = fields[COLUMN_NAMES.ASSIGNED_COLLABORATOR] || "";
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
                    allTickets[ticketIndex].fields[COLUMN_NAMES.STATUS] = newStatusDisplay;
                    applyFiltersAndSort();
                } else {
                     loadAndDisplayTickets();
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
        const newAssignee = modalAssignCollaboratorInput.value.trim();
        showMessageInModal('Updating assignment...', 'info');
        modalSaveAssigneeButton.disabled = true;
        modalSaveAssigneeButton.textContent = 'Saving...';
        try {
            const updatedTicket = await updateTicket(currentlySelectedTicketRowId, { [COLUMN_NAMES.ASSIGNED_COLLABORATOR]: newAssignee });
            if (updatedTicket && updatedTicket.fields) {
                const newAssigneeDisplay = updatedTicket.fields[COLUMN_NAMES.ASSIGNED_COLLABORATOR] || 'Unassigned';
                showMessageInModal('Collaborator assigned successfully!', 'success');
                modalTicketAssignee.textContent = newAssigneeDisplay;
                modalAssignCollaboratorInput.value = newAssigneeDisplay === 'Unassigned' ? "" : newAssigneeDisplay;
                const ticketIndex = allTickets.findIndex(t => t.rowId === currentlySelectedTicketRowId);
                if (ticketIndex > -1) {
                    allTickets[ticketIndex].fields[COLUMN_NAMES.ASSIGNED_COLLABORATOR] = updatedTicket.fields[COLUMN_NAMES.ASSIGNED_COLLABORATOR];
                    applyFiltersAndSort();
                } else {
                    loadAndDisplayTickets();
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
            const sortColumnKey = header.getAttribute('data-sort-by'); 
            if (currentSort.column === sortColumnKey) {
                currentSort.ascending = !currentSort.ascending;
            } else {
                currentSort.column = sortColumnKey;
                currentSort.ascending = true;
            }
            updateSortIndicators();
            applyFiltersAndSort();
        });
    });
    
    function getHeaderDisplayName(columnKey) {
        // Prioritize COLUMN_NAMES mapping
        if (COLUMN_NAMES[columnKey]) {
            return COLUMN_NAMES[columnKey];
        }
        // Handle special cases like 'created_at'
        if (columnKey === 'created_at') {
            return 'Date Submitted';
        }
        // Default transformation for other keys (e.g., from data-sort-by attributes)
        return columnKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
    }


    function updateSortIndicators() {
        tableHeaders.forEach(header => {
            const columnKey = header.getAttribute('data-sort-by');
            const headerText = getHeaderDisplayName(columnKey); // Use helper to get display name

            if (columnKey === currentSort.column) {
                header.classList.add('sorted');
                header.innerHTML = `${headerText} ${currentSort.ascending ? '&#9650;' : '&#9660;'}`; // ▲ or ▼
            } else {
                header.classList.remove('sorted');
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
    loadAndDisplayTickets();
    updateSortIndicators(); // Initialize header text correctly
});
