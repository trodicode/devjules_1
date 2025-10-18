// js/baserow-api.js
// This file contains all functions for interacting with the Baserow API.

(function(window) {
    // --- Baserow Configuration ---
    // All configuration is loaded from js/config.js before this script.

    // Base URL for Baserow API
    const BASEROW_API_BASE_URL = 'https://api.baserow.io/api/database/rows';

    // Column Name Mapping
    const COLUMN_NAMES = {
        TICKET_TITLE: 'Ticket Title',
        DETAILED_DESCRIPTION: 'Detailed Description',
        URGENCY_LEVEL: 'Urgency Level',
        ATTACHMENT: 'Attachment',
        TICKET_ID: 'Ticket ID',
        STATUS: 'Status',
        ASSIGNED_COLLABORATOR: 'Assigned Collaborator',
        REQUESTER_EMAIL: 'On Demand',
        USER_EMAIL: 'User mail',
        USER_PASSWORD: 'Password',
        USER_ROLE: 'Role',
    };

    // Expose COLUMN_NAMES to the global scope
    window.COLUMN_NAMES = COLUMN_NAMES;

    // --- Helper Functions ---
    async function _fetchBaserowAPI(tableId, recordIdOrQuery = '', method, body = null) {
        let url = `${BASEROW_API_BASE_URL}/table/${tableId}/`;

        if (method === 'GET' && recordIdOrQuery && !recordIdOrQuery.startsWith('?')) {
            url += `${recordIdOrQuery}/`;
        } else if (method === 'PATCH' && recordIdOrQuery) {
            url += `${recordIdOrQuery}/`;
        }

        url += '?user_field_names=true';

        if (method === 'GET' && recordIdOrQuery.startsWith('?')) {
            url += `&${recordIdOrQuery.substring(1)}`;
        }

        const headers = {
            'Authorization': `Token ${BASEROW_API_TOKEN}`,
            'Content-Type': 'application/json'
        };

        const config = { method, headers };
        if (body) {
            config.body = JSON.stringify(body);
        }

        try {
            const response = await fetch(url, config);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const detail = errorData.detail || `HTTP error status: ${response.status}`;
                throw new Error(detail);
            }
            if (response.status === 204 || response.headers.get("content-length") === "0") {
                return null;
            }
            return await response.json();
        } catch (error) {
            console.error(`Baserow API Error: ${error.message}`);
            throw error;
        }
    }

    // --- Core API Functions ---
    async function createTicket(ticketDataFromForm) {
        const fieldsToCreate = {
            [COLUMN_NAMES.TICKET_TITLE]: ticketDataFromForm[COLUMN_NAMES.TICKET_TITLE],
            [COLUMN_NAMES.DETAILED_DESCRIPTION]: ticketDataFromForm[COLUMN_NAMES.DETAILED_DESCRIPTION],
            [COLUMN_NAMES.URGENCY_LEVEL]: ticketDataFromForm[COLUMN_NAMES.URGENCY_LEVEL],
            [COLUMN_NAMES.STATUS]: { value: 'New' },
            [COLUMN_NAMES.REQUESTER_EMAIL]: ticketDataFromForm[COLUMN_NAMES.REQUESTER_EMAIL],
        };
        if (ticketDataFromForm[COLUMN_NAMES.ATTACHMENT]) {
            fieldsToCreate[COLUMN_NAMES.ATTACHMENT] = ticketDataFromForm[COLUMN_NAMES.ATTACHMENT];
        }
        const createdRecord = await _fetchBaserowAPI(BASEROW_TICKETS_TABLE_ID, '', 'POST', fieldsToCreate);
        return { id: createdRecord.id, fields: createdRecord, createdTime: createdRecord.created_on };
    }

    async function getAllTickets() {
        const response = await _fetchBaserowAPI(BASEROW_TICKETS_TABLE_ID, '', 'GET');
        return response.results.map(record => ({
            id: record.id,
            fields: record,
            created_at: record.created_on
        }));
    }

    async function getTicketById(recordId) {
        const record = await _fetchBaserowAPI(BASEROW_TICKETS_TABLE_ID, recordId, 'GET');
        return { id: record.id, fields: record, created_at: record.created_on };
    }

    async function updateTicket(recordId, updatedDataFromApp) {
        const updatedRecord = await _fetchBaserowAPI(BASEROW_TICKETS_TABLE_ID, recordId, 'PATCH', updatedDataFromApp);
        return { id: updatedRecord.id, fields: updatedRecord, created_at: updatedRecord.created_on };
    }

    async function getUserByEmail(email) {
        const filterField = encodeURIComponent(COLUMN_NAMES.USER_EMAIL);
        const query = `?filter__field_${filterField}__equal=${encodeURIComponent(email)}`;
        const response = await _fetchBaserowAPI(BASEROW_USERS_TABLE_ID, query, 'GET');
        if (response.results.length > 0) {
            const userRecord = response.results[0];
            return { id: userRecord.id, fields: userRecord, createdTime: userRecord.created_on };
        }
        return null;
    }

    // --- Expose functions to global scope ---
    window.createTicket = createTicket;
    window.getAllTickets = getAllTickets;
    window.getTicketById = getTicketById;
    window.updateTicket = updateTicket;
    window.getUserByEmail = getUserByEmail;

})(window);