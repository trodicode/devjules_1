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

    let allTickets = []; // This will store the tickets as returned by airtable-api.js (with .id and .fields)
    let currentSort = { column: null, ascending: true };
    let currentlySelectedRecordId = null; // Stores the Airtable record ID for the modal

    // --- Message Display ---
    function showMessageOnPage(message, type = 'info') {
        if (adminMessageArea) {
            adminMessageArea.textContent = message;
            adminMessageArea.className = `message-area ${type}`;
            adminMessageArea.style.display = 'block';
            if (type === 'error' || (type === 'info' && message !== 'Loading tickets...' && !message.includes("No tickets"))) {
                 if(ticketTableBody) ticketTableBody.innerHTML = '';
            }
        } else {
            type === 'error' ? console.error(message) : console.log(message);
        }
    }

    function showMessageInModal(message, type = 'info') {
        if (modalUserMessageArea) {
            modalUserMessageArea.textContent = message;
            modalUserMessageArea.className = `message-area ${type}`;
            modalUserMessageArea.style.display = 'block';
        } else {
            type === 'error' ? console.error(message) : console.log(message);
        }
    }

    // --- Ticket Rendering ---
    function renderTickets(ticketsToRender) {
        if (!ticketTableBody) return;
        ticketTableBody.innerHTML = '';

        if (!ticketsToRender || ticketsToRender.length === 0) {
            const row = ticketTableBody.insertRow();
            const cell = row.insertCell();
            cell.colSpan = tableHeaders.length;
            cell.textContent = 'No tickets to display.';
            cell.style.textAlign = 'center';
            return;
        }

        if(adminMessageArea.textContent === 'Loading tickets...' || adminMessageArea.textContent.includes("No tickets")) {
            adminMessageArea.style.display = 'none';
        }

        ticketsToRender.forEach(ticket => { // 'ticket' here is an object like {id: "recXXXX", fields: {...}, created_at: "..."}
            const row = ticketTableBody.insertRow();
            const fields = ticket.fields || {};
            const recordId = ticket.id; // **FIX**: Use ticket.id which is the Airtable record ID

            // Ensure recordId is valid before creating clickable elements
            if (!recordId) {
                console.error("Ticket object is missing an 'id' property:", ticket);
                // Potentially skip this row or display an error in the row
                row.insertCell().textContent = 'Error: Missing ID';
                row.insertCell().textContent = fields[COLUMN_NAMES.TICKET_TITLE] || 'Error: Missing Title';
                row.insertCell().colSpan = 5; // Adjust colspan based on your table structure
                row.insertCell().textContent = 'Invalid ticket data';
                return; // Skip this iteration
            }

            row.insertCell().textContent = fields[COLUMN_NAMES.TICKET_ID] || recordId || 'N/A';

            const titleCell = row.insertCell();
            titleCell.textContent = fields[COLUMN_NAMES.TICKET_TITLE] || 'No Title';
            titleCell.style.cursor = 'pointer';
            titleCell.style.color = '#007bff';
            titleCell.onclick = () => openTicketDetailModal(recordId); // Pass recordId

            row.insertCell().textContent = ticket.created_at ? new Date(ticket.created_at).toLocaleDateString() : 'Unknown Date';
            row.insertCell().textContent = fields[COLUMN_NAMES.URGENCY_LEVEL] || 'Normal';
            row.insertCell().textContent = fields[COLUMN_NAMES.STATUS] || 'New';
            row.insertCell().textContent = fields[COLUMN_NAMES.ASSIGNED_COLLABORATOR] || 'Unassigned';

            const actionsCell = row.insertCell();
            const viewDetailsButton = document.createElement('button');
            viewDetailsButton.textContent = 'View/Edit';
            viewDetailsButton.className = 'action-btn edit';
            viewDetailsButton.onclick = () => openTicketDetailModal(recordId); // Pass recordId
            actionsCell.appendChild(viewDetailsButton);
        });
    }

    // --- Data Fetching & Processing ---
    async function loadAndDisplayTickets() {
        showMessageOnPage('Loading tickets...', 'info');
        if(ticketTableBody) ticketTableBody.innerHTML = '';
        try {
            const tickets = await getAllTickets(); // This now returns [{id, fields, created_at}, ...]
            if (tickets && Array.isArray(tickets)) {
                allTickets = tickets;
                applyFiltersAndSort();
                if (allTickets.length === 0) {
                    showMessageOnPage('No tickets currently in the system.', 'info');
                } else {
                     adminMessageArea.style.display = 'none';
                }
            } else {
                showMessageOnPage('Could not retrieve tickets. Data format unexpected.', 'error');
                allTickets = [];
                renderTickets([]);
            }
        } catch (error) {
            showMessageOnPage(`Error loading tickets: ${error.message || 'Unknown error'}.`, 'error');
            allTickets = [];
            renderTickets([]);
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
            if (fieldName === 'created_at') { // Note: 'created_at' is top-level, not in fields after mapping
                valA = a.created_at ? new Date(a.created_at).getTime() : 0;
                valB = b.created_at ? new Date(b.created_at).getTime() : 0;
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
        if (processedTickets.length === 0 && allTickets.length > 0) {
            showMessageOnPage('No tickets found matching your criteria.', 'info');
        } else if (allTickets.length === 0 && processedTickets.length === 0) {
            showMessageOnPage('No tickets currently in the system.', 'info');
        }
        renderTickets(processedTickets);
    }

    // --- Modal Functionality ---
    async function openTicketDetailModal(recordId) { // **FIX**: Parameter name changed for clarity
        if (!recordId) {
            console.error("openTicketDetailModal called with undefined or null recordId");
            showMessageOnPage("Could not open ticket details: Missing ticket ID.", "error");
            return;
        }
        currentlySelectedRecordId = recordId; // **FIX**: Store the Airtable record ID
        showMessageInModal('Loading ticket details...', 'info');
        modalSaveStatusButton.disabled = true;
        modalSaveAssigneeButton.disabled = true;
        ticketDetailModal.style.display = 'flex';

        try {
            const ticket = await getTicketById(recordId); // **FIX**: Use the correct recordId
            if (ticket && ticket.fields) { // 'ticket' is {id, fields, created_at}
                const fields = ticket.fields;
                modalTicketId.textContent = fields[COLUMN_NAMES.TICKET_ID] || ticket.id || 'N/A'; // Use ticket.id as fallback
                modalTicketTitle.textContent = fields[COLUMN_NAMES.TICKET_TITLE] || 'N/A';
                modalTicketDescription.textContent = fields[COLUMN_NAMES.DETAILED_DESCRIPTION] || 'N/A';
                modalTicketUrgency.textContent = fields[COLUMN_NAMES.URGENCY_LEVEL] || 'N/A';
                modalTicketStatus.textContent = fields[COLUMN_NAMES.STATUS] || 'N/A';
                modalTicketAssignee.textContent = fields[COLUMN_NAMES.ASSIGNED_COLLABORATOR] || 'Unassigned';
                modalTicketSubmissionDate.textContent = ticket.created_at ? new Date(ticket.created_at).toLocaleString() : 'N/A'; // Use ticket.created_at

                const attachmentValue = fields[COLUMN_NAMES.ATTACHMENT];
                if (attachmentValue && Array.isArray(attachmentValue) && attachmentValue.length > 0 && attachmentValue[0].url) {
                     modalTicketAttachment.innerHTML = `<a href="${attachmentValue[0].url}" target="_blank" rel="noopener noreferrer">${attachmentValue[0].filename || 'View Attachment'}</a>`;
                } else if (typeof attachmentValue === 'string' && attachmentValue.startsWith('file://')) {
                    modalTicketAttachment.textContent = `File: ${attachmentValue.substring('file://'.length)} (Not a direct link)`;
                } else {
                    modalTicketAttachment.textContent = 'None';
                }
                modalChangeStatusSelect.value = fields[COLUMN_NAMES.STATUS] || "";
                modalAssignCollaboratorInput.value = fields[COLUMN_NAMES.ASSIGNED_COLLABORATOR] || "";
                showMessageInModal('', 'info');
                modalUserMessageArea.style.display = 'none';
            } else {
                showMessageInModal('Could not load ticket details or ticket has no fields.', 'error');
            }
        } catch (error) {
            showMessageInModal(`Error fetching ticket details: ${error.message || 'Unknown error'}.`, 'error');
        } finally {
            modalSaveStatusButton.disabled = false;
            modalSaveAssigneeButton.disabled = false;
        }
    }

    window.closeTicketDetailModal = function() {
        ticketDetailModal.style.display = 'none';
        currentlySelectedRecordId = null; // **FIX**: Use correct variable
        modalUserMessageArea.style.display = 'none';
    }

    // --- Update Ticket Functionality (Modal) ---
    modalSaveStatusButton.addEventListener('click', async () => {
        if (!currentlySelectedRecordId) return; // **FIX**: Use correct variable
        const newStatus = modalChangeStatusSelect.value;
        if (!newStatus) {
            showMessageInModal('Please select a status.', 'error');
            return;
        }
        showMessageInModal('Updating status...', 'info');
        modalSaveStatusButton.disabled = true;
        modalSaveStatusButton.textContent = 'Saving...';
        try {
            const updatedTicket = await updateTicket(currentlySelectedRecordId, { [COLUMN_NAMES.STATUS]: newStatus }); // **FIX**
            if (updatedTicket && updatedTicket.fields) {
                const newStatusDisplay = updatedTicket.fields[COLUMN_NAMES.STATUS];
                showMessageInModal('Status updated successfully!', 'success');
                modalTicketStatus.textContent = newStatusDisplay;
                const ticketIndex = allTickets.findIndex(t => t.id === currentlySelectedRecordId); // **FIX**: Compare with ticket.id
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
        if (!currentlySelectedRecordId) return; // **FIX**: Use correct variable
        const newAssignee = modalAssignCollaboratorInput.value.trim();
        showMessageInModal('Updating assignment...', 'info');
        modalSaveAssigneeButton.disabled = true;
        modalSaveAssigneeButton.textContent = 'Saving...';
        try {
            const updatedTicket = await updateTicket(currentlySelectedRecordId, { [COLUMN_NAMES.ASSIGNED_COLLABORATOR]: newAssignee }); // **FIX**
            if (updatedTicket && updatedTicket.fields) {
                const newAssigneeDisplay = updatedTicket.fields[COLUMN_NAMES.ASSIGNED_COLLABORATOR] || 'Unassigned';
                showMessageInModal('Collaborator assigned successfully!', 'success');
                modalTicketAssignee.textContent = newAssigneeDisplay;
                modalAssignCollaboratorInput.value = newAssigneeDisplay === 'Unassigned' ? "" : newAssigneeDisplay;
                const ticketIndex = allTickets.findIndex(t => t.id === currentlySelectedRecordId); // **FIX**: Compare with ticket.id
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
        if (COLUMN_NAMES[columnKey]) {
            return COLUMN_NAMES[columnKey];
        }
        if (columnKey === 'created_at') {
            return 'Date Submitted';
        }
        return columnKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
    }

    function updateSortIndicators() {
        tableHeaders.forEach(header => {
            const columnKey = header.getAttribute('data-sort-by');
            const headerText = getHeaderDisplayName(columnKey);

            if (columnKey === currentSort.column) {
                header.classList.add('sorted');
                header.innerHTML = `${headerText} ${currentSort.ascending ? '&#9650;' : '&#9660;'}`;
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
    updateSortIndicators();
});
