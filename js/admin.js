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
    const refreshButton = document.getElementById('refreshButton');
    const tableHeaders = document.querySelectorAll('#ticketTable th[data-sort-by]');
    const logoutButton = document.getElementById('logoutButton');

    // Modal elements
    const ticketDetailModal = document.getElementById('ticketDetailModal');
    const modalTicketId = document.getElementById('modalTicketId');
    const modalTicketTitle = document.getElementById('modalTicketTitle');
    const modalTicketDescription = document.getElementById('modalTicketDescription');
    const modalTicketDescriptionDisplay = document.getElementById('modalTicketDescriptionDisplay');
    const modalTicketUrgency = document.getElementById('modalTicketUrgency');
    const modalTicketStatus = document.getElementById('modalTicketStatus');
    const modalTicketAssignee = document.getElementById('modalTicketAssignee');
    const modalTicketSubmissionDate = document.getElementById('modalTicketSubmissionDate');
    const modalTicketAttachment = document.getElementById('modalTicketAttachment');
    const modalChangeStatusSelect = document.getElementById('modalChangeStatus');
    const modalAssignCollaboratorInput = document.getElementById('modalAssignCollaborator');
    const modalSaveAllButton = document.getElementById('modalSaveAllButton');
    const modalResetButton = document.getElementById('modalResetButton');
    const changesIndicator = document.getElementById('changesIndicator');
    const modalUserMessageArea = document.getElementById('modalUserMessageArea');

    let allTickets = [];
    let currentSort = { column: null, ascending: true };
    let currentlySelectedRecordId = null;

    // Modal state management
    let originalTicketData = {};
    let hasUnsavedChanges = false;

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

            const ticketId = fields[COLUMN_NAMES.TICKET_ID] || recordId;
            row.insertCell().outerHTML = `<td class="px-6 py-4 whitespace-nowrap text-sm text-text-light">${String(ticketId).slice(-5)}</td>`;

            const titleCell = row.insertCell();
            titleCell.textContent = fields[COLUMN_NAMES.TICKET_TITLE] || 'No Title';
            titleCell.className = "px-6 py-4 whitespace-nowrap text-sm text-neon-pink hover:text-opacity-80 hover:underline cursor-pointer";
            titleCell.onclick = () => openTicketDetailModal(recordId);

            // Use Date Submitted field if available, otherwise fallback to created_at
            const submittedDate = fields[COLUMN_NAMES.DATE_SUBMITTED];
            const displayDate = submittedDate ? new Date(submittedDate).toLocaleDateString() : (ticket.created_at ? new Date(ticket.created_at).toLocaleDateString() : 'Unknown Date');
            row.insertCell().outerHTML = `<td class="px-6 py-4 whitespace-nowrap text-sm text-text-medium">${displayDate}</td>`;

            const urgencyObject = fields[COLUMN_NAMES.URGENCY_LEVEL];
            const urgencyValue = urgencyObject ? urgencyObject.value : 'Normal';
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

            const statusObject = fields[COLUMN_NAMES.STATUS];
            const statusValue = statusObject ? statusObject.value : 'New';
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
        console.log('🔍 Debug - Loading tickets from API...');
        showMessageOnPage('Loading tickets...', 'info');
        if(ticketTableBody) ticketTableBody.innerHTML = '';
        try {
            const tickets = await getAllTickets();
            console.log('🔍 Debug - API Response:', tickets);
            if (tickets && Array.isArray(tickets)) {
                allTickets = tickets;
                console.log('🔍 Debug - Total tickets loaded:', allTickets.length);
                console.log('🔍 Debug - First ticket sample:', allTickets[0]);

                // Apply filters and display
                applyFiltersAndSort();

                if (allTickets.length === 0) {
                    showMessageOnPage('No tickets currently in the system.', 'info');
                } else {
                    // Hide loading message if we have tickets
                    adminMessageArea.style.display = 'none';
                }
            } else {
                showMessageOnPage('Could not retrieve tickets. Data format unexpected.', 'error');
                allTickets = [];
                renderTickets([]);
            }
        } catch (error) {
            console.error('🔍 Debug - Error loading tickets:', error);
            showMessageOnPage(`Error loading tickets: ${error.message || 'Unknown error'}.`, 'error');
            allTickets = [];
            renderTickets([]);
        }
    }

    function filterTickets() {
        let filteredTickets = [...allTickets];
        const statusValue = statusFilter ? statusFilter.value : 'All';
        const urgencyValue = urgencyFilter ? urgencyFilter.value : 'All';
        const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';

        console.log('🔍 Debug Filter - Status:', statusValue, 'Urgency:', urgencyValue, 'Search:', searchTerm);
        console.log('🔍 Debug Filter - Total tickets before filter:', filteredTickets.length);

        if (statusValue !== 'All') {
            filteredTickets = filteredTickets.filter(t => {
                const ticketStatus = t.fields && t.fields[COLUMN_NAMES.STATUS];
                const statusValueToCheck = ticketStatus ? ticketStatus.value : 'New';
                return statusValueToCheck === statusValue;
            });
            console.log('🔍 Debug Filter - After status filter:', filteredTickets.length);
        }

        if (urgencyValue !== 'All') {
            filteredTickets = filteredTickets.filter(t => {
                const ticketUrgency = t.fields && t.fields[COLUMN_NAMES.URGENCY_LEVEL];
                const urgencyValueToCheck = ticketUrgency ? ticketUrgency.value : 'Normal';
                return urgencyValueToCheck === urgencyValue;
            });
            console.log('🔍 Debug Filter - After urgency filter:', filteredTickets.length);
        }

        if (searchTerm) {
            filteredTickets = filteredTickets.filter(t => {
                const title = (t.fields && t.fields[COLUMN_NAMES.TICKET_TITLE] || '').toLowerCase();
                const description = (t.fields && t.fields[COLUMN_NAMES.DETAILED_DESCRIPTION] || '').toLowerCase();
                return title.includes(searchTerm) || description.includes(searchTerm);
            });
            console.log('🔍 Debug Filter - After search filter:', filteredTickets.length);
        }

        console.log('🔍 Debug Filter - Final filtered tickets:', filteredTickets.length);
        return filteredTickets;
    }

    function sortTickets(tickets, columnKey, ascending) {
        const fieldName = COLUMN_NAMES[columnKey] || columnKey; // Use original field name for sorting
        const sortedTickets = [...tickets].sort((a, b) => {
            let valA = (a.fields && a.fields[fieldName]) || '';
            let valB = (b.fields && b.fields[fieldName]) || '';

            if (fieldName === COLUMN_NAMES.DATE_SUBMITTED || fieldName === 'created_at') { // Special handling for dates
                // Try Date Submitted first, then fallback to created_at
                const dateA = a.fields && a.fields[COLUMN_NAMES.DATE_SUBMITTED] ?
                    new Date(a.fields[COLUMN_NAMES.DATE_SUBMITTED]).getTime() :
                    (a.created_at ? new Date(a.created_at).getTime() : 0);
                const dateB = b.fields && b.fields[COLUMN_NAMES.DATE_SUBMITTED] ?
                    new Date(b.fields[COLUMN_NAMES.DATE_SUBMITTED]).getTime() :
                    (b.created_at ? new Date(b.created_at).getTime() : 0);

                valA = dateA;
                valB = dateB;
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
        console.log('🔍 Debug Modal - Opening ticket with ID:', recordIdParam, typeof recordIdParam);

        if (!recordIdParam) {
            console.error("🔍 Debug Modal - No recordIdParam provided");
            showMessageOnPage("Could not open ticket details: Missing ticket ID.", "error");
            return;
        }

        // Ensure recordIdParam is a string or number
        const ticketId = String(recordIdParam);
        currentlySelectedRecordId = ticketId;

        console.log('🔍 Debug Modal - Using ticket ID:', currentlySelectedRecordId);

        showMessageInModal('Loading ticket details...', 'info');
        modalSaveAllButton.disabled = true;
        ticketDetailModal.classList.remove('hidden');

        try {
            console.log('🔍 Debug Modal - Calling getTicketById with:', currentlySelectedRecordId);
            const ticket = await getTicketById(currentlySelectedRecordId);
            if (ticket && ticket.fields) {
                const fields = ticket.fields;

                // Store original data for change tracking - Fix: handle object values
                const statusObject = fields[COLUMN_NAMES.STATUS];
                const urgencyObject = fields[COLUMN_NAMES.URGENCY_LEVEL];

                originalTicketData = {
                    status: statusObject && typeof statusObject === 'object' ? statusObject.value : statusObject || "",
                    assignee: fields[COLUMN_NAMES.ASSIGNED_COLLABORATOR] || "",
                    description: fields[COLUMN_NAMES.DETAILED_DESCRIPTION] || ""
                };

                console.log('🔍 Debug Modal - Original data stored:', originalTicketData);

                // Update display fields - Fix: handle object values correctly
                modalTicketId.textContent = fields[COLUMN_NAMES.TICKET_ID] || ticket.id || 'N/A';
                modalTicketTitle.textContent = fields[COLUMN_NAMES.TICKET_TITLE] || 'N/A';
                modalTicketDescription.value = originalTicketData.description;

                // Fix: Extract value from object structure
                const urgencyObj = fields[COLUMN_NAMES.URGENCY_LEVEL];
                const urgencyValue = urgencyObj && typeof urgencyObj === 'object' ? urgencyObj.value : urgencyObj;
                modalTicketUrgency.textContent = urgencyValue || 'N/A';

                // Status is already handled correctly in originalTicketData
                modalTicketStatus.textContent = originalTicketData.status;
                modalTicketAssignee.textContent = originalTicketData.assignee || 'Unassigned';

                // Use Date Submitted field if available, otherwise fallback to created_at
                const submittedDate = fields[COLUMN_NAMES.DATE_SUBMITTED];
                console.log('🔍 Debug Date - Submitted date from API:', submittedDate, typeof submittedDate);
                console.log('🔍 Debug Date - Created at from API:', ticket.created_at);

                if (submittedDate && submittedDate !== '' && submittedDate !== null && submittedDate !== undefined) {
                    try {
                        const dateToShow = new Date(submittedDate).toLocaleString();
                        modalTicketSubmissionDate.textContent = dateToShow;
                        console.log('🔍 Debug Date - Using submitted date:', submittedDate, '->', dateToShow);
                    } catch (dateError) {
                        console.error('🔍 Debug Date - Error parsing submitted date:', submittedDate, dateError);
                        modalTicketSubmissionDate.textContent = 'Invalid Date Format';
                    }
                } else if (ticket.created_at) {
                    try {
                        const dateToShow = new Date(ticket.created_at).toLocaleString();
                        modalTicketSubmissionDate.textContent = dateToShow;
                        console.log('🔍 Debug Date - Using created date:', ticket.created_at, '->', dateToShow);
                    } catch (dateError) {
                        console.error('🔍 Debug Date - Error parsing created date:', ticket.created_at, dateError);
                        modalTicketSubmissionDate.textContent = 'Invalid Date Format';
                    }
                } else {
                    modalTicketSubmissionDate.textContent = 'N/A';
                    console.log('🔍 Debug Date - No date available');
                }

                const attachmentValue = fields[COLUMN_NAMES.ATTACHMENT];
                if (attachmentValue && Array.isArray(attachmentValue) && attachmentValue.length > 0 && attachmentValue[0].url) {
                    const filename = attachmentValue[0].filename || 'View Attachment';
                    modalTicketAttachment.innerHTML = `<a href="${attachmentValue[0].url}" target="_blank" rel="noopener noreferrer" class="text-neon-green hover:underline">${filename}</a>`;
                } else if (typeof attachmentValue === 'string' && attachmentValue.startsWith('file://')) {
                    modalTicketAttachment.textContent = `File: ${attachmentValue.substring('file://'.length)} (Not a direct link)`;
                } else {
                    modalTicketAttachment.textContent = 'None';
                }

                // Set form values - Fix: ensure values are properly set for editing
                if (modalChangeStatusSelect) {
                    modalChangeStatusSelect.value = originalTicketData.status || "";
                    console.log('🔍 Debug Modal - Set status to:', originalTicketData.status);
                }

                if (modalAssignCollaboratorInput) {
                    modalAssignCollaboratorInput.value = originalTicketData.assignee || "";
                    console.log('🔍 Debug Modal - Set assignee to:', originalTicketData.assignee);
                }

                if (modalTicketDescription) {
                    modalTicketDescription.value = originalTicketData.description || "";
                    console.log('🔍 Debug Modal - Set description to:', originalTicketData.description);
                }

                // Reset change tracking
                hasUnsavedChanges = false;
                updateChangesIndicator();

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
            modalSaveAllButton.disabled = false;
            modalSaveAllButton.textContent = '💾 Save All Changes';
        }
    }

    window.closeTicketDetailModal = function() {
        ticketDetailModal.classList.add('hidden');
        currentlySelectedRecordId = null;
        modalUserMessageArea.style.display = 'none';
    }

    // --- Change Detection Functions ---
    function detectChanges() {
        if (!currentlySelectedRecordId || !originalTicketData) return false;

        const currentStatus = modalChangeStatusSelect.value;
        const currentAssignee = modalAssignCollaboratorInput.value.trim();
        const currentDescription = modalTicketDescription.value.trim();

        const statusChanged = currentStatus !== originalTicketData.status;
        const assigneeChanged = currentAssignee !== originalTicketData.assignee;
        const descriptionChanged = currentDescription !== originalTicketData.description;

        return statusChanged || assigneeChanged || descriptionChanged;
    }

    function updateChangesIndicator() {
        if (changesIndicator) {
            if (hasUnsavedChanges) {
                changesIndicator.style.display = 'block';
                changesIndicator.textContent = '⚡ Unsaved changes';
                changesIndicator.className = 'text-xs text-orange-400';
            } else {
                changesIndicator.style.display = 'none';
            }
        }
    }

    // --- Unified Save Function ---
    async function saveAllChanges() {
        if (!currentlySelectedRecordId) return;

        const changes = detectChanges();
        if (!changes) {
            showMessageInModal('No changes to save.', 'info');
            return;
        }

        showMessageInModal('Saving all changes...', 'info');
        modalSaveAllButton.disabled = true;
        modalSaveAllButton.textContent = '💾 Saving...';

        try {
            const dataForUpdate = {};

            // Check each field for changes
            const currentStatus = modalChangeStatusSelect.value;
            const currentAssignee = modalAssignCollaboratorInput.value.trim();
            const currentDescription = modalTicketDescription.value.trim();

            if (currentStatus && currentStatus !== originalTicketData.status) {
                dataForUpdate[COLUMN_NAMES.STATUS] = currentStatus;
            }

            if (currentAssignee !== originalTicketData.assignee) {
                dataForUpdate[COLUMN_NAMES.ASSIGNED_COLLABORATOR] = currentAssignee || null;
            }

            if (currentDescription !== originalTicketData.description) {
                dataForUpdate[COLUMN_NAMES.DETAILED_DESCRIPTION] = currentDescription;
            }

            console.log('🔍 Debug Save - Data to update:', dataForUpdate);

            if (Object.keys(dataForUpdate).length === 0) {
                showMessageInModal('No valid changes to save.', 'warning');
                return;
            }

            const updatedTicket = await updateTicket(currentlySelectedRecordId, dataForUpdate);

            if (updatedTicket && updatedTicket.fields) {
                const fields = updatedTicket.fields;

                // Update original data
                originalTicketData = {
                    status: fields[COLUMN_NAMES.STATUS] || "",
                    assignee: fields[COLUMN_NAMES.ASSIGNED_COLLABORATOR] || "",
                    description: fields[COLUMN_NAMES.DETAILED_DESCRIPTION] || ""
                };

                // Update display
                modalTicketStatus.textContent = originalTicketData.status;
                modalTicketAssignee.textContent = originalTicketData.assignee || 'Unassigned';
                modalTicketDescription.value = originalTicketData.description;

                // Update form values
                modalChangeStatusSelect.value = originalTicketData.status;
                modalAssignCollaboratorInput.value = originalTicketData.assignee;

                // Reset change tracking
                hasUnsavedChanges = false;
                updateChangesIndicator();

                // Update ticket in main list
                const ticketIndex = allTickets.findIndex(t => t.id === currentlySelectedRecordId);
                if (ticketIndex > -1) {
                    if (allTickets[ticketIndex].fields) {
                        Object.assign(allTickets[ticketIndex].fields, fields);
                    } else {
                        allTickets[ticketIndex].fields = fields;
                    }
                    applyFiltersAndSort();
                } else {
                    loadAndDisplayTickets();
                }

                // Show success message with details
                const changesText = Object.keys(dataForUpdate).join(', ');
                showMessageInModal(`✅ Successfully updated: ${changesText}`, 'success');

                // Show notification for status changes
                if (dataForUpdate[COLUMN_NAMES.STATUS]) {
                    const userNotifyStatuses = ["Acknowledged", "In Progress", "Resolved"];
                    if (userNotifyStatuses.includes(originalTicketData.status)) {
                        showMessageOnPage(`Status updated to ${originalTicketData.status}. REMINDER: Manually notify the user.`, 'info');
                    }
                }

                // Show notification for assignee changes
                if (dataForUpdate[COLUMN_NAMES.ASSIGNED_COLLABORATOR] && originalTicketData.assignee) {
                    showMessageOnPage(`Ticket assigned to ${originalTicketData.assignee}. REMINDER: Manually notify the collaborator.`, 'info');
                }

            } else {
                showMessageInModal('❌ Failed to save changes. Please try again.', 'error');
            }

        } catch (error) {
            console.error('🔍 Debug Save - Error:', error);
            showMessageInModal(`❌ Error saving changes: ${error.message}`, 'error');
        } finally {
            modalSaveAllButton.disabled = false;
            modalSaveAllButton.textContent = '💾 Save All Changes';
        }
    }

    // --- Reset Function ---
    function resetChanges() {
        if (!currentlySelectedRecordId || !originalTicketData) return;

        modalChangeStatusSelect.value = originalTicketData.status;
        modalAssignCollaboratorInput.value = originalTicketData.assignee;
        modalTicketDescription.value = originalTicketData.description;

        hasUnsavedChanges = false;
        updateChangesIndicator();

        showMessageInModal('Changes reset to original values.', 'info');
    }

    // --- Event Listeners for Form Changes ---
    if (modalChangeStatusSelect) {
        modalChangeStatusSelect.addEventListener('change', () => {
            hasUnsavedChanges = detectChanges();
            updateChangesIndicator();
        });
    }

    if (modalAssignCollaboratorInput) {
        modalAssignCollaboratorInput.addEventListener('input', () => {
            hasUnsavedChanges = detectChanges();
            updateChangesIndicator();
        });
    }

    if (modalTicketDescription) {
        modalTicketDescription.addEventListener('input', () => {
            hasUnsavedChanges = detectChanges();
            updateChangesIndicator();
        });
    }

    // --- Unified Save and Reset Button Listeners ---
    if (modalSaveAllButton) {
        modalSaveAllButton.addEventListener('click', saveAllChanges);
    }

    if (modalResetButton) {
        modalResetButton.addEventListener('click', resetChanges);
    }

    // --- Event Listeners for Controls ---
    if (statusFilter) statusFilter.addEventListener('change', applyFiltersAndSort);
    if (urgencyFilter) urgencyFilter.addEventListener('change', applyFiltersAndSort);
    if (refreshButton) {
        refreshButton.addEventListener('click', () => {
            console.log('🔄 Manual refresh triggered');
            loadAndDisplayTickets();
        });
    }
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
