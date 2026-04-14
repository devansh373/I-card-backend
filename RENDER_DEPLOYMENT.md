# Deploying to Render with Docker 🚀

This project is configured for seamless deployment on [Render](https://render.com) using **Blueprints**. This approach automates the creation of both the Backend Web Service and the Managed PostgreSQL database.

## Prerequisites

1.  A [Render](https://render.com) account.
2.  Your project pushed to a GitHub or GitLab repository.

## Step 1: Deploy using the Blueprint

1.  Log in to your **Render Dashboard**.
2.  Click **New +** and select **Blueprint**.
3.  Connect your GitHub/GitLab repository.
4.  Render will automatically detect the `render.yaml` file.
5.  Click **Connect**.
6.  You will be prompted to fill in the following required environment variables:
    *   `ADMIN_EMAIL`: The email you'll use to log in to the admin panel.
    *   `ADMIN_PASSWORD`: A strong password for the admin account.
7.  Click **Apply**.

## Step 2: Automatic Setup

Render will now:
1.  Provision a **PostgreSQL** database.
2.  Link the database to your Web Service.
3.  Build the **Docker image** (this includes running `prisma generate` and `tsc`).
4.  Deploy the container.
5.  Run **Prisma Migrations** (`npx prisma migrate deploy`) automatically as part of the startup command.

## Step 3: Initial Data (Seeding)

Once the service is live, you need to seed the initial admin user.

1.  Go to your **Web Service** in the Render Dashboard.
2.  Click on the **Shell** tab (or use the Render CLI).
3.  Run the following command:
    ```bash
    node dist/scripts/seed-admin.js
    ```
    *Note: Ensure `ADMIN_EMAIL` and `ADMIN_PASSWORD` were correctly set in the Environment tab before running this.*

## Step 4: Health Check

You can verify the deployment by visiting:
`https://your-service-name.onrender.com/health`

It should return:
```json
{
  "status": "OK",
  "database": "connected",
  ...
}
```

## Maintenance & Updates

*   **Pushes to Main**: Every time you push to your main branch, Render will automatically rebuild and redeploy the project.
*   **Database Migrations**: New migrations are automatically applied during every deploy thanks to the `CMD` in the `Dockerfile`.
*   **Logs**: You can monitor logs directly in the Render Dashboard under the **Logs** tab.

> [!TIP]
> **Free Tier Note**: If you are using Render's Free tier, the service will "spin down" after 15 minutes of inactivity. The first request after a spin-down will take a few seconds to wake up the server.

> [!IMPORTANT]
> **CORS**: Don't forget to update the `ALLOWED_ORIGINS` environment variable in the Render Dashboard to match your frontend URL (e.g., `https://my-frontend.onrender.com`) instead of the default `*`.
