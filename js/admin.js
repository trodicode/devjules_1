// JavaScript for admin.html (Admin ticket dashboard)

document.addEventListener('DOMContentLoaded', () => {
    console.log('admin.js loaded for admin dashboard.');

    // Access Control Check
    const userEmail = sessionStorage.getItem('userEmail');
    const userRole = sessionStorage.getItem('userRole');

    if (!userEmail || userRole !== 'Administrateur') {
        console.warn('Access denied for admin page. User not logged in or not an admin. Redirecting to login.');
        window.location.href = 'login.html';
        return; // Stop further execution
    }

    console.log(`Admin access granted for user: ${userEmail}, Role: ${userRole}`);

    // Ensure airtable-api.js and its functions are loaded
    if (typeof getAllTickets !== 'function' || typeof getTicketById !== 'function' || typeof updateTicket !== 'function' || typeof COLUMN_NAMES === 'undefined') {
        console.error('Airtable API functions or COLUMN_NAMES are not available. Ensure airtable-api.js is loaded correctly before admin.js.');
        showMessageOnPage('Critical error: Cannot connect to ticketing system. (API script not loaded)', 'error');
        // Even with access control, this check is important for functionality if API scripts fail to load
        return;
    }

    // Main dashboard elements
    const ticketTableBody = document.getElementById('ticketTableBody');
    const adminMessageArea = document.getElementById('adminMessageArea');
    const statusFilter = document.getElementById('statusFilter');
    const urgencyFilter = document.getElementById('urgencyFilter');
    const searchInput = document.getElementById('searchInput');
    const tableHeaders = document.querySelectorAll('#ticketTable th[data-sort-by]');
    const logoutButton = document.getElementById('logoutButton');

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
            let baseClasses = 'my-4 p-3 rounded-md text-center text-lg';
            if (type === 'success') {
                adminMessageArea.className = `${baseClasses} bg-slate-800 border border-neon-green text-neon-green`;
            } else if (type === 'error') {
                adminMessageArea.className = `${baseClasses} bg-slate-800 border border-red-500 text-red-500`;
            } else { // 'info' or default
                adminMessageArea.className = `${baseClasses} bg-slate-800 border border-neon-blue text-neon-blue`;
            }
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
            let baseClasses = 'p-3 rounded-md mt-3 text-center text-lg'; // Common classes
            if (type === 'success') {
                modalUserMessageArea.className = `${baseClasses} bg-slate-800 border border-neon-green text-neon-green`;
            } else if (type === 'error') {
                modalUserMessageArea.className = `${baseClasses} bg-slate-800 border border-red-500 text-red-500`;
            } else { // 'info' or default
                modalUserMessageArea.className = `${baseClasses} bg-slate-800 border border-neon-blue text-neon-blue`;
            }
            modalUserMessageArea.style.display = message ? 'block' : 'none';
        } else {
            type === 'error' ? console.error(message) : console.log(message);
        }
    }

    // --- Ticket Rendering ---
    function renderTickets(ticketsToRender) {
        if (!ticketTableBody) return;
        ticketTableBody.innerHTML = ''; // This is fine as it's part of bg-slate-900 from tbody tag in HTML

        if (!ticketsToRender || ticketsToRender.length === 0) {
            const row = ticketTableBody.insertRow();
            // row.className = 'bg-white'; // Removed, will inherit from tbody or use its own slate classes
            const cell = row.insertCell();
            cell.colSpan = tableHeaders.length;
            cell.textContent = 'No tickets to display.';
            cell.className = 'px-6 py-4 text-center text-sm text-text-medium'; // Use themed text color
            return;
        }

        if(adminMessageArea.textContent === 'Loading tickets...' || adminMessageArea.textContent.includes("No tickets")) {
            adminMessageArea.style.display = 'none';
        }

        ticketsToRender.forEach(ticket => {
            const row = ticketTableBody.insertRow();
            row.className = 'hover:bg-slate-800'; // Themed hover
            const fields = ticket.fields || {};
            const recordId = ticket.id;

            if (!recordId) {
                console.error("[Admin JS] renderTickets: Ticket object is missing an 'id' property:", ticket);
                let errorCell = row.insertCell();
                errorCell.colSpan = tableHeaders.length;
                errorCell.textContent = 'Error: Invalid ticket data received.';
                errorCell.className = 'px-6 py-4 text-center text-red-500'; // Standard error red
                return;
            }

            // console.log('[Admin JS] renderTickets: Setting data-id for record:', recordId, 'on row (implicitly).');

            row.insertCell().outerHTML = `<td class="px-6 py-4 whitespace-nowrap text-sm text-text-light">${fields[COLUMN_NAMES.TICKET_ID] || recordId}</td>`;

            const titleCell = row.insertCell();
            titleCell.textContent = fields[COLUMN_NAMES.TICKET_TITLE] || 'No Title';
            titleCell.className = "px-6 py-4 whitespace-nowrap text-sm text-neon-pink hover:text-opacity-80 hover:underline cursor-pointer";
            titleCell.onclick = () => openTicketDetailModal(recordId);

            row.insertCell().outerHTML = `<td class="px-6 py-4 whitespace-nowrap text-sm text-text-medium">${ticket.created_at ? new Date(ticket.created_at).toLocaleDateString() : 'Unknown Date'}</td>`;

            let urgencyIcon = '';
            let urgencyFinalClass = 'text-text-medium'; // Default for Normal
            const urgencyValue = fields[COLUMN_NAMES.URGENCY_LEVEL];
            if (urgencyValue === 'Urgent') {
                urgencyIcon = '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 inline-block mr-1 text-red-500" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.216 3.031-1.742 3.031H4.42c-1.526 0-2.492-1.697-1.742-3.031l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1.75-2.75a.75.75 0 000 1.5h3.5a.75.75 0 000-1.5h-3.5z" clip-rule="evenodd" /></svg>';
                urgencyFinalClass = 'text-red-500 font-semibold'; // Standard red for urgent, as planned
            }
            row.insertCell().outerHTML = `<td class="px-6 py-4 whitespace-nowrap text-sm"><span class="${urgencyFinalClass}">${urgencyIcon}${urgencyValue || 'Normal'}</span></td>`;

            let statusBadgeClasses = 'px-2 inline-flex text-xs leading-5 font-semibold rounded-full border'; // Base border class
            const statusValue = fields[COLUMN_NAMES.STATUS];
            if (statusValue === 'New') {
                statusBadgeClasses += ' border-neon-blue text-neon-blue';
            } else if (statusValue === 'In Progress') {
                statusBadgeClasses += ' border-yellow-400 text-yellow-400';
            } else if (statusValue === 'Acknowledged') {
                statusBadgeClasses += ' border-purple-500 text-purple-500';
            } else if (statusValue === 'Pending') {
                statusBadgeClasses += ' border-orange-500 text-orange-500';
            } else if (statusValue === 'Resolved') {
                statusBadgeClasses += ' border-neon-green text-neon-green';
            } else if (statusValue === 'Closed') {
                statusBadgeClasses += ' border-text-medium text-text-medium';
            } else { // Default
                statusBadgeClasses += ' border-gray-600 text-gray-400';
            }
            row.insertCell().outerHTML = `<td class="px-6 py-4 whitespace-nowrap text-sm"><span class="${statusBadgeClasses}">${statusValue || 'New'}</span></td>`;

            row.insertCell().outerHTML = `<td class="px-6 py-4 whitespace-nowrap text-sm text-text-medium">${fields[COLUMN_NAMES.ASSIGNED_COLLABORATOR] || 'Unassigned'}</td>`;

            const actionsCell = row.insertCell();
            actionsCell.className = "px-6 py-4 whitespace-nowrap text-right text-sm font-medium";
            const viewDetailsButton = document.createElement('button');
            viewDetailsButton.textContent = 'View/Edit';
            viewDetailsButton.className = 'font-title text-xs px-3 py-1 bg-transparent border border-neon-blue text-neon-blue hover:bg-neon-blue hover:text-dark-bg font-semibold rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-neon-blue focus:ring-offset-slate-900 disabled:opacity-50';
            // console.log('[Admin JS] renderTickets: Setting up button for recordId:', recordId);
            viewDetailsButton.onclick = (event) => {
                 // console.log('[Admin JS] Event Listener: Clicked View/Edit for recordId:', recordId);
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
                modalTicketAttachment.innerHTML = `<a href="${attachmentValue[0].url}" target="_blank" rel="noopener noreferrer" class="text-neon-green hover:underline">${attachmentValue[0].filename || 'View Attachment'}</a>`;
                } else if (typeof attachmentValue === 'string' && attachmentValue.startsWith('file://')) {
                    modalTicketAttachment.textContent = `File: ${attachmentValue.substring('file://'.length)} (Not a direct link)`;
                } else {
                    modalTicketAttachment.textContent = 'None';
                }
                modalChangeStatusSelect.value = fields[COLUMN_NAMES.STATUS] || "";
                modalAssignCollaboratorInput.value = fields[COLUMN_NAMES.ASSIGNED_COLLABORATOR] || "";
                showMessageInModal('', 'info'); // Clear any loading messages
                modalUserMessageArea.style.display = 'none'; // Ensure it's hidden if no message

                // Set focus to the first interactive element in the modal
                if (modalChangeStatusSelect) {
                    modalChangeStatusSelect.focus();
                }
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
                showMessageInModal(`Status successfully updated to "${newStatusDisplay}".`, 'success');
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
                showMessageInModal('Failed to update status. The server returned an unexpected response. Please try again.', 'error');
            }
        } catch (error) {
            showMessageInModal(`Error updating status: ${error.message || 'An unknown error occurred'}. Please try again.`, 'error');
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
                showMessageInModal(`Collaborator successfully assigned: "${newAssigneeDisplay}".`, 'success');
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
                showMessageInModal('Failed to assign collaborator. The server returned an unexpected response. Please try again.', 'error');
            }
        } catch (error) {
            showMessageInModal(`Error assigning collaborator: ${error.message || 'An unknown error occurred'}. Please try again.`, 'error');
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
            const headerText = getHeaderDisplayName(columnKey); // Use the helper to get original text

            // Clear existing content first to avoid duplicating text or arrows
            header.innerHTML = headerText; // Reset to base text

            if (columnKey === currentSort.column) {
                header.classList.add('sorted', 'text-neon-pink'); // Cyberpunk: sorted header color
                const arrow = currentSort.ascending ? '&#9650;' : '&#9660;';
                header.innerHTML = `${headerText} <span class="sort-arrow text-neon-pink">${arrow}</span>`; // Ensure arrow also gets color
            } else {
                header.classList.remove('sorted', 'text-neon-pink');
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

    // --- Logout Button Functionality ---
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            sessionStorage.removeItem('userEmail');
            sessionStorage.removeItem('userRole');
            console.log('User logged out. Redirecting to login page.');
            window.location.href = 'login.html';
        });
    } else {
        console.warn('#logoutButton not found. Logout functionality will not work.');
    }
});
