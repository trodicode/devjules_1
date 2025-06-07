// js/airtable-api.js
// This file contains all functions for interacting with the Airtable API.

// --- Airtable Configuration ---
// IMPORTANT SECURITY WARNING: Embedding API keys/tokens directly in client-side JavaScript
// is insecure and should NOT be done in a production environment.
// This is done here only for the purpose of this exercise.
// In a real application, use a backend proxy or serverless functions to protect your API token.
const AIRTABLE_API_TOKEN = 'paticv4QDnZUFYyP5.047350af033cc564024af6c8b06d422204e2b37a498ee3b50021018018b2ef00';
const AIRTABLE_BASE_ID = 'apprdjtTTzLLPapwk';
const AIRTABLE_TABLE_NAME = 'tbase'; // This should be URL-encoded if it contains spaces or special characters

// Base URL for Airtable API
// Note: TABLE_NAME will be URL-encoded in the _fetchAirtableAPI function.
const AIRTABLE_API_BASE_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`;

const AIRTABLE_USERS_TABLE_NAME = 'Users';

// Column Name Mapping (Assumed to be the same as Stackby for now, verify with actual Airtable base)
const COLUMN_NAMES = {
    TICKET_TITLE: 'Ticket Title',
    DETAILED_DESCRIPTION: 'Detailed Description',
    URGENCY_LEVEL: 'Urgency Level',
    ATTACHMENT: 'Attachment', // This will need special handling for Airtable (array of attachment objects)
    TICKET_ID: 'Ticket ID',   // This might be an autonumber field in Airtable or the record ID itself.
    STATUS: 'Status',
    ASSIGNED_COLLABORATOR: 'Assigned Collaborator',
    REQUESTER_EMAIL: 'On Demand', // New field for Requester's Email
    // Airtable's internal Record ID is 'id' at the top level of a record object.
    // No specific 'ROW_ID' needed in COLUMN_NAMES for Airtable like it was for Stackby conceptually.

    // User table columns
    USER_EMAIL: 'User mail',
    USER_PASSWORD: 'Password',
    USER_ROLE: 'Role',
};

// --- Helper Functions ---

/**
 * Generic helper function to make fetch requests to the Airtable API.
 * @param {string} recordIdOrQuery - Optional record ID for specific record operations, or query parameters for listing.
 * @param {string} method - HTTP method (GET, POST, PATCH, DELETE).
 * @param {object} [body=null] - Request body for POST/PATCH/PUT.
 * @param {string} tableName - The name of the table to interact with.
 * @returns {Promise<object|Array>} - A promise that resolves to the JSON response.
 */
async function _fetchAirtableAPI(tableName, recordIdOrQuery = '', method, body = null) {
    // URL encode the table name to handle spaces or special characters
    const encodedTableName = encodeURIComponent(tableName);
    let url = `${AIRTABLE_API_BASE_URL}/${encodedTableName}`;

    if (typeof recordIdOrQuery === 'string' && recordIdOrQuery) {
        if (method === 'GET' && !recordIdOrQuery.startsWith('?')) { // Specific record ID
            url += `/${recordIdOrQuery}`;
        } else if (method === 'GET' && recordIdOrQuery.startsWith('?')) { // Query parameters
            url += recordIdOrQuery;
        } else if (method === 'PATCH' || method === 'DELETE') { // Record ID for PATCH/DELETE
             url += `/${recordIdOrQuery}`;
        }
    }

    const headers = {
        'Authorization': `Bearer ${AIRTABLE_API_TOKEN}`,
        'Content-Type': 'application/json'
    };

    const config = {
        method: method,
        headers: headers
    };

    if (body) {
        config.body = JSON.stringify(body);
    }

    console.log("[Airtable API] Request URL:", url);
    console.log("[Airtable API] Request Method:", config.method);
    console.log("[Airtable API] Request Headers:", JSON.stringify(config.headers)); // Be cautious logging full headers if sensitive
    if (config.body) {
        console.log("[Airtable API] Request Body:", config.body);
    }

    try {
        const response = await fetch(url, config);

        console.log("[Airtable API] Response Status:", response.status);
        console.log("[Airtable API] Response Status Text:", response.statusText);
        console.log("[Airtable API] Response OK:", response.ok);

        // Attempt to clone and log the response body
        response.clone().json().then(data => {
            console.log("[Airtable API] Response Body (JSON):", data);
        }).catch(err => {
            response.clone().text().then(text => {
                console.log("[Airtable API] Response Body (Text):", text);
            });
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }));
            console.error(`[Airtable API] API Error Response Data for ${method} ${url}:`, errorData);
            // Airtable errors often have an 'error' object with 'type' and 'message'
            const errorMessage = (errorData.error && errorData.error.message) ? errorData.error.message : JSON.stringify(errorData);
            throw new Error(`Airtable API request failed with status ${response.status}: ${errorMessage}`);
        }

        if (response.status === 204 || response.headers.get("content-length") === "0") {
            console.log("[Airtable API] Response is 204 No Content or empty.");
            return null;
        }

        const jsonData = await response.json();
        console.log("[Airtable API] Parsed JSON Data from response:", jsonData);
        return jsonData;

    } catch (error) {
        console.error(`[Airtable API] Fetch Error during API call to ${url}:`, error);
        console.error("[Airtable API] Error Name:", error.name);
        console.error("[Airtable API] Error Message:", error.message);
        throw error;
    }
}

// --- Core API Functions ---

/**
 * Initializes the Airtable API configuration.
 */
function initAirtable() { // Renamed from initStackby
    console.log("[Airtable API Init] Initializing Airtable API configuration...");
    console.log("[Airtable API Init] AIRTABLE_API_TOKEN (first 5 chars of Personal Access Token prefix):", AIRTABLE_API_TOKEN ? AIRTABLE_API_TOKEN.substring(0, Math.min(5, AIRTABLE_API_TOKEN.indexOf('.'))) + "..." : "Not Set");
    console.log("[Airtable API Init] AIRTABLE_BASE_ID:", AIRTABLE_BASE_ID);
    console.log("[Airtable API Init] AIRTABLE_TABLE_NAME:", AIRTABLE_TABLE_NAME);
    console.log("[Airtable API Init] COLUMN_NAMES Mapping:", JSON.stringify(COLUMN_NAMES, null, 2));

    if (AIRTABLE_API_TOKEN && AIRTABLE_BASE_ID && AIRTABLE_TABLE_NAME) {
        console.log('[Airtable API Init] Configuration appears to be loaded.');
    } else {
        console.error('[Airtable API Init] CRITICAL: Airtable API Token, Base ID, or Table Name is missing.');
    }
}
initAirtable(); // Call init


/**
 * Creates a new ticket in Airtable.
 * @param {object} ticketDataFromForm - Data from the submission form.
 *                                      Attachment should be filename string.
 */
async function createTicket(ticketDataFromForm) {
    console.log("[Airtable API] createTicket called with form data:", JSON.stringify(ticketDataFromForm, null, 2));
    if (!AIRTABLE_API_TOKEN || !AIRTABLE_BASE_ID || !AIRTABLE_TABLE_NAME) {
        console.error('[Airtable API] createTicket: API not configured.');
        return null;
    }

    // Prepare fields for Airtable
    const fieldsToCreate = {
        [COLUMN_NAMES.TICKET_TITLE]: ticketDataFromForm[COLUMN_NAMES.TICKET_TITLE],
        [COLUMN_NAMES.DETAILED_DESCRIPTION]: ticketDataFromForm[COLUMN_NAMES.DETAILED_DESCRIPTION],
        [COLUMN_NAMES.URGENCY_LEVEL]: ticketDataFromForm[COLUMN_NAMES.URGENCY_LEVEL],
        [COLUMN_NAMES.STATUS]: 'New', // Default status
    };

    // Add Requester Email if provided
    if (ticketDataFromForm[COLUMN_NAMES.REQUESTER_EMAIL]) {
        fieldsToCreate[COLUMN_NAMES.REQUESTER_EMAIL] = ticketDataFromForm[COLUMN_NAMES.REQUESTER_EMAIL];
    }

    // Handle attachment: Airtable expects an array of attachment objects [{url: "..."}]
    // js/main.js already formats ticketDataFromForm[COLUMN_NAMES.ATTACHMENT] into this structure if a URL is provided.
    const attachmentData = ticketDataFromForm[COLUMN_NAMES.ATTACHMENT];
    if (attachmentData) { // attachmentData is already [{url: "..."}] or undefined
        fieldsToCreate[COLUMN_NAMES.ATTACHMENT] = attachmentData;
        // No need to check startsWith here as it's already an object/array.
        // The console.warn for non-URL filenames would be better placed in main.js if strict URL validation is needed there.
    }

    const requestBody = { fields: fieldsToCreate, typecast: true };

    try {
        console.log('[Airtable API] createTicket: Attempting to create record with data:', JSON.stringify(requestBody, null, 2));
        // Airtable returns the created record object directly (not in an array like Stackby for single creation)
        const createdRecord = await _fetchAirtableAPI(AIRTABLE_TABLE_NAME, '', 'POST', requestBody);

        if (createdRecord && createdRecord.id) {
            console.log('[Airtable API] createTicket: Ticket created successfully. Result:', JSON.stringify(createdRecord, null, 2));
            // Adapt to expected structure (id instead of rowId, fields object)
            return { id: createdRecord.id, fields: createdRecord.fields, createdTime: createdRecord.createdTime };
        } else {
            console.warn('[Airtable API] createTicket: Ticket creation returned an unexpected response format.', createdRecord);
            return createdRecord;
        }
    } catch (error) {
        console.error('[Airtable API] createTicket: Error during ticket creation.', error);
        return null;
    }
}

/**
 * Retrieves all tickets from Airtable.
 */
async function getAllTickets() {
    console.log("[Airtable API] getAllTickets called.");
    if (!AIRTABLE_API_TOKEN || !AIRTABLE_BASE_ID || !AIRTABLE_TABLE_NAME) {
        console.error('[Airtable API] getAllTickets: API not configured.');
        return null;
    }

    try {
        // Airtable returns records in a 'records' array
        // Removed the '?view=All%20Tickets' parameter to fetch all records without specifying a view.
        // Other query parameters like sort can be added here if needed, e.g., '?sort%5B0%5D%5Bfield%5D=Created&sort%5B0%5D%5Bdirection%5D=desc'
        const response = await _fetchAirtableAPI(AIRTABLE_TABLE_NAME, '', 'GET');
        if (response && response.records) {
            console.log('[Airtable API] getAllTickets: Tickets fetched successfully. Count:', response.records.length);
            // Adapt each record to have 'id' and 'fields' at top level, and 'created_at' from 'createdTime'
            return response.records.map(record => ({
                id: record.id, // Airtable record ID
                fields: record.fields,
                created_at: record.createdTime // Adapt to existing 'created_at' usage if any
            }));
        } else {
             console.warn('[Airtable API] getAllTickets: No records found or unexpected response format.', response);
            return []; // Return empty array if no records
        }
    } catch (error) {
        console.error('[Airtable API] getAllTickets: Error fetching tickets.', error);
        return null;
    }
}

/**
 * Retrieves a specific ticket by its Airtable Record ID.
 */
async function getTicketById(recordId) {
    console.log(`[Airtable API] getTicketById called with recordId: ${recordId}`);
    if (!AIRTABLE_API_TOKEN || !AIRTABLE_BASE_ID || !AIRTABLE_TABLE_NAME) {
        console.error('[Airtable API] getTicketById: API not configured.');
        return null;
    }
    if (!recordId) {
        console.error('[Airtable API] getTicketById: Record ID is required.');
        return null;
    }

    try {
        const record = await _fetchAirtableAPI(AIRTABLE_TABLE_NAME, recordId, 'GET');
        if (record && record.id) {
            console.log(`[Airtable API] getTicketById: Ticket ${recordId} fetched successfully. Result:`, JSON.stringify(record, null, 2));
            // Adapt to expected structure
            return { id: record.id, fields: record.fields, created_at: record.createdTime };
        } else {
            console.warn(`[Airtable API] getTicketById: Could not find record ${recordId} or unexpected response.`, record);
            return null;
        }
    } catch (error) {
        console.error(`[Airtable API] getTicketById: Error fetching ticket ${recordId}.`, error);
        return null;
    }
}

/**
 * Updates an existing ticket in Airtable using its Record ID.
 */
async function updateTicket(recordId, updatedDataFromApp) {
    console.log(`[Airtable API] updateTicket called for recordId: ${recordId} with data:`, JSON.stringify(updatedDataFromApp, null, 2));
    if (!AIRTABLE_API_TOKEN || !AIRTABLE_BASE_ID || !AIRTABLE_TABLE_NAME) {
        console.error('[Airtable API] updateTicket: API not configured.');
        return null;
    }
    if (!recordId) {
        console.error('[Airtable API] updateTicket: Record ID is required.');
        return null;
    }

    const fieldsToUpdate = { ...updatedDataFromApp };

    // Handle attachment if present in updatedDataFromApp
    // updatedDataFromApp is expected to come directly from the application logic,
    // so if an attachment URL is being updated, js/admin.js (or similar) should format it
    // as [{url: "new_url"}] before calling updateTicket.
    // If clearing, it should send { [COLUMN_NAMES.ATTACHMENT]: null } or an empty array.
    if (updatedDataFromApp.hasOwnProperty(COLUMN_NAMES.ATTACHMENT)) {
        const attachmentUpdateValue = updatedDataFromApp[COLUMN_NAMES.ATTACHMENT];
        // If attachmentUpdateValue is a string (a new URL), format it.
        // If it's null or an empty array (for clearing), it's already fine.
        // If it's already [{url: "..."}], it's also fine.
        if (typeof attachmentUpdateValue === 'string' && attachmentUpdateValue.trim() !== '') {
            if (attachmentUpdateValue.startsWith('http://') || attachmentUpdateValue.startsWith('https://')) {
                 fieldsToUpdate[COLUMN_NAMES.ATTACHMENT] = [{ url: attachmentUpdateValue }];
            } else {
                // If it's a filename or invalid URL string, create placeholder.
                // However, for updates, it's more likely this should be pre-validated or handled by calling code.
                fieldsToUpdate[COLUMN_NAMES.ATTACHMENT] = [{ url: `file://${attachmentUpdateValue}` }];
                console.warn(`[Airtable API] updateTicket: Attachment string "${attachmentUpdateValue}" is not a valid URL. Formatting as placeholder URL.`);
            }
        } else {
            // If it's null, an empty array, or already formatted, pass it as is.
            fieldsToUpdate[COLUMN_NAMES.ATTACHMENT] = attachmentUpdateValue;
        }
    }

    const requestBody = { fields: fieldsToUpdate, typecast: true };

    try {
        console.log(`[Airtable API] updateTicket: Attempting to update record ${recordId} with data:`, JSON.stringify(requestBody, null, 2));
        const updatedRecord = await _fetchAirtableAPI(AIRTABLE_TABLE_NAME, recordId, 'PATCH', requestBody);
         if (updatedRecord && updatedRecord.id) {
            console.log(`[Airtable API] updateTicket: Ticket ${recordId} updated successfully. Result:`, JSON.stringify(updatedRecord, null, 2));
            // Adapt to expected structure
            return { id: updatedRecord.id, fields: updatedRecord.fields, created_at: updatedRecord.createdTime };
        } else {
            console.warn(`[Airtable API] updateTicket: Update for ${recordId} returned an unexpected response.`, updatedRecord);
            return updatedRecord;
        }
    } catch (error) {
        console.error(`[Airtable API] updateTicket: Error updating ticket ${recordId}.`, error);
        return null;
    }
}

console.log('[Airtable API] airtable-api.js loaded and initial configuration logged.');

// --- User Functions ---

/**
 * Fetches a user by their email address from the 'Users' table.
 * @param {string} email - The email of the user to fetch.
 * @returns {Promise<object|null>} - A promise that resolves to the user object if found, otherwise null.
 */
async function getUserByEmail(email) {
    console.log(`[Airtable API] getUserByEmail called for email: ${email}`);
    if (!AIRTABLE_API_TOKEN || !AIRTABLE_BASE_ID || !AIRTABLE_USERS_TABLE_NAME) {
        console.error('[Airtable API] getUserByEmail: API not configured for Users table.');
        return null;
    }
    if (!email) {
        console.error('[Airtable API] getUserByEmail: Email is required.');
        return null;
    }

    // Construct the filter formula for Airtable
    // Example: filterByFormula=({Email}='user@example.com')
    const filterFormula = encodeURIComponent(`({${COLUMN_NAMES.USER_EMAIL}}='${email}')`);
    const query = `?filterByFormula=${filterFormula}`;

    try {
        console.log(`[Airtable API] getUserByEmail: Querying Users table with filter: ${decodeURIComponent(query)}`);
        const response = await _fetchAirtableAPI(AIRTABLE_USERS_TABLE_NAME, query, 'GET');

        if (response && response.records && response.records.length > 0) {
            const userRecord = response.records[0]; // Assuming email is unique
            console.log('[Airtable API] getUserByEmail: User found successfully.', JSON.stringify(userRecord, null, 2));
            // Adapt to a simpler structure if needed, similar to other functions
            return { id: userRecord.id, fields: userRecord.fields, createdTime: userRecord.createdTime };
        } else {
            console.warn(`[Airtable API] getUserByEmail: No user found with email ${email}. Response:`, response);
            return null; // No user found
        }
    } catch (error) {
        console.error(`[Airtable API] getUserByEmail: Error fetching user with email ${email}.`, error);
        // Optionally, re-throw the error if the caller should handle it,
        // or return null to indicate failure to find/fetch.
        return null;
    }
}

// Expose functions to global scope (if not using modules)
// This pattern might need adjustment based on how scripts are loaded and interact.
// For example, if using ES6 modules, you'd use `export { functionName };`
if (typeof window !== 'undefined') {
    window.createTicket = createTicket;
    window.getAllTickets = getAllTickets;
    window.getTicketById = getTicketById;
    window.updateTicket = updateTicket;
    window.getUserByEmail = getUserByEmail; // Expose the new function
    window.initAirtable = initAirtable; // If needed globally
    window.COLUMN_NAMES = COLUMN_NAMES; // Expose column names if needed by other scripts
}
