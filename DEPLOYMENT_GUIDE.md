# Deployment Guide: Web Ticketing Application

## 1. Introduction

This application is a set of static files (HTML, CSS, and JavaScript) that interact directly with the Stackby API via client-side JavaScript. It can be deployed to any web hosting service that supports serving static content.

## 2. Files to Deploy

The following files and directories constitute the core application and must be uploaded to your web host:

*   `index.html` (User ticket submission form)
*   `admin.html` (Administrator ticket management dashboard)
*   `css/` (directory containing all stylesheets)
    *   `css/style.css`
*   `js/` (directory containing all JavaScript files)
    *   `js/main.js`
    *   `js/admin.js`
    *   `js/stackby-api.js`

**Optional Documentation Files:**
While not part of the live application's functionality, you might consider uploading these to your repository or a documentation section if desired:
*   `README.md`
*   `EMAIL_INTEGRATION_GUIDE.md`
*   `DEPLOYMENT_GUIDE.md` (this file)

The other `.txt` files present in the project (e.g., `Functional_Description_Web_Ticketing_App.txt`) are specification documents and are not needed for the application to run.

## 3. Prerequisites for Functionality

Before deploying, or immediately after, ensure the following:

*   **Stackby API Configuration:**
    *   The application requires valid Stackby credentials to function. These must be configured in the `js/stackby-api.js` file.
    *   Specifically, update the following constants:
        *   `STACKBY_API_KEY`: Your unique Stackby API Key.
        *   `STACKBY_STACK_ID`: The ID or URL-friendly name of your Stack in Stackby.
        *   `STACKBY_TABLE_NAME`: The name of your table within the Stack (e.g., "tbase").
    *   **CRITICAL SECURITY NOTE:** The current setup places the Stackby API key directly in a client-side JavaScript file. This is **highly insecure for production environments** as it exposes your API key to anyone who inspects the site's code. For a secure deployment, you should implement a backend proxy or serverless function to handle API requests, keeping the API key on the server-side. This guide assumes you are aware of this risk if proceeding with the current client-side key implementation for testing or very limited internal use.

*   **Email Notifications:**
    *   The application currently only has UI placeholder reminders for email notifications.
    *   To implement actual automated email sending, you must follow the strategies outlined in the `EMAIL_INTEGRATION_GUIDE.md` document. This typically involves:
        *   Ensuring user and collaborator email addresses are stored in Stackby.
        *   Using Stackby's native automations, a third-party workflow tool (like Zapier or Make), or a custom backend solution.

## 4. General Deployment Steps

1.  **Choose a Hosting Provider:** Select a provider for static web hosting. Common options include:
    *   **Serverless Platforms:** Netlify, Vercel, GitHub Pages. These are often easy to use and have generous free tiers.
    *   **Cloud Storage Services:** AWS S3 (configured for static website hosting), Google Cloud Storage, Azure Blob Storage.
    *   **Traditional Web Hosting:** Shared hosting or VPS services that allow you to upload files (e.g., via cPanel, FTP).

2.  **Upload Files:**
    *   Upload all the files and directories listed under "Files to Deploy" (Section 2) to the root directory (or a designated subdirectory) of your hosting space. The structure should be maintained (e.g., `css` and `js` folders at the same level as `index.html`).

3.  **Access Your Application:**
    *   Once deployed, your application will be accessible via the URL provided by your hosting service (e.g., `yourusername.github.io/your-repo/` for GitHub Pages, or a custom domain if configured).
    *   Ensure your hosting service is configured to serve `index.html` as the default file for the root URL or directory.

## 5. Example: Deploying to GitHub Pages

GitHub Pages is a popular free option for hosting static sites directly from a GitHub repository.

1.  **Push Code to GitHub:**
    *   Ensure your project, including the deployable files (`index.html`, `admin.html`, `css/`, `js/`), is pushed to a GitHub repository.

2.  **Enable GitHub Pages:**
    *   Go to your repository on GitHub.
    *   Click on the "Settings" tab.
    *   In the left sidebar, click on "Pages" (under "Code and automation").
    *   Under "Build and deployment":
        *   For "Source," select "Deploy from a branch."
        *   For "Branch," select your main branch (commonly `main` or `master`).
        *   For the folder, select `/root` (or `/docs` if you moved files there, but `/root` is typical for simple projects).
        *   Click "Save."

3.  **Access Your Site:**
    *   GitHub Pages will build and deploy your site. This might take a minute or two.
    *   Once deployed, the URL will typically be in the format `https://<your-username>.github.io/<your-repository-name>/`. You'll see this URL displayed in the GitHub Pages settings.
    *   Ensure your Stackby API key is configured (keeping in mind the security warning in Section 3).

This guide provides the basic steps for deploying the application. Specific configurations might vary depending on the chosen hosting provider. Always refer to your hosting provider's documentation for detailed instructions.
