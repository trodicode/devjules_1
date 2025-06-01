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

    let allTickets = [];
    let currentSort = { column: null, ascending: true };
    let currentlySelectedRecordId = null;

    // --- Message Display ---
    function showMessageOnPage(message, type = 'info') {
        if (adminMessageArea) {
            adminMessageArea.textContent = message;
            // Apply Tailwind classes for message types
            adminMessageArea.className = `my-4 p-3 rounded-md text-center ${
                type === 'success' ? 'bg-green-100 border border-green-400 text-green-700' :
                type === 'error' ? 'bg-red-100 border border-red-400 text-red-700' :
                'bg-blue-100 border border-blue-400 text-blue-700' // Default to 'info'
            }`;
            adminMessageArea.style.display = message ? 'block' : 'none';

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
            modalUserMessageArea.className = `mt-3 p-2 rounded text-center ${
                type === 'success' ? 'bg-green-100 border border-green-400 text-green-700' :
                type === 'error' ? 'bg-red-100 border border-red-400 text-red-700' :
                'bg-blue-100 border border-blue-400 text-blue-700'
            }`;
            modalUserMessageArea.style.display = message ? 'block' : 'none';
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
            row.className = 'bg-white'; // Match Tailwind table body row background if needed
            const cell = row.insertCell();
            cell.colSpan = tableHeaders.length;
            cell.textContent = 'No tickets to display.';
            cell.className = 'px-6 py-4 text-center text-sm text-gray-500';
            return;
        }

        if(adminMessageArea.textContent === 'Loading tickets...' || adminMessageArea.textContent.includes("No tickets")) {
            adminMessageArea.style.display = 'none';
        }

        ticketsToRender.forEach(ticket => {
            const row = ticketTableBody.insertRow();
            row.className = 'hover:bg-gray-50'; // Tailwind class for hover effect
            const fields = ticket.fields || {};
            const recordId = ticket.id;

            if (!recordId) {
                console.error("[Admin JS] renderTickets: Ticket object is missing an 'id' property:", ticket);
                let errorCell = row.insertCell();
                errorCell.colSpan = tableHeaders.length;
                errorCell.textContent = 'Error: Invalid ticket data received.';
                errorCell.className = 'px-6 py-4 text-center text-red-500';
                return;
            }

            console.log('[Admin JS] renderTickets: Setting data-id for record:', recordId, 'on row (implicitly).');

            // Applying Tailwind classes to cells
            row.insertCell().outerHTML = `<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${fields[COLUMN_NAMES.TICKET_ID] || recordId}</td>`;

            const titleCell = row.insertCell();
            titleCell.textContent = fields[COLUMN_NAMES.TICKET_TITLE] || 'No Title';
            titleCell.className = "px-6 py-4 whitespace-nowrap text-sm text-indigo-600 hover:text-indigo-900 hover:underline cursor-pointer";
            titleCell.onclick = () => openTicketDetailModal(recordId);

            row.insertCell().outerHTML = `<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${ticket.created_at ? new Date(ticket.created_at).toLocaleDateString() : 'Unknown Date'}</td>`;
            row.insertCell().outerHTML = `<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${fields[COLUMN_NAMES.URGENCY_LEVEL] || 'Normal'}</td>`;
            row.insertCell().outerHTML = `<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500"><span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${fields[COLUMN_NAMES.STATUS] === 'New' ? 'bg-blue-100 text-blue-800' : fields[COLUMN_NAMES.STATUS] === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :  fields[COLUMN_NAMES.STATUS] === 'Acknowledged' ? 'bg-purple-100 text-purple-800' : fields[COLUMN_NAMES.STATUS] === 'Resolved' ? 'bg-green-100 text-green-800' :  fields[COLUMN_NAMES.STATUS] === 'Closed' ? 'bg-gray-300 text-gray-800' : 'bg-gray-100 text-gray-800'}">${fields[COLUMN_NAMES.STATUS] || 'New'}</span></td>`;
            row.insertCell().outerHTML = `<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${fields[COLUMN_NAMES.ASSIGNED_COLLABORATOR] || 'Unassigned'}</td>`;

            const actionsCell = row.insertCell();
            actionsCell.className = "px-6 py-4 whitespace-nowrap text-right text-sm font-medium";
            const viewDetailsButton = document.createElement('button');
            viewDetailsButton.textContent = 'View/Edit';
            // Tailwind classes for the "View/Edit" button
            viewDetailsButton.className = 'px-3 py-1 bg-indigo-600 text-white text-xs font-semibold rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 disabled:opacity-50';
            console.log('[Admin JS] renderTickets: Setting up button for recordId:', recordId);
            viewDetailsButton.onclick = (event) => {
                 console.log('[Admin JS] Event Listener: Clicked View/Edit for recordId:', recordId);
                openTicketDetailModal(recordId);
            };
            actionsCell.appendChild(viewDetailsButton);
        });
    }

    // --- Data Fetching & Processing ---
    async function loadAndDisplayTickets() {
        showMessageOnPage('Loading tickets...', 'info');
        if(ticketTableBody) ticketTableBody.innerHTML = '';
        try {
            const tickets = await getAllTickets();
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
            if (fieldName === 'created_at') {
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
        }
        renderTickets(processedTickets);
    }

    // --- Modal Functionality ---
    async function openTicketDetailModal(recordIdParam) {
        console.log('[Admin JS] openTicketDetailModal: Received recordIdParam:', recordIdParam);
        if (!recordIdParam) {
            console.error("[Admin JS] openTicketDetailModal: called with undefined or null recordIdParam");
            showMessageOnPage("Could not open ticket details: Missing ticket ID.", "error");
            return;
        }
        currentlySelectedRecordId = recordIdParam;
        console.log('[Admin JS] openTicketDetailModal: Assigned to currentlySelectedRecordId:', currentlySelectedRecordId);

        showMessageInModal('Loading ticket details...', 'info');
        modalSaveStatusButton.disabled = true;
        modalSaveAssigneeButton.disabled = true;

        ticketDetailModal.classList.remove('hidden');
        ticketDetailModal.classList.add('flex'); // Ensure flex for centering

        try {
            console.log('[Admin JS] openTicketDetailModal: Calling airtableApi.getTicketById with ID:', currentlySelectedRecordId);
            const ticket = await getTicketById(currentlySelectedRecordId);
            if (ticket && ticket.fields) {
                const fields = ticket.fields;
                modalTicketId.textContent = fields[COLUMN_NAMES.TICKET_ID] || ticket.id || 'N/A';
                modalTicketTitle.textContent = fields[COLUMN_NAMES.TICKET_TITLE] || 'N/A';
                modalTicketDescription.textContent = fields[COLUMN_NAMES.DETAILED_DESCRIPTION] || 'N/A';
                modalTicketUrgency.textContent = fields[COLUMN_NAMES.URGENCY_LEVEL] || 'N/A';
                modalTicketStatus.textContent = fields[COLUMN_NAMES.STATUS] || 'N/A';
                modalTicketAssignee.textContent = fields[COLUMN_NAMES.ASSIGNED_COLLABORATOR] || 'Unassigned';
                modalTicketSubmissionDate.textContent = ticket.created_at ? new Date(ticket.created_at).toLocaleString() : 'N/A';

                const attachmentValue = fields[COLUMN_NAMES.ATTACHMENT];
                if (attachmentValue && Array.isArray(attachmentValue) && attachmentValue.length > 0 && attachmentValue[0].url) {
                     modalTicketAttachment.innerHTML = `<a href="${attachmentValue[0].url}" target="_blank" rel="noopener noreferrer" class="text-indigo-600 hover:text-indigo-800 underline">${attachmentValue[0].filename || 'View Attachment'}</a>`;
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
        ticketDetailModal.classList.add('hidden');
        ticketDetailModal.classList.remove('flex'); // Remove flex display
        currentlySelectedRecordId = null;
        modalUserMessageArea.style.display = 'none';
    }

    // --- Update Ticket Functionality (Modal) ---
    modalSaveStatusButton.addEventListener('click', async () => {
        console.log('[Admin JS] Save Changes Function (Status): Using currentlySelectedRecordId for update:', currentlySelectedRecordId);
        if (!currentlySelectedRecordId) return;
        const newStatus = modalChangeStatusSelect.value;
        if (!newStatus) {
            showMessageInModal('Please select a status.', 'error');
            return;
        }
        showMessageInModal('Updating status...', 'info');
        modalSaveStatusButton.disabled = true;
        modalSaveStatusButton.textContent = 'Saving...';
        const dataForUpdate = { [COLUMN_NAMES.STATUS]: newStatus };
        console.log('[Admin JS] Save Changes Function (Status): Calling airtableApi.updateTicket with ID:', currentlySelectedRecordId, 'and data:', dataForUpdate);
        try {
            const updatedTicket = await updateTicket(currentlySelectedRecordId, dataForUpdate);
            if (updatedTicket && updatedTicket.fields) {
                const newStatusDisplay = updatedTicket.fields[COLUMN_NAMES.STATUS];
                showMessageInModal('Status updated successfully!', 'success');
                modalTicketStatus.textContent = newStatusDisplay;
                const ticketIndex = allTickets.findIndex(t => t.id === currentlySelectedRecordId);
                if (ticketIndex > -1) {
                    if (allTickets[ticketIndex].fields) {
                         allTickets[ticketIndex].fields[COLUMN_NAMES.STATUS] = newStatusDisplay;
                    } else {
                        allTickets[ticketIndex].fields = { [COLUMN_NAMES.STATUS]: newStatusDisplay };
                    }
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
        console.log('[Admin JS] Save Changes Function (Assignee): Using currentlySelectedRecordId for update:', currentlySelectedRecordId);
        if (!currentlySelectedRecordId) return;
        const newAssignee = modalAssignCollaboratorInput.value.trim();
        showMessageInModal('Updating assignment...', 'info');
        modalSaveAssigneeButton.disabled = true;
        modalSaveAssigneeButton.textContent = 'Saving...';
        const dataForUpdate = { [COLUMN_NAMES.ASSIGNED_COLLABORATOR]: newAssignee };
        console.log('[Admin JS] Save Changes Function (Assignee): Calling airtableApi.updateTicket with ID:', currentlySelectedRecordId, 'and data:', dataForUpdate);
        try {
            const updatedTicket = await updateTicket(currentlySelectedRecordId, dataForUpdate);
            if (updatedTicket && updatedTicket.fields) {
                const newAssigneeDisplay = updatedTicket.fields[COLUMN_NAMES.ASSIGNED_COLLABORATOR] || 'Unassigned';
                showMessageInModal('Collaborator assigned successfully!', 'success');
                modalTicketAssignee.textContent = newAssigneeDisplay;
                modalAssignCollaboratorInput.value = newAssigneeDisplay === 'Unassigned' ? "" : newAssigneeDisplay;
                const ticketIndex = allTickets.findIndex(t => t.id === currentlySelectedRecordId);
                if (ticketIndex > -1) {
                     if (allTickets[ticketIndex].fields) {
                        allTickets[ticketIndex].fields[COLUMN_NAMES.ASSIGNED_COLLABORATOR] = updatedTicket.fields[COLUMN_NAMES.ASSIGNED_COLLABORATOR];
                    } else {
                        allTickets[ticketIndex].fields = { [COLUMN_NAMES.ASSIGNED_COLLABORATOR]: updatedTicket.fields[COLUMN_NAMES.ASSIGNED_COLLABORATOR] };
                    }
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
