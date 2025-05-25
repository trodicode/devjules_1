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
};

// --- Helper Functions ---

/**
 * Generic helper function to make fetch requests to the Airtable API.
 * @param {string} recordIdOrQuery - Optional record ID for specific record operations, or query parameters for listing.
 * @param {string} method - HTTP method (GET, POST, PATCH, DELETE).
 * @param {object} [body=null] - Request body for POST/PATCH/PUT.
 * @returns {Promise<object|Array>} - A promise that resolves to the JSON response.
 */
async function _fetchAirtableAPI(recordIdOrQuery = '', method, body = null) {
    // URL encode the table name to handle spaces or special characters
    const encodedTableName = encodeURIComponent(AIRTABLE_TABLE_NAME);
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
    // Since we only have a filename, we can't directly upload.
    // We'll store the filename as text, or if it's a URL, format it correctly.
    const attachmentValue = ticketDataFromForm[COLUMN_NAMES.ATTACHMENT];
    if (attachmentValue) {
        if (attachmentValue.startsWith('http://') || attachmentValue.startsWith('https://')) {
            fieldsToCreate[COLUMN_NAMES.ATTACHMENT] = [{ url: attachmentValue }];
        } else {
            // If it's just a filename, and your Airtable field is an "Attachment" type,
            // this won't work directly. You'd typically need to upload the file elsewhere
            // and provide that URL. For now, if it's a text field, store the filename.
            // If it's an attachment field, this will likely fail or do nothing.
            // Let's assume for now it's a text field in Airtable for simplicity if not a URL.
            // Or, if the Airtable column is an Attachment type, it's better to pass [{url: "placeholder_or_filename_as_text"}]
            // but this won't make it a real attachment.
            // For this exercise, let's assume if it's not a URL, we are storing the filename as text
            // in a text field, OR if the field is an attachment type, we provide a placeholder URL structure.
            // Given the requirement: "Attachment" field should be formatted as [{"url": "URL_FROM_FORM"}]
            // We will assume if it's not a URL, we create a dummy URL structure with the filename.
            // This won't make it a usable attachment but fulfills the format.
            // A better approach is to ensure only valid URLs are passed or use a file upload service.
            fieldsToCreate[COLUMN_NAMES.ATTACHMENT] = [{ url: `file://${attachmentValue}` }]; // Placeholder-like URL
            console.warn(`[Airtable API] createTicket: Attachment "${attachmentValue}" is not a URL. Formatting as placeholder URL for Airtable.`);
        }
    }

    const requestBody = { fields: fieldsToCreate, typecast: true };

    try {
        console.log('[Airtable API] createTicket: Attempting to create record with data:', JSON.stringify(requestBody, null, 2));
        // Airtable returns the created record object directly (not in an array like Stackby for single creation)
        const createdRecord = await _fetchAirtableAPI('', 'POST', requestBody);
        
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
        // Example: May want to add query params like sort: `?sort%5B0%5D%5Bfield%5D=Created&sort%5B0%5D%5Bdirection%5D=desc`
        const response = await _fetchAirtableAPI('?view=All%20Tickets', 'GET'); // Assuming a view named 'All Tickets' or adapt
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
        const record = await _fetchAirtableAPI(recordId, 'GET');
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
    if (fieldsToUpdate.hasOwnProperty(COLUMN_NAMES.ATTACHMENT)) {
        const attachmentValue = fieldsToUpdate[COLUMN_NAMES.ATTACHMENT];
        if (attachmentValue && (typeof attachmentValue === 'string')) {
            if (attachmentValue.startsWith('http://') || attachmentValue.startsWith('https://')) {
                fieldsToUpdate[COLUMN_NAMES.ATTACHMENT] = [{ url: attachmentValue }];
            } else {
                // Filename only, create placeholder URL for Airtable attachment field
                fieldsToUpdate[COLUMN_NAMES.ATTACHMENT] = [{ url: `file://${attachmentValue}` }];
                 console.warn(`[Airtable API] updateTicket: Attachment "${attachmentValue}" is not a URL. Formatting as placeholder URL.`);
            }
        } else if (attachmentValue === '' || attachmentValue === null) {
            // To clear an attachment field in Airtable, you might need to pass null or an empty array
            // depending on the field type and API behavior. For attachment fields, null is often used.
            fieldsToUpdate[COLUMN_NAMES.ATTACHMENT] = null; 
        }
        // If attachmentValue is already an array of objects, assume it's correctly formatted
    }


    const requestBody = { fields: fieldsToUpdate, typecast: true };

    try {
        console.log(`[Airtable API] updateTicket: Attempting to update record ${recordId} with data:`, JSON.stringify(requestBody, null, 2));
        const updatedRecord = await _fetchAirtableAPI(recordId, 'PATCH', requestBody);
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
