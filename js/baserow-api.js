// js/baserow-api.js
// This file contains all functions for interacting with the Baserow API.

// --- Baserow Configuration ---
// All configuration is now loaded from js/config.js
// This ensures that sensitive data is not stored in version control.

// Base URL for Baserow API
const BASEROW_API_BASE_URL = 'https://api.baserow.io/api/database/rows';

// Column Name Mapping (These must match the column names in your Baserow tables)
const COLUMN_NAMES = {
    TICKET_TITLE: 'Ticket Title',
    DETAILED_DESCRIPTION: 'Detailed Description',
    URGENCY_LEVEL: 'Urgency Level',
    ATTACHMENT: 'Attachment',
    TICKET_ID: 'Ticket ID',
    STATUS: 'Status',
    ASSIGNED_COLLABORATOR: 'Assigned Collaborator',
    REQUESTER_EMAIL: 'On Demand',

    // User table columns
    USER_EMAIL: 'User mail',
    USER_PASSWORD: 'Password',
    USER_ROLE: 'Role',
};

// --- Helper Functions ---

/**
 * Generic helper function to make fetch requests to the Baserow API.
 * @param {string} tableId - The ID of the table to interact with.
 * @param {string} recordIdOrQuery - Optional record ID for specific record operations, or query parameters for listing.
 * @param {string} method - HTTP method (GET, POST, PATCH, DELETE).
 * @param {object} [body=null] - Request body for POST/PATCH.
 * @returns {Promise<object|Array>} - A promise that resolves to the JSON response.
 */
async function _fetchBaserowAPI(tableId, recordIdOrQuery = '', method, body = null) {
    let url = `${BASEROW_API_BASE_URL}/table/${tableId}/`;

    if (method === 'GET' && recordIdOrQuery && !recordIdOrQuery.startsWith('?')) {
        url += `${recordIdOrQuery}/`; // Get specific row
    } else if (method === 'PATCH' && recordIdOrQuery) {
        url += `${recordIdOrQuery}/`; // Update specific row
    }

    // Always add user_field_names=true to use names instead of field_ids
    url += '?user_field_names=true';

    if (method === 'GET' && recordIdOrQuery.startsWith('?')) {
        url += `&${recordIdOrQuery.substring(1)}`; // Add query parameters
    }
     if (method === 'POST') {
        // for POST request, the query is part of the base url
    }


    const headers = {
        'Authorization': `Token ${window.BASEROW_API_TOKEN}`,
        'Content-Type': 'application/json'
    };

    const config = {
        method: method,
        headers: headers
    };

    if (body) {
        config.body = JSON.stringify(body);
    }

    console.log("[Baserow API] Request URL:", url);
    console.log("[Baserow API] Request Method:", config.method);
    if (config.body) {
        console.log("[Baserow API] Request Body:", config.body);
    }

    try {
        const response = await fetch(url, config);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: { detail: response.statusText } }));
            const errorMessage = errorData.error.detail || JSON.stringify(errorData);
            console.error(`[Baserow API] API Error for ${method} ${url}:`, errorMessage);
            throw new Error(`Baserow API request failed with status ${response.status}: ${errorMessage}`);
        }

        if (response.status === 204 || response.headers.get("content-length") === "0") {
            return null;
        }

        return await response.json();

    } catch (error) {
        console.error(`[Baserow API] Fetch Error during API call to ${url}:`, error);
        throw error;
    }
}


// --- Core API Functions ---

/**
 * Initializes the Baserow API configuration.
 */
function initBaserow() {
    console.log("[Baserow API Init] Initializing Baserow API configuration...");
    console.log("[Baserow API Init] BASEROW_API_TOKEN (first 5 chars):", window.BASEROW_API_TOKEN ? window.BASEROW_API_TOKEN.substring(0, 5) + "..." : "Not Set");
    console.log("[Baserow API Init] BASEROW_DATABASE_ID:", window.BASEROW_DATABASE_ID);
    console.log("[Baserow API Init] BASEROW_TICKETS_TABLE_ID:", window.BASEROW_TICKETS_TABLE_ID);
    console.log("[Baserow API Init] BASEROW_USERS_TABLE_ID:", window.BASEROW_USERS_TABLE_ID);

    if (window.BASEROW_API_TOKEN && window.BASEROW_DATABASE_ID && window.BASEROW_TICKETS_TABLE_ID && window.BASEROW_USERS_TABLE_ID) {
        console.log('[Baserow API Init] Configuration appears to be loaded.');
    } else {
        console.error('[Baserow API Init] CRITICAL: Baserow configuration is missing.');
    }
}



/**
 * Creates a new ticket in Baserow.
 * @param {object} ticketDataFromForm - Data from the submission form.
 */
async function createTicket(ticketDataFromForm) {
    console.log("[Baserow API] createTicket called with form data:", ticketDataFromForm);

    // Baserow expects the fields directly in the request body
    const fieldsToCreate = {
        [COLUMN_NAMES.TICKET_TITLE]: ticketDataFromForm[COLUMN_NAMES.TICKET_TITLE],
        [COLUMN_NAMES.DETAILED_DESCRIPTION]: ticketDataFromForm[COLUMN_NAMES.DETAILED_DESCRIPTION],
        [COLUMN_NAMES.URGENCY_LEVEL]: ticketDataFromForm[COLUMN_NAMES.URGENCY_LEVEL],
        [COLUMN_NAMES.STATUS]: 'New', // Default status
    };

    if (ticketDataFromForm[COLUMN_NAMES.REQUESTER_EMAIL]) {
        fieldsToCreate[COLUMN_NAMES.REQUESTER_EMAIL] = ticketDataFromForm[COLUMN_NAMES.REQUESTER_EMAIL];
    }

    // Handle attachment
    const attachmentData = ticketDataFromForm[COLUMN_NAMES.ATTACHMENT];
    if (attachmentData) {
        // Baserow expects an array of objects with a URL, e.g., [{ "url": "..." }]
        fieldsToCreate[COLUMN_NAMES.ATTACHMENT] = attachmentData;
    }

    try {
        const createdRecord = await _fetchBaserowAPI(window.BASEROW_TICKETS_TABLE_ID, '', 'POST', fieldsToCreate);
        console.log('[Baserow API] createTicket: Ticket created successfully. Result:', createdRecord);
        // Adapt the response to the structure expected by the app
        return { id: createdRecord.id, fields: createdRecord, createdTime: createdRecord.created_on };
    } catch (error) {
        console.error('[Baserow API] createTicket: Error during ticket creation.', error);
        return null;
    }
}

/**
 * Retrieves all tickets from Baserow.
 */
async function getAllTickets() {
    console.log("[Baserow API] getAllTickets called.");
    try {
        const response = await _fetchBaserowAPI(window.BASEROW_TICKETS_TABLE_ID, '', 'GET');
        if (response && response.results) {
            console.log('[Baserow API] getAllTickets: Tickets fetched successfully. Count:', response.results.length);
            // Adapt each record to the structure expected by the app
            return response.results.map(record => ({
                id: record.id,
                fields: record, // The fields are the record itself
                created_at: record.created_on
            }));
        } else {
            console.warn('[Baserow API] getAllTickets: No records found or unexpected response format.');
            return [];
        }
    } catch (error) {
        console.error('[Baserow API] getAllTickets: Error fetching tickets.', error);
        return null;
    }
}

/**
 * Retrieves a specific ticket by its Baserow Row ID.
 */
async function getTicketById(recordId) {
    console.log(`[Baserow API] getTicketById called with recordId: ${recordId}`);
    try {
        const record = await _fetchBaserowAPI(window.BASEROW_TICKETS_TABLE_ID, recordId, 'GET');
        console.log(`[Baserow API] getTicketById: Ticket ${recordId} fetched successfully.`, record);
        // Adapt to expected structure
        return { id: record.id, fields: record, created_at: record.created_on };
    } catch (error) {
        console.error(`[Baserow API] getTicketById: Error fetching ticket ${recordId}.`, error);
        return null;
    }
}

/**
 * Updates an existing ticket in Baserow using its Row ID.
 */
async function updateTicket(recordId, updatedDataFromApp) {
    console.log(`[Baserow API] updateTicket called for recordId: ${recordId} with data:`, updatedDataFromApp);

    const fieldsToUpdate = { ...updatedDataFromApp };

    // Handle attachment update
    if (updatedDataFromApp.hasOwnProperty(COLUMN_NAMES.ATTACHMENT)) {
        const attachmentUpdateValue = updatedDataFromApp[COLUMN_NAMES.ATTACHMENT];
        if (typeof attachmentUpdateValue === 'string' && attachmentUpdateValue.trim() !== '') {
            fieldsToUpdate[COLUMN_NAMES.ATTACHMENT] = [{ url: attachmentUpdateValue }];
        } else {
            fieldsToUpdate[COLUMN_NAMES.ATTACHMENT] = attachmentUpdateValue; // Pass null or [] to clear
        }
    }

    try {
        const updatedRecord = await _fetchBaserowAPI(window.BASEROW_TICKETS_TABLE_ID, recordId, 'PATCH', fieldsToUpdate);
        console.log(`[Baserow API] updateTicket: Ticket ${recordId} updated successfully.`, updatedRecord);
        // Adapt to expected structure
        return { id: updatedRecord.id, fields: updatedRecord, created_at: updatedRecord.created_on };
    } catch (error) {
        console.error(`[Baserow API] updateTicket: Error updating ticket ${recordId}.`, error);
        return null;
    }
}

/**
 * Fetches a user by their email address from the 'Users' table.
 * @param {string} email - The email of the user to fetch.
 * @returns {Promise<object|null>} - A promise that resolves to the user object if found, otherwise null.
 */
async function getUserByEmail(email) {
    console.log(`[Baserow API] getUserByEmail called for email: ${email}`);

    // Baserow filter syntax: filter__field_{URL_ENCODED_FIELD_NAME}__equal={VALUE}
    const filterField = encodeURIComponent(COLUMN_NAMES.USER_EMAIL);
    const query = `?filter__field_${filterField}__equal=${encodeURIComponent(email)}`;

    try {
        console.log(`[Baserow API] getUserByEmail: Querying Users table with filter: ${decodeURIComponent(query)}`);
        const response = await _fetchBaserowAPI(window.BASEROW_USERS_TABLE_ID, query, 'GET');

        if (response && response.results && response.results.length > 0) {
            const userRecord = response.results[0]; // Assuming email is unique
            console.log('[Baserow API] getUserByEmail: User found successfully.', userRecord);
            // Adapt to expected structure
            return { id: userRecord.id, fields: userRecord, createdTime: userRecord.created_on };
        } else {
            console.warn(`[Baserow API] getUserByEmail: No user found with email ${email}.`);
            return null;
        }
    } catch (error) {
        console.error(`[Baserow API] getUserByEmail: Error fetching user with email ${email}.`, error);
        return null;
    }
}

// Expose functions to global scope
if (typeof window !== 'undefined') {
    window.createTicket = createTicket;
    window.getAllTickets = getAllTickets;
    window.getTicketById = getTicketById;
    window.updateTicket = updateTicket;
    window.getUserByEmail = getUserByEmail;
    window.initBaserow = initBaserow;
    window.COLUMN_NAMES = COLUMN_NAMES;
}