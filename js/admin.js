// JavaScript for admin.html (Admin ticket dashboard)

document.addEventListener('DOMContentLoaded', () => {
    // console.log('admin.js loaded for admin dashboard.'); // Original log

    // Access Control Check
    const userEmail = sessionStorage.getItem('userEmail');
    const userRole = sessionStorage.getItem('userRole');

    if (!userEmail || userRole !== 'Administrateur') {
        // console.warn('Access denied for admin page. User not logged in or not an admin. Redirecting to login.'); // Original log
        window.location.href = 'login.html';
        return;
    }

    // console.log(`Admin access granted for user: ${userEmail}, Role: ${userRole}`); // Original log

    // Ensure airtable-api.js and its functions are loaded
    if (typeof getAllTickets !== 'function' || typeof getTicketById !== 'function' ||
        typeof updateTicket !== 'function' || typeof COLUMN_NAMES === 'undefined') {
        // console.error('Airtable API functions or COLUMN_NAMES are not available.'); // Original log
        const adminMessageArea = document.getElementById('adminMessageArea');
        if (adminMessageArea) {
            adminMessageArea.textContent = 'Critical error: Cannot connect to ticketing system. (API script not loaded)';
            adminMessageArea.className = 'my-4 p-3 rounded-md text-center text-lg bg-slate-800 border border-red-500 text-red-500';
            adminMessageArea.style.display = 'block';
        }
        const controls = ['statusFilter', 'urgencyFilter', 'searchInput', 'logoutButton'];
        controls.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.disabled = true;
        });
        return;
    }
    // console.log('API functions and COLUMN_NAMES verified.'); // Original log

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
            } else {
                adminMessageArea.className = `${baseClasses} bg-slate-800 border border-neon-blue text-neon-blue`;
            }
            adminMessageArea.style.display = message ? 'block' : 'none';

            // Original logic for clearing table:
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
            let baseClasses = 'p-3 rounded-md mt-3 text-center text-lg';
            if (type === 'success') {
                modalUserMessageArea.className = `${baseClasses} bg-slate-800 border border-neon-green text-neon-green`;
            } else if (type === 'error') {
                modalUserMessageArea.className = `${baseClasses} bg-slate-800 border border-red-500 text-red-500`;
            } else {
                modalUserMessageArea.className = `${baseClasses} bg-slate-800 border border-neon-blue text-neon-blue`;
            }
            modalUserMessageArea.style.display = message ? 'block' : 'none';
        } else {
            type === 'error' ? console.error(message) : console.log(message);
        }
    }

    // --- Ticket Rendering ---
    function renderTickets(ticketsToRender) {
        // console.log(`[admin] renderTickets called with ${ticketsToRender ? ticketsToRender.length : 0} tickets.`); // Removed i18n log
        if (!ticketTableBody) {
            // console.error("[admin] renderTickets: ticketTableBody is null."); // Removed i18n log
            return;
        }
        ticketTableBody.innerHTML = '';

        if (!ticketsToRender || ticketsToRender.length === 0) {
            const row = ticketTableBody.insertRow();
            const cell = row.insertCell();
            cell.colSpan = tableHeaders.length;
            cell.textContent = 'No tickets found matching your criteria.';
            cell.className = 'px-6 py-4 text-center text-sm text-text-medium';
            return;
        }

        // if (ticketsToRender.length > 0) { // Removed i18n log
        //     console.log('[admin] First ticket data for rendering:', JSON.parse(JSON.stringify(ticketsToRender[0])));
        // }

        // Logic for hiding adminMessageArea if it showed "Loading" or "No tickets"
        if (adminMessageArea.textContent === 'Loading tickets...' || adminMessageArea.textContent === 'No tickets currently in the system.') {
             adminMessageArea.style.display = 'none';
        }


        ticketsToRender.forEach(ticket => {
            const row = ticketTableBody.insertRow();
            row.className = 'hover:bg-slate-800';
            const fields = ticket.fields || {};
            const recordId = ticket.id;

            if (!recordId) {
                // console.error("[Admin JS] renderTickets: Ticket object is missing an 'id' property:", ticket); // Removed i18n log
                let errorCell = row.insertCell();
                errorCell.colSpan = tableHeaders.length;
                errorCell.textContent = 'Error: Invalid ticket data received.';
                errorCell.className = 'px-6 py-4 text-center text-red-500';
                return;
            }

            row.insertCell().outerHTML = `<td class="px-6 py-4 whitespace-nowrap text-sm text-text-light ticket-id-cell">${fields[COLUMN_NAMES.TICKET_ID] || recordId}</td>`;

            const titleCell = row.insertCell();
            titleCell.textContent = fields[COLUMN_NAMES.TICKET_TITLE] || 'No Title';
            titleCell.className = "px-6 py-4 whitespace-nowrap text-sm text-neon-pink hover:text-opacity-80 hover:underline cursor-pointer";
            titleCell.onclick = () => openTicketDetailModal(recordId);

            row.insertCell().outerHTML = `<td class="px-6 py-4 whitespace-nowrap text-sm text-text-medium">${ticket.created_at ? new Date(ticket.created_at).toLocaleDateString() : 'Unknown Date'}</td>`;

            const urgencyValue = fields[COLUMN_NAMES.URGENCY_LEVEL] || 'Normal';
            // const urgencyKey = `commonUrgencies.${urgencyValue.toLowerCase()}`; // Removed i18n
            // console.log(`[admin] Translating urgency: value='${urgencyValue}', key='${urgencyKey}'`); // Removed i18n log
            // const translatedUrgency = i18next.t(urgencyKey, { defaultValue: urgencyValue }); // Removed i18n
            // console.log(`[admin] Translated urgency: '${translatedUrgency}'`); // Removed i18n log
            let urgencyIcon = '';
            let urgencyFinalClass = 'text-text-medium';
            if (urgencyValue === 'Urgent') {
                urgencyIcon = '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 inline-block mr-1 text-red-500" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.216 3.031-1.742 3.031H4.42c-1.526 0-2.492-1.697-1.742-3.031l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1.75-2.75a.75.75 0 000 1.5h3.5a.75.75 0 000-1.5h-3.5z" clip-rule="evenodd" /></svg>';
                urgencyFinalClass = 'text-red-500 font-semibold';
            }
            row.insertCell().outerHTML = `<td class="px-6 py-4 whitespace-nowrap text-sm"><span class="${urgencyFinalClass}">${urgencyIcon}${urgencyValue}</span></td>`; // Reverted to urgencyValue

            const statusValue = fields[COLUMN_NAMES.STATUS] || 'New';
            // const statusKey = `commonStatuses.${formattedStatusValue}`; // Removed i18n related logic
            // console.log(`[admin] Translating status: value='${statusValue}', key='${statusKey}'`); // Removed i18n log
            // const translatedStatus = i18next.t(statusKey, { defaultValue: statusValue }); // Removed i18n
            // console.log(`[admin] Translated status: '${translatedStatus}'`); // Removed i18n log
            let statusBadgeClasses = 'px-2 inline-flex text-xs leading-5 font-semibold rounded-full border';
            if (statusValue === 'New') statusBadgeClasses += ' border-neon-blue text-neon-blue';
            else if (statusValue === 'In Progress') statusBadgeClasses += ' border-yellow-400 text-yellow-400';
            else if (statusValue === 'Acknowledged') statusBadgeClasses += ' border-purple-500 text-purple-500';
            else if (statusValue === 'Pending') statusBadgeClasses += ' border-orange-500 text-orange-500';
            else if (statusValue === 'Resolved') statusBadgeClasses += ' border-neon-green text-neon-green';
            else if (statusValue === 'Closed') statusBadgeClasses += ' border-text-medium text-text-medium';
            else statusBadgeClasses += ' border-gray-600 text-gray-400';
            row.insertCell().outerHTML = `<td class="px-6 py-4 whitespace-nowrap text-sm"><span class="${statusBadgeClasses}">${statusValue}</span></td>`; // Reverted to statusValue

            row.insertCell().outerHTML = `<td class="px-6 py-4 whitespace-nowrap text-sm text-text-medium">${fields[COLUMN_NAMES.ASSIGNED_COLLABORATOR] || 'Unassigned'}</td>`;

            const actionsCell = row.insertCell();
            actionsCell.className = "px-6 py-4 whitespace-nowrap text-right text-sm font-medium";
            const viewDetailsButton = document.createElement('button');
            viewDetailsButton.textContent = 'View/Edit';
            viewDetailsButton.className = 'font-title text-xs px-3 py-1 bg-transparent border border-neon-blue text-neon-blue hover:bg-neon-blue hover:text-dark-bg font-semibold rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-neon-blue focus:ring-offset-slate-900 disabled:opacity-50';
            viewDetailsButton.onclick = (event) => {
                openTicketDetailModal(recordId);
            };
            actionsCell.appendChild(viewDetailsButton);
        });
    }

    // --- Data Fetching & Processing ---
    async function loadAndDisplayTickets() {
        // console.log('[admin] loadAndDisplayTickets called.'); // Removed i18n log
        showMessageOnPage('Loading tickets...', 'info');
        if(ticketTableBody) ticketTableBody.innerHTML = '';
        try {
            const tickets = await getAllTickets();
            // console.log('[admin] getAllTickets response:', tickets); // Removed i18n log
            if (tickets && Array.isArray(tickets)) {
                allTickets = tickets;
                // console.log('[admin] allTickets populated. Count:', allTickets ? allTickets.length : 'null'); // Removed i18n log
                applyFiltersAndSort();
                if (allTickets.length === 0) {
                    showMessageOnPage('No tickets currently in the system.', 'info');
                } else if (filterTickets().length === 0 && (statusFilter.value !== 'All' || urgencyFilter.value !== 'All' || searchInput.value.trim() !== '')) {
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

        if (statusValue === 'All') {
            filteredTickets = filteredTickets.filter(t => t.fields && t.fields[COLUMN_NAMES.STATUS] !== 'Closed');
        } else {
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
        const fieldName = COLUMN_NAMES[columnKey] || columnKey; // Use original field name for sorting
        const sortedTickets = [...tickets].sort((a, b) => {
            let valA = (a.fields && a.fields[fieldName]) || '';
            let valB = (b.fields && b.fields[fieldName]) || '';
            if (fieldName === 'created_at') { // Special handling for date
                valA = a.created_at ? new Date(a.created_at).getTime() : 0;
                valB = b.created_at ? new Date(b.created_at).getTime() : 0;
            } else { // General string comparison
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
        if (allTickets.length > 0 && processedTickets.length === 0) {
             showMessageOnPage('No tickets found matching your criteria.', 'info');
        } else if (allTickets.length === 0) {
            // This case handled by loadAndDisplayTickets
        } else if (processedTickets.length > 0 &&
                   (adminMessageArea.textContent === 'No tickets found matching your criteria.' ||
                    adminMessageArea.textContent === 'No tickets currently in the system.')) {
            adminMessageArea.style.display = 'none';
        }
        renderTickets(processedTickets);
    }

    // --- Modal Functionality ---
    async function openTicketDetailModal(recordIdParam) {
        // console.log('[Admin JS] openTicketDetailModal: Received recordIdParam:', recordIdParam); // Removed i18n log
        if (!recordIdParam) {
            // console.error("[Admin JS] openTicketDetailModal: called with undefined or null recordIdParam"); // Removed i18n log
            showMessageOnPage("Could not open ticket details: Missing ticket ID.", "error");
            return;
        }
        currentlySelectedRecordId = recordIdParam;
        // console.log('[Admin JS] openTicketDetailModal: Assigned to currentlySelectedRecordId:', currentlySelectedRecordId); // Removed i18n log

        showMessageInModal('Loading ticket details...', 'info');
        modalSaveStatusButton.disabled = true;
        modalSaveAssigneeButton.disabled = true;
        ticketDetailModal.classList.remove('hidden');

        try {
            // console.log('[Admin JS] openTicketDetailModal: Calling airtableApi.getTicketById with ID:', currentlySelectedRecordId); // Removed i18n log
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
                    const filename = attachmentValue[0].filename || 'View Attachment';
                    modalTicketAttachment.innerHTML = `<a href="${attachmentValue[0].url}" target="_blank" rel="noopener noreferrer" class="text-neon-green hover:underline">${filename}</a>`;
                } else if (typeof attachmentValue === 'string' && attachmentValue.startsWith('file://')) {
                    modalTicketAttachment.textContent = `File: ${attachmentValue.substring('file://'.length)} (Not a direct link)`;
                } else {
                    modalTicketAttachment.textContent = 'None';
                }
                modalChangeStatusSelect.value = fields[COLUMN_NAMES.STATUS] || "";
                modalAssignCollaboratorInput.value = fields[COLUMN_NAMES.ASSIGNED_COLLABORATOR] || "";
                showMessageInModal('', 'info');
                modalUserMessageArea.style.display = 'none';

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
            modalSaveStatusButton.textContent = 'Save Status';
            modalSaveAssigneeButton.textContent = 'Save Assignment';
        }
    }

    window.closeTicketDetailModal = function() {
        ticketDetailModal.classList.add('hidden');
        currentlySelectedRecordId = null;
        modalUserMessageArea.style.display = 'none';
    }

    // --- Update Ticket Functionality (Modal) ---
    modalSaveStatusButton.addEventListener('click', async () => {
        // console.log('[Admin JS] Save Changes Function (Status): Using currentlySelectedRecordId for update:', currentlySelectedRecordId); // Removed i18n log
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
        try {
            const updatedTicket = await updateTicket(currentlySelectedRecordId, dataForUpdate);
            if (updatedTicket && updatedTicket.fields) {
                const newStatusValue = updatedTicket.fields[COLUMN_NAMES.STATUS];
                showMessageInModal(`Status successfully updated to "${newStatusValue}".`, 'success');
                modalTicketStatus.textContent = newStatusValue;

                const ticketIndex = allTickets.findIndex(t => t.id === currentlySelectedRecordId);
                if (ticketIndex > -1) {
                    if (allTickets[ticketIndex].fields) {
                         allTickets[ticketIndex].fields[COLUMN_NAMES.STATUS] = newStatusValue;
                    } else {
                        allTickets[ticketIndex].fields = { [COLUMN_NAMES.STATUS]: newStatusValue };
                    }
                    applyFiltersAndSort();
                } else {
                     loadAndDisplayTickets();
                }
                const userNotifyStatuses = ["Acknowledged", "In Progress", "Resolved"];
                if (userNotifyStatuses.includes(newStatusValue)) {
                    showMessageOnPage(`Status updated to ${newStatusValue}. REMINDER: Manually notify the user.`, 'info');
                }
            } else {
                showMessageInModal('Failed to update status. The server returned an unexpected response. Please try again.', 'error');
            }
        } catch (error) {
            showMessageInModal(`Error updating status: ${error.message || 'Unknown error'}.`, 'error');
        } finally {
            modalSaveStatusButton.disabled = false;
            modalSaveStatusButton.textContent = 'Save Status';
        }
    });

    modalSaveAssigneeButton.addEventListener('click', async () => {
        // console.log('[Admin JS] Save Changes Function (Assignee): Using currentlySelectedRecordId for update:', currentlySelectedRecordId); // Removed i18n log
        if (!currentlySelectedRecordId) return;
        const newAssignee = modalAssignCollaboratorInput.value.trim();
        modalSaveAssigneeButton.disabled = true;
        showMessageInModal('Updating assignment...', 'info');
        modalSaveAssigneeButton.textContent = 'Saving...';
        const dataForUpdate = { [COLUMN_NAMES.ASSIGNED_COLLABORATOR]: newAssignee };
        try {
            const updatedTicket = await updateTicket(currentlySelectedRecordId, dataForUpdate);
            if (updatedTicket && updatedTicket.fields) {
                const newAssigneeValue = updatedTicket.fields[COLUMN_NAMES.ASSIGNED_COLLABORATOR];
                const newAssigneeDisplay = newAssigneeValue || 'Unassigned';

                showMessageInModal(`Collaborator successfully assigned: "${newAssigneeDisplay}".`, 'success');
                modalTicketAssignee.textContent = newAssigneeDisplay;
                modalAssignCollaboratorInput.value = newAssigneeValue || "";

                const ticketIndex = allTickets.findIndex(t => t.id === currentlySelectedRecordId);
                if (ticketIndex > -1) {
                     if (allTickets[ticketIndex].fields) {
                        allTickets[ticketIndex].fields[COLUMN_NAMES.ASSIGNED_COLLABORATOR] = newAssigneeValue;
                    } else {
                        allTickets[ticketIndex].fields = { [COLUMN_NAMES.ASSIGNED_COLLABORATOR]: newAssigneeValue };
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
            showMessageInModal(`Error assigning collaborator: ${error.message || 'Unknown error'}.`, 'error');
        } finally {
            modalSaveAssigneeButton.disabled = false;
            modalSaveAssigneeButton.textContent = 'Save Assignment';
        }
    });

    // --- Event Listeners for Controls ---
    if (statusFilter) statusFilter.addEventListener('change', applyFiltersAndSort);
    if (urgencyFilter) urgencyFilter.addEventListener('change', applyFiltersAndSort);
    let searchTimeout;
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(applyFiltersAndSort, 300);
        });
    }

    tableHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const sortColumnKey = header.getAttribute('data-sort-by');
            if (!sortColumnKey) return;

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

    function getHeaderDisplayName(columnKey) { // Reverted from getHeaderI18nKey
        // console.log(`[admin] getHeaderDisplayName for: ${columnKey}`); // Removed i18n log
        const keyMap = { // This map was used by getHeaderI18nKey, now used to return display names
            'Ticket ID': 'Ticket ID',
            'Ticket Title': 'Title',
            'created_at': 'Date Submitted',
            'Urgency Level': 'Urgency',
            'Status': 'Status',
            'Assigned Collaborator': 'Assigned To'
        };
        const displayName = keyMap[columnKey] || columnKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
        // console.log(`[admin] Mapped to display name: ${displayName}`); // Removed i18n log
        return displayName;
    }

    function updateSortIndicators() {
        tableHeaders.forEach(header => {
            const columnKey = header.getAttribute('data-sort-by');
            if (!columnKey) return;

            const headerText = getHeaderDisplayName(columnKey); // Use reverted function
            // console.log(`[admin] Updating sort indicator for '${columnKey}', headerText: '${headerText}'`); // Removed i18n log

            if (columnKey === currentSort.column) {
                header.classList.add('sorted', 'text-neon-pink');
                const arrow = currentSort.ascending ? '&#9650;' : '&#9660;';
                header.innerHTML = `${headerText} <span class="sort-arrow text-neon-pink">${arrow}</span>`;
            } else {
                header.classList.remove('sorted', 'text-neon-pink');
                header.innerHTML = headerText;
            }
        });
    }

    if (ticketDetailModal) {
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
    }

    // --- Initial Load ---
    loadAndDisplayTickets(); // This will also call updateSortIndicators via applyFiltersAndSort if needed
    updateSortIndicators(); // Call once at the start to set initial header texts

    const toggleTicketIdVisibilityButton = document.getElementById('toggle-ticket-id-visibility');
    if (toggleTicketIdVisibilityButton) {
        toggleTicketIdVisibilityButton.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevents sorting when clicking the eye
            const header = document.getElementById('ticket-id-header');
            const cells = document.querySelectorAll('.ticket-id-cell');

            header.classList.toggle('hidden');
            cells.forEach(cell => {
                cell.classList.toggle('hidden');
            });
        });
    }

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
