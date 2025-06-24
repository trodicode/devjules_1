// JavaScript for admin.html (Admin ticket dashboard)

document.addEventListener('DOMContentLoaded', () => {
    console.log('[admin] DOMContentLoaded event fired.');
    console.log('admin.js loaded for admin dashboard.');

    // Access Control Check
    const userEmail = sessionStorage.getItem('userEmail');
    const userRole = sessionStorage.getItem('userRole');

    if (!userEmail || userRole !== 'Administrateur') {
        console.warn('[admin] Access denied for admin page. User not logged in or not an admin. Redirecting to login.');
        window.location.href = 'login.html';
        return; // Stop further execution
    }

    console.log(`[admin] Access granted for user: ${userEmail}, Role: ${userRole}, proceeding with admin script initialization.`);

    // Ensure airtable-api.js and its functions are loaded
    // Also check for i18next
    if (typeof getAllTickets !== 'function' || typeof getTicketById !== 'function' ||
        typeof updateTicket !== 'function' || typeof COLUMN_NAMES === 'undefined' ||
        typeof i18next === 'undefined' || typeof i18next.t === 'undefined') {
        console.error('[admin] Prerequisite check failed: Airtable API functions, COLUMN_NAMES, or i18next are not available.');
        const adminMessageArea = document.getElementById('adminMessageArea'); // Get it directly here for this critical error
        if (adminMessageArea) {
            const errorMessage = (typeof i18next !== 'undefined' && i18next.t) ?
                i18next.t('adminMessages.criticalApiError') :
                'Critical error: Cannot connect to ticketing system. (API script not loaded or i18n error)';
            adminMessageArea.textContent = errorMessage;
            adminMessageArea.className = 'my-4 p-3 rounded-md text-center text-lg bg-slate-800 border border-red-500 text-red-500';
            adminMessageArea.style.display = 'block';
        }
        // Disable filters/buttons if critical components are missing
        const controls = ['statusFilter', 'urgencyFilter', 'searchInput', 'logoutButton'];
        controls.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.disabled = true;
        });
        return;
    }
    console.log('[admin] API functions and COLUMN_NAMES verified.');

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
    function showMessageOnPage(message, type = 'info') { // message is already translated
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

    function showMessageInModal(message, type = 'info') { // message is already translated
        if (modalUserMessageArea) {
            modalUserMessageArea.textContent = message;
            let baseClasses = 'p-3 rounded-md mt-3 text-center text-lg';
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
        console.log(`[admin] renderTickets called with ${ticketsToRender ? ticketsToRender.length : 0} tickets.`);
        if (!ticketTableBody) {
            console.error("[admin] renderTickets: ticketTableBody is null.");
            return;
        }
        ticketTableBody.innerHTML = '';

        if (!ticketsToRender || ticketsToRender.length === 0) {
            const row = ticketTableBody.insertRow();
            const cell = row.insertCell();
            cell.colSpan = tableHeaders.length;
            cell.textContent = i18next.t('adminMessages.noTicketsMatchingCriteria');
            cell.className = 'px-6 py-4 text-center text-sm text-text-medium';
            return;
        }

        if (ticketsToRender.length > 0) {
            console.log('[admin] First ticket data for rendering:', JSON.parse(JSON.stringify(ticketsToRender[0])));
        }

        const currentLoadingMessage = i18next.t('adminMessages.loadingTickets');
        const currentNoTicketsMessage = i18next.t('adminMessages.noTicketsInSystem');
        if (adminMessageArea.textContent === currentLoadingMessage || adminMessageArea.textContent === currentNoTicketsMessage) {
            adminMessageArea.style.display = 'none';
        }

        ticketsToRender.forEach(ticket => {
            const row = ticketTableBody.insertRow();
            row.className = 'hover:bg-slate-800';
            const fields = ticket.fields || {};
            const recordId = ticket.id;

            if (!recordId) {
                console.error("[Admin JS] renderTickets: Ticket object is missing an 'id' property:", ticket);
                let errorCell = row.insertCell();
                errorCell.colSpan = tableHeaders.length;
                errorCell.textContent = i18next.t('adminMessages.errorInvalidTicketData');
                errorCell.className = 'px-6 py-4 text-center text-red-500';
                return;
            }

            row.insertCell().outerHTML = `<td class="px-6 py-4 whitespace-nowrap text-sm text-text-light">${fields[COLUMN_NAMES.TICKET_ID] || recordId}</td>`;

            const titleCell = row.insertCell();
            titleCell.textContent = fields[COLUMN_NAMES.TICKET_TITLE] || i18next.t('adminTable.noTitle');
            titleCell.className = "px-6 py-4 whitespace-nowrap text-sm text-neon-pink hover:text-opacity-80 hover:underline cursor-pointer";
            titleCell.onclick = () => openTicketDetailModal(recordId);

            row.insertCell().outerHTML = `<td class="px-6 py-4 whitespace-nowrap text-sm text-text-medium">${ticket.created_at ? new Date(ticket.created_at).toLocaleDateString() : i18next.t('adminTable.unknownDate')}</td>`;

            const urgencyValue = fields[COLUMN_NAMES.URGENCY_LEVEL] || 'Normal';
            const urgencyKey = `commonUrgencies.${urgencyValue.toLowerCase()}`;
            console.log(`[admin] Translating urgency: value='${urgencyValue}', key='${urgencyKey}'`);
            const translatedUrgency = i18next.t(urgencyKey, { defaultValue: urgencyValue });
            console.log(`[admin] Translated urgency: '${translatedUrgency}'`);
            let urgencyIcon = '';
            let urgencyFinalClass = 'text-text-medium';
            if (urgencyValue === 'Urgent') {
                urgencyIcon = '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 inline-block mr-1 text-red-500" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.216 3.031-1.742 3.031H4.42c-1.526 0-2.492-1.697-1.742-3.031l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1.75-2.75a.75.75 0 000 1.5h3.5a.75.75 0 000-1.5h-3.5z" clip-rule="evenodd" /></svg>';
                urgencyFinalClass = 'text-red-500 font-semibold';
            }
            row.insertCell().outerHTML = `<td class="px-6 py-4 whitespace-nowrap text-sm"><span class="${urgencyFinalClass}">${urgencyIcon}${translatedUrgency}</span></td>`;

            const statusValue = fields[COLUMN_NAMES.STATUS] || 'New';
            const statusKey = `commonStatuses.${statusValue.toLowerCase().replace(/\s+/g, '')}`;
            console.log(`[admin] Translating status: value='${statusValue}', key='${statusKey}'`);
            const translatedStatus = i18next.t(statusKey, { defaultValue: statusValue });
            console.log(`[admin] Translated status: '${translatedStatus}'`);
            let statusBadgeClasses = 'px-2 inline-flex text-xs leading-5 font-semibold rounded-full border';
            if (statusValue === 'New') statusBadgeClasses += ' border-neon-blue text-neon-blue';
            else if (statusValue === 'In Progress') statusBadgeClasses += ' border-yellow-400 text-yellow-400';
            else if (statusValue === 'Acknowledged') statusBadgeClasses += ' border-purple-500 text-purple-500';
            else if (statusValue === 'Pending') statusBadgeClasses += ' border-orange-500 text-orange-500';
            else if (statusValue === 'Resolved') statusBadgeClasses += ' border-neon-green text-neon-green';
            else if (statusValue === 'Closed') statusBadgeClasses += ' border-text-medium text-text-medium';
            else statusBadgeClasses += ' border-gray-600 text-gray-400';
            row.insertCell().outerHTML = `<td class="px-6 py-4 whitespace-nowrap text-sm"><span class="${statusBadgeClasses}">${translatedStatus}</span></td>`;

            row.insertCell().outerHTML = `<td class="px-6 py-4 whitespace-nowrap text-sm text-text-medium">${fields[COLUMN_NAMES.ASSIGNED_COLLABORATOR] || i18next.t('adminTable.unassigned')}</td>`;

            const actionsCell = row.insertCell();
            actionsCell.className = "px-6 py-4 whitespace-nowrap text-right text-sm font-medium";
            const viewDetailsButton = document.createElement('button');
            viewDetailsButton.textContent = i18next.t('adminTable.viewEditButton');
            viewDetailsButton.className = 'font-title text-xs px-3 py-1 bg-transparent border border-neon-blue text-neon-blue hover:bg-neon-blue hover:text-dark-bg font-semibold rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-neon-blue focus:ring-offset-slate-900 disabled:opacity-50';
            viewDetailsButton.onclick = (event) => {
                openTicketDetailModal(recordId);
            };
            actionsCell.appendChild(viewDetailsButton);
        });
    }

    // --- Data Fetching & Processing ---
    async function loadAndDisplayTickets() {
        console.log('[admin] loadAndDisplayTickets called.');
        showMessageOnPage(i18next.t('adminMessages.loadingTickets'), 'info');
        if(ticketTableBody) ticketTableBody.innerHTML = ''; // Clear table before loading
        try {
            const tickets = await getAllTickets();
            console.log('[admin] getAllTickets response:', tickets);
            if (tickets && Array.isArray(tickets)) {
                allTickets = tickets;
                console.log('[admin] allTickets populated. Count:', allTickets ? allTickets.length : 'null');
                applyFiltersAndSort(); // This will call renderTickets
                if (allTickets.length === 0) {
                    showMessageOnPage(i18next.t('adminMessages.noTicketsInSystem'), 'info');
                } else if (filterTickets().length === 0 && (statusFilter.value !== 'All' || urgencyFilter.value !== 'All' || searchInput.value.trim() !== '')) {
                    // This case is handled by applyFiltersAndSort calling render which shows "No tickets matching criteria"
                } else {
                     adminMessageArea.style.display = 'none'; // Hide loading/no tickets message if tickets are displayed
                }
            } else {
                showMessageOnPage(i18next.t('adminMessages.couldNotRetrieveTickets'), 'error');
                allTickets = [];
                renderTickets([]); // Render empty state
            }
        } catch (error) {
            showMessageOnPage(i18next.t('adminMessages.errorLoadingTickets', { errorMessage: error.message || i18next.t('adminMessages.unknownError') }), 'error');
            allTickets = [];
            renderTickets([]); // Render empty state
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
        // Message for "no tickets matching criteria" is now handled by renderTickets if processedTickets is empty
        // but allTickets is not.
        if (allTickets.length > 0 && processedTickets.length === 0) {
             showMessageOnPage(i18next.t('adminMessages.noTicketsMatchingCriteria'), 'info');
        } else if (allTickets.length === 0) {
            // This case handled by loadAndDisplayTickets initially.
            // showMessageOnPage(i18next.t('adminMessages.noTicketsInSystem'), 'info');
        } else if (processedTickets.length > 0 && (adminMessageArea.textContent === i18next.t('adminMessages.noTicketsMatchingCriteria') || adminMessageArea.textContent === i18next.t('adminMessages.noTicketsInSystem'))) {
            adminMessageArea.style.display = 'none'; // Hide "no tickets" message if tickets are now found
        }
        renderTickets(processedTickets);
    }

    // --- Modal Functionality ---
    async function openTicketDetailModal(recordIdParam) {
        console.log('[Admin JS] openTicketDetailModal: Received recordIdParam:', recordIdParam);
        if (!recordIdParam) {
            console.error("[Admin JS] openTicketDetailModal: called with undefined or null recordIdParam");
            showMessageOnPage(i18next.t('adminMessages.errorMissingTicketIdModal'), "error");
            return;
        }
        currentlySelectedRecordId = recordIdParam;
        console.log('[Admin JS] openTicketDetailModal: Assigned to currentlySelectedRecordId:', currentlySelectedRecordId);

        showMessageInModal(i18next.t('adminMessages.modalLoadingDetails'), 'info');
        modalSaveStatusButton.disabled = true;
        modalSaveAssigneeButton.disabled = true;

        // ticketDetailModal classes are now: "fixed z-10 inset-0 hidden items-center justify-center p-4"
        // When hidden is removed, it will use its defined flex properties.
        ticketDetailModal.classList.remove('hidden');

        try {
            console.log('[Admin JS] openTicketDetailModal: Calling airtableApi.getTicketById with ID:', currentlySelectedRecordId);
            const ticket = await getTicketById(currentlySelectedRecordId);
            if (ticket && ticket.fields) {
                const fields = ticket.fields;
                const naText = i18next.t('adminMessages.na');
                modalTicketId.textContent = fields[COLUMN_NAMES.TICKET_ID] || ticket.id || naText;
                modalTicketTitle.textContent = fields[COLUMN_NAMES.TICKET_TITLE] || naText;
                modalTicketDescription.textContent = fields[COLUMN_NAMES.DETAILED_DESCRIPTION] || naText;

                const urgencyVal = fields[COLUMN_NAMES.URGENCY_LEVEL] || 'Normal';
                modalTicketUrgency.textContent = i18next.t(`commonUrgencies.${urgencyVal.toLowerCase()}`, { defaultValue: urgencyVal });

                const statusVal = fields[COLUMN_NAMES.STATUS] || 'New';
                modalTicketStatus.textContent = i18next.t(`commonStatuses.${statusVal.toLowerCase().replace(/\s+/g, '')}`, { defaultValue: statusVal });

                modalTicketAssignee.textContent = fields[COLUMN_NAMES.ASSIGNED_COLLABORATOR] || i18next.t('adminTable.unassigned');
                modalTicketSubmissionDate.textContent = ticket.created_at ? new Date(ticket.created_at).toLocaleString() : naText;

                const attachmentValue = fields[COLUMN_NAMES.ATTACHMENT];
                if (attachmentValue && Array.isArray(attachmentValue) && attachmentValue.length > 0 && attachmentValue[0].url) {
                    const filename = attachmentValue[0].filename || i18next.t('adminModal.viewAttachmentLink');
                    modalTicketAttachment.innerHTML = `<a href="${attachmentValue[0].url}" target="_blank" rel="noopener noreferrer" class="text-neon-green hover:underline">${filename}</a>`;
                } else if (typeof attachmentValue === 'string' && attachmentValue.startsWith('file://')) {
                    modalTicketAttachment.textContent = i18next.t('adminModal.attachmentFilePrefix', {filename: attachmentValue.substring('file://'.length)});
                } else {
                    modalTicketAttachment.textContent = i18next.t('adminModal.attachmentNone');
                }
                modalChangeStatusSelect.value = fields[COLUMN_NAMES.STATUS] || ""; // Value should be English
                modalAssignCollaboratorInput.value = fields[COLUMN_NAMES.ASSIGNED_COLLABORATOR] || "";
                showMessageInModal('', 'info');
                modalUserMessageArea.style.display = 'none';

                if (modalChangeStatusSelect) {
                    modalChangeStatusSelect.focus();
                }
            } else {
                showMessageInModal(i18next.t('adminMessages.modalCouldNotLoadDetails'), 'error');
            }
        } catch (error) {
            showMessageInModal(i18next.t('adminMessages.modalErrorLoadingDetails', { errorMessage: error.message || i18next.t('adminMessages.unknownError') }), 'error');
        } finally {
            modalSaveStatusButton.disabled = false;
            modalSaveAssigneeButton.disabled = false;
            // Reset button text in case of error during loading, if they were changed
            modalSaveStatusButton.textContent = i18next.t('adminModal.saveStatusButton');
            modalSaveAssigneeButton.textContent = i18next.t('adminModal.saveAssignmentButton');
        }
    }

    window.closeTicketDetailModal = function() {
        ticketDetailModal.classList.add('hidden');
        // No need to remove 'flex' as it's part of the base visible state styling.
        currentlySelectedRecordId = null;
        modalUserMessageArea.style.display = 'none';
    }

    // --- Update Ticket Functionality (Modal) ---
    modalSaveStatusButton.addEventListener('click', async () => {
        console.log('[Admin JS] Save Changes Function (Status): Using currentlySelectedRecordId for update:', currentlySelectedRecordId);
        if (!currentlySelectedRecordId) return;
        const newStatus = modalChangeStatusSelect.value; // This value is English e.g. "In Progress"
        if (!newStatus) {
            showMessageInModal(i18next.t('adminMessages.modalStatusSelectError'), 'error');
            return;
        }
        showMessageInModal(i18next.t('adminMessages.modalStatusUpdating'), 'info');
        modalSaveStatusButton.disabled = true;
        modalSaveStatusButton.textContent = i18next.t('adminModal.savingButton');
        const dataForUpdate = { [COLUMN_NAMES.STATUS]: newStatus };
        try {
            const updatedTicket = await updateTicket(currentlySelectedRecordId, dataForUpdate);
            if (updatedTicket && updatedTicket.fields) {
                const newStatusValue = updatedTicket.fields[COLUMN_NAMES.STATUS]; // English value
                const newStatusDisplay = i18next.t(`commonStatuses.${newStatusValue.toLowerCase().replace(/\s+/g, '')}`, { defaultValue: newStatusValue });

                showMessageInModal(i18next.t('adminMessages.modalStatusUpdatedSuccess', { newStatusDisplay: newStatusDisplay }), 'success');
                modalTicketStatus.textContent = newStatusDisplay; // Display translated status

                const ticketIndex = allTickets.findIndex(t => t.id === currentlySelectedRecordId);
                if (ticketIndex > -1) {
                    if (allTickets[ticketIndex].fields) {
                         allTickets[ticketIndex].fields[COLUMN_NAMES.STATUS] = newStatusValue; // Store English value
                    } else {
                        allTickets[ticketIndex].fields = { [COLUMN_NAMES.STATUS]: newStatusValue };
                    }
                    applyFiltersAndSort();
                } else {
                     loadAndDisplayTickets(); // Fallback to reload all
                }
                const userNotifyStatuses = ["Acknowledged", "In Progress", "Resolved"]; // English values for logic
                if (userNotifyStatuses.includes(newStatusValue)) {
                    showMessageOnPage(i18next.t('adminMessages.reminderNotifyUser', {newStatusDisplay: newStatusDisplay}), 'info');
                }
            } else {
                showMessageInModal(i18next.t('adminMessages.modalStatusUpdateFailed'), 'error');
            }
        } catch (error) {
            showMessageInModal(i18next.t('adminMessages.modalStatusUpdateError', { errorMessage: error.message || i18next.t('adminMessages.unknownError') }), 'error');
        } finally {
            modalSaveStatusButton.disabled = false;
            modalSaveStatusButton.textContent = i18next.t('adminModal.saveStatusButton');
        }
    });

    modalSaveAssigneeButton.addEventListener('click', async () => {
        console.log('[Admin JS] Save Changes Function (Assignee): Using currentlySelectedRecordId for update:', currentlySelectedRecordId);
        if (!currentlySelectedRecordId) return;
        const newAssignee = modalAssignCollaboratorInput.value.trim();
        modalSaveAssigneeButton.disabled = true;
        showMessageInModal(i18next.t('adminMessages.modalAssignmentUpdating'), 'info');
        modalSaveAssigneeButton.textContent = i18next.t('adminModal.savingButton');
        const dataForUpdate = { [COLUMN_NAMES.ASSIGNED_COLLABORATOR]: newAssignee };
        try {
            const updatedTicket = await updateTicket(currentlySelectedRecordId, dataForUpdate);
            if (updatedTicket && updatedTicket.fields) {
                const newAssigneeValue = updatedTicket.fields[COLUMN_NAMES.ASSIGNED_COLLABORATOR];
                const newAssigneeDisplay = newAssigneeValue || i18next.t('adminTable.unassigned');

                showMessageInModal(i18next.t('adminMessages.modalAssignmentSuccess', { newAssigneeDisplay: newAssigneeDisplay }), 'success');
                modalTicketAssignee.textContent = newAssigneeDisplay;
                modalAssignCollaboratorInput.value = newAssigneeValue || ""; // Keep input as actual value or empty

                const ticketIndex = allTickets.findIndex(t => t.id === currentlySelectedRecordId);
                if (ticketIndex > -1) {
                     if (allTickets[ticketIndex].fields) {
                        allTickets[ticketIndex].fields[COLUMN_NAMES.ASSIGNED_COLLABORATOR] = newAssigneeValue;
                    } else {
                        allTickets[ticketIndex].fields = { [COLUMN_NAMES.ASSIGNED_COLLABORATOR]: newAssigneeValue };
                    }
                    applyFiltersAndSort();
                } else {
                    loadAndDisplayTickets(); // Fallback
                }
                if (newAssignee.trim() !== "") {
                    showMessageOnPage(i18next.t('adminMessages.reminderNotifyCollaborator', { newAssigneeDisplay: newAssigneeDisplay }), 'info');
                }
            } else {
                showMessageInModal(i18next.t('adminMessages.modalAssignmentFailed'), 'error');
            }
        } catch (error) {
            showMessageInModal(i18next.t('adminMessages.modalAssignmentError', { errorMessage: error.message || i18next.t('adminMessages.unknownError') }), 'error');
        } finally {
            modalSaveAssigneeButton.disabled = false;
            modalSaveAssigneeButton.textContent = i18next.t('adminModal.saveAssignmentButton');
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

    function getHeaderI18nKey(columnKey) {
        console.log(`[admin] getHeaderI18nKey for: ${columnKey}`);
        const keyMap = {
            'Ticket ID': 'adminTable.headerTicketId',
            'Ticket Title': 'adminTable.headerTitle',
            'created_at': 'adminTable.headerDateSubmitted',
            'Urgency Level': 'adminTable.headerUrgency',
            'Status': 'adminTable.headerStatus',
            'Assigned Collaborator': 'adminTable.headerAssignedTo'
            // Actions column does not have data-sort-by, so not needed here
        };
        const i18nKey = keyMap[columnKey] || `adminTable.header${columnKey.replace(/\s+/g, '')}`; // Fallback or specific key
        console.log(`[admin] Mapped to i18n key: ${i18nKey}`);
        return i18nKey;
    }

    function updateSortIndicators() {
        tableHeaders.forEach(header => {
            const columnKey = header.getAttribute('data-sort-by');
            if (!columnKey) return;

            const headerI18nKey = getHeaderI18nKey(columnKey);
            const translatedHeaderText = i18next.t(headerI18nKey);
            console.log(`[admin] Updating sort indicator for '${columnKey}', i18nKey: '${headerI18nKey}', translated: '${translatedHeaderText}'`);

            if (columnKey === currentSort.column) {
                header.classList.add('sorted', 'text-neon-pink');
                const arrow = currentSort.ascending ? '&#9650;' : '&#9660;';
                header.innerHTML = `${translatedHeaderText} <span class="sort-arrow text-neon-pink">${arrow}</span>`;
            } else {
                header.classList.remove('sorted', 'text-neon-pink');
                header.innerHTML = translatedHeaderText;
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
