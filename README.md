# Web Ticketing Application

This project is a simple web-based ticketing application designed to allow users to submit support tickets and administrators to manage them. The backend for data storage is Stackby, accessed via its API.

## Project Structure

-   `index.html`: The main page for users to submit new support tickets.
-   `admin.html`: The dashboard page for administrators to view and manage tickets.
-   `css/`: Contains stylesheets.
    -   `style.css`: Main stylesheet for the application.
-   `js/`: Contains JavaScript files.
    -   `main.js`: Client-side JavaScript for `index.html` (user-facing form).
    -   `admin.js`: Client-side JavaScript for `admin.html` (admin dashboard).
    -   `stackby-api.js`: Contains functions for interacting with the Stackby API.
-   `README.md`: This file.
-   `DEPLOYMENT_GUIDE.md`: Instructions for deploying the application.
-   `EMAIL_INTEGRATION_GUIDE.md`: Guide for setting up email notifications.

## Features

**User-Facing:**
-   Ticket submission form (Title, Description, Urgency, Attachment).
-   Client-side validation for the submission form.
-   User feedback messages for submission status.

**Admin-Facing:**
-   Ticket dashboard to view all tickets.
-   Filtering tickets by status and urgency.
-   Searching tickets by title or description.
-   Sorting tickets by various columns (ID, Title, Date, Urgency, Status, Assignee).
-   Modal view for detailed ticket information.
-   Ability to update ticket status within the modal.
-   Ability to assign a collaborator to a ticket within the modal.
-   Placeholder UI reminders for manual email notifications upon status change or assignment.

## Setup

1.  **Stackby Configuration:**
    *   The application requires a Stackby account and a table configured to store tickets.
    *   Open `js/stackby-api.js` and update the following constants with your Stackby details:
        *   `STACKBY_API_KEY`
        *   `STACKBY_STACK_ID`
        *   `STACKBY_TABLE_NAME`
        *   Review and update `COLUMN_NAMES` object in the same file if your Stackby table column names differ from the defaults (e.g., "Ticket Title", "Status").
    *   **SECURITY WARNING:** The Stackby API key is currently hardcoded in the client-side JavaScript (`js/stackby-api.js`). This is **NOT SECURE** for production. For any real deployment, you must protect this key using a backend proxy or serverless functions.

2.  **Open Application:**
    *   Open `index.html` in your browser to access the user ticket submission form.
    *   Open `admin.html` in your browser to access the admin ticket dashboard.

## Email Notifications

Automated email notifications are not implemented directly in this client-side application. Refer to the `EMAIL_INTEGRATION_GUIDE.md` for strategies on how to set up email notifications using services like Stackby Automations, Zapier, or a custom backend.

## Deployment

For instructions on how to deploy this application to a web hosting service, please refer to the `DEPLOYMENT_GUIDE.md`.

## Development Notes

-   The application uses HTML, CSS, and vanilla JavaScript.
-   API interactions with Stackby are handled in `js/stackby-api.js`.
-   User-specific logic is in `js/main.js` and admin-specific logic is in `js/admin.js`.
-   The application is designed as a static site.

---
*This README was generated based on the project context.*
[![Netlify Status](https://api.netlify.com/api/v1/badges/d4b673e1-49f9-4734-9eb1-9ee0871664dc/deploy-status)](https://app.netlify.com/projects/ticketyx/deploys)
