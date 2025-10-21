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
        DATE_SUBMITTED: 'Date Submited', // Make sure this matches exactly your Baserow column name
        USER_EMAIL: 'User mail',
        USER_PASSWORD: 'Password',
        USER_ROLE: 'Role',
    };

    // Expose COLUMN_NAMES to the global scope
    window.COLUMN_NAMES = COLUMN_NAMES;

    // --- Helper Functions ---
    async function _fetchBaserowAPI(tableId, recordIdOrQuery = '', method, body = null) {
        // Ensure recordIdOrQuery is a string
        const queryString = String(recordIdOrQuery || '');

        let url = `${BASEROW_API_BASE_URL}/table/${tableId}/`;

        if (method === 'GET' && queryString && !queryString.startsWith('?')) {
            url += `${queryString}/`;
        } else if (method === 'PATCH' && queryString) {
            url += `${queryString}/`;
        }

        url += '?user_field_names=true';

        if (method === 'GET' && queryString.startsWith('?')) {
            url += `&${queryString.substring(1)}`;
        }

        const headers = {
            'Authorization': `Token ${BASEROW_API_TOKEN}`,
            'Content-Type': 'application/json'
        };

        const config = { method, headers };
        if (body) {
            config.body = JSON.stringify(body);
        }

        console.log('🔍 Debug API - URL:', url);
        console.log('🔍 Debug API - Method:', method);
        console.log('🔍 Debug API - Headers:', headers);
        if (body) console.log('🔍 Debug API - Body:', body);

        try {
            const response = await fetch(url, config);
            console.log('🔍 Debug API - Response status:', response.status);
            console.log('🔍 Debug API - Response headers:', response.headers);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const detail = errorData.detail || `HTTP error status: ${response.status}`;
                console.error('🔍 Debug API - Error response:', errorData);
                throw new Error(detail);
            }
            if (response.status === 204 || response.headers.get("content-length") === "0") {
                return null;
            }
            const data = await response.json();
            console.log('🔍 Debug API - Response data:', data);
            return data;
        } catch (error) {
            console.error('Baserow API Error:', error);
            throw error;
        }
    }

    // --- Core API Functions ---
    async function createTicket(ticketDataFromForm) {
        // Get current date in ISO format for Date Submitted field
        const currentDate = new Date().toISOString();

        const fieldsToCreate = {
            [COLUMN_NAMES.TICKET_TITLE]: ticketDataFromForm[COLUMN_NAMES.TICKET_TITLE],
            [COLUMN_NAMES.DETAILED_DESCRIPTION]: ticketDataFromForm[COLUMN_NAMES.DETAILED_DESCRIPTION],
            [COLUMN_NAMES.URGENCY_LEVEL]: ticketDataFromForm[COLUMN_NAMES.URGENCY_LEVEL],
            [COLUMN_NAMES.STATUS]: 'New',
            [COLUMN_NAMES.REQUESTER_EMAIL]: ticketDataFromForm[COLUMN_NAMES.REQUESTER_EMAIL],
            [COLUMN_NAMES.DATE_SUBMITTED]: currentDate, // Add current date
        };
        if (ticketDataFromForm[COLUMN_NAMES.ATTACHMENT]) {
            fieldsToCreate[COLUMN_NAMES.ATTACHMENT] = ticketDataFromForm[COLUMN_NAMES.ATTACHMENT];
        }
        console.log('🔍 Debug Create - Fields to create:', fieldsToCreate);
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
        console.log('🔍 Debug getUserByEmail - Searching for email:', email);
        const filterField = encodeURIComponent(COLUMN_NAMES.USER_EMAIL);
        const query = `?filter__field_${filterField}__equal=${encodeURIComponent(email)}`;
        console.log('🔍 Debug getUserByEmail - Query:', query);
        const response = await _fetchBaserowAPI(BASEROW_USERS_TABLE_ID, query, 'GET');
        console.log('🔍 Debug getUserByEmail - Response:', response);
        if (response.results.length > 0) {
            const userRecord = response.results[0];
            console.log('🔍 Debug getUserByEmail - User found:', userRecord);
            return { id: userRecord.id, fields: userRecord, createdTime: userRecord.created_on };
        }
        console.log('🔍 Debug getUserByEmail - No user found');
        return null;
    }

    // --- Expose functions to global scope ---
    window.createTicket = createTicket;
    window.getAllTickets = getAllTickets;
    window.getTicketById = getTicketById;
    window.updateTicket = updateTicket;
    window.getUserByEmail = getUserByEmail;

})(window);
