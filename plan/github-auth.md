# GitHub OAuth Integration and Profile README Editor Implementation Plan

This document outlines the plan to integrate GitHub OAuth into the Next.js static application, enabling users to authenticate and update their GitHub profile READMEs directly from the client-side, facilitated by a minimal Cloudflare Worker for token exchange.

## Phase 1: Setup and Backend Authentication Handler (Cloudflare Worker)

This phase focuses on setting up the necessary GitHub OAuth application and the Cloudflare Worker that will handle the secure exchange of the authorization code for an access token.

### Task 1.1: GitHub OAuth Application Registration - DONE

1.  **Action**: Navigate to GitHub Developer settings and register a new OAuth App.
2.  **Details**:
    - **Application Name**: e.g., "ElizaOS Profile Editor"
    - **Homepage URL**: Your deployed Next.js application URL (e.g., `https://elizaos.github.io`).
    - **Authorization callback URL**: The endpoint of your Cloudflare Worker that will handle the OAuth callback (e.g., `https://your-auth-worker.your-cf-account.workers.dev/api/auth/callback`). This URL will be finalized after deploying the worker.
3.  **Output**: Securely store the generated **Client ID** and **Client Secret**.

### Task 1.2: Cloudflare Worker Project Setup - DONE

1.  **Directory**: Create a new directory, e.g., `auth-worker`, at the project root.
2.  **Configuration (`wrangler.toml`)**:
    - Define worker `name`, `main` entry point (e.g., `src/index.ts`), and `compatibility_date`.
    - Set up `[build]` command if using TypeScript (e.g., `npm run build` with `tsc`).
    - Define `[vars]` for local development (e.g., `ALLOWED_ORIGIN = "http://localhost:3000"`).
    - Note that `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` will be configured as secrets in the Cloudflare dashboard for production.
3.  **TypeScript**: If not using a template, set up `tsconfig.json` and install necessary types (`@cloudflare/workers-types`).

### Task 1.3: Implement Cloudflare Worker Logic (`auth-worker/src/index.ts`) - DONE

1.  **Main Handler**: Implement the `fetch` event listener.
    - Route requests based on `url.pathname` (e.g., `/api/auth/callback`, `/api/status`).
    - Handle CORS preflight (`OPTIONS`) requests and add appropriate CORS headers (`Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`, etc.) to all responses, ensuring `env.ALLOWED_ORIGIN` is used.
2.  **Callback Handler (`handleCallback` function)**:
    - Extract `code` and `state` from the request URL. (State verification is primarily a client-side concern before calling this worker, but the worker could also be designed to expect a state relayed by the client).
    - Make a `POST` request to `https://github.com/login/oauth/access_token`.
      - **Payload**: `client_id`, `client_secret` (from `env`), and `code`.
      - **Headers**: `Content-Type: application/json`, `Accept: application/json`.
    - Parse the JSON response from GitHub.
    - **Security**: Check if the `scope` in the response includes `'repo'`. If not, return an error.
    - Return the `access_token`, `token_type`, and `scope` to the Next.js client as a JSON response.
    - Implement comprehensive error handling for fetch failures or errors from GitHub.
    ```typescript
    // Pseudocode for token exchange in Worker:
    // async function handleCallback(request, env) {
    //   const code = new URL(request.url).searchParams.get('code');
    //   const response = await fetch('https://github.com/login/oauth/access_token', {
    //     method: 'POST',
    //     headers: { /* ... */ },
    //     body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, /* ... */ code }),
    //   });
    //   const tokenData = await response.json();
    //   if (!tokenData.scope?.includes('repo')) { /* return error */ }
    //   return new Response(JSON.stringify(tokenData), { headers: { /* CORS */ }});
    // }
    ```

### Task 1.4: Deploy and Configure Cloudflare Worker - DONE

1.  **Deployment**: Use Wrangler CLI (`bunx wrangler deploy`) to deploy the worker.
2.  **Secrets**: In the Cloudflare dashboard (or via Wrangler CLI), set the following secrets for the deployed worker:
    - `GITHUB_CLIENT_ID`
    - `GITHUB_CLIENT_SECRET`
    - `ALLOWED_ORIGIN` (the URL of your deployed Next.js application).
3.  **Update OAuth App**: Ensure the "Authorization callback URL" in your GitHub OAuth App settings matches the deployed worker's callback endpoint.

## Phase 2: Frontend Authentication Core (Next.js)

This phase involves setting up the Next.js frontend to handle the user-facing part of the authentication flow, manage auth state, and interact with the Cloudflare Worker.

### Task 2.1: Configure Next.js Environment Variables - DONE

1.  **File**: Create/update `.env` or `.env.local`.
2.  **Variables**:
    - `NEXT_PUBLIC_GITHUB_CLIENT_ID`: Your GitHub OAuth App's Client ID.
    - `NEXT_PUBLIC_AUTH_WORKER_URL`: The full URL of your deployed Cloudflare Worker.
    - `NEXT_PUBLIC_APP_URL`: The base URL of your Next.js application (e.g., `http://localhost:3000` for dev, `https://elizaos.github.io` for prod).
    - `NEXT_PUBLIC_REDIRECT_URI`: The callback URL _within your Next.js app_ where GitHub will redirect the user after authorization (e.g., `${NEXT_PUBLIC_APP_URL}/auth/callback`).

### Task 2.2: Create Authentication Context (`src/contexts/AuthContext.tsx`) - DONE

1.  **Purpose**: A React Context to manage global authentication state (user object, token, loading status, errors) and provide auth-related functions.
2.  **State**: `user`, `token`, `isLoading`, `error`.
3.  **Functions**:
    - `login()`:
      - Generates a `state` string for CSRF protection and stores it in `localStorage`.
      - Constructs the GitHub authorization URL: `https://github.com/login/oauth/authorize` with `client_id`, `redirect_uri` (pointing to `/auth/callback` in Next.js app), `scope=user,repo`, and the generated `state`.
      - Redirects the user to this URL.
    - `logout()`: Clears the `token` and `user` from state and `localStorage`. Resets `oauth_state`.
    - `fetchUserData(accessToken)`:
      - Makes a GET request to `https://api.github.com/user` with the `accessToken`.
      - Updates `user` state. Handles errors (e.g., 401 for invalid token).
    - `handleAuthCallback(code, receivedState)`:
      - Retrieves and verifies the `savedState` from `localStorage` against `receivedState`.
      - Makes a GET request to the Cloudflare Worker's callback endpoint (e.g., `${NEXT_PUBLIC_AUTH_WORKER_URL}/api/auth/callback?code=${code}`).
      - On success, receives `access_token` from the worker.
      - Stores the token in `localStorage`.
      - Calls `fetchUserData()` with the new token.
      - Navigates the user (e.g., to the homepage).
4.  **Effect**: `useEffect` hook to check `localStorage` for an existing token on app initialization and call `fetchUserData` if found.

### Task 2.3: Integrate AuthProvider in `src/app/layout.tsx` - DONE

1.  **Action**: Wrap the main children of your `RootLayout` component with the `<AuthProvider>`.
    ```tsx
    // Example in src/app/layout.tsx
    // import { AuthProvider } from '@/contexts/AuthContext';
    // <AuthProvider>
    //   {/* ... rest of your layout ... */}
    //   {children}
    // </AuthProvider>
    ```

### Task 2.4: Implement OAuth Callback Page (`src/app/auth/callback/page.tsx`) - DONE

1.  **Purpose**: This Next.js page handles the redirect from GitHub after the user authorizes the app.
2.  **Logic**:
    - Use `useSearchParams()` from `next/navigation` to extract the `code` and `state` query parameters.
    - Call the `handleAuthCallback(code, state)` function from `useAuth()`.
    - Render loading indicators or error messages based on the `isLoading` and `error` state from `AuthContext`.
    - Ensure this page is wrapped with `<Suspense>` due to `useSearchParams`.

### Task 2.5: Create UI for Auth Controls (`src/components/AuthControls.tsx`) - DONE

1.  **Functionality**: A component that displays a "Login with GitHub" button if the user is not authenticated, or user information (avatar, name) and a logout option/dropdown if authenticated.
2.  **Implementation**:
    - Use `useAuth()` hook to get `user`, `isLoading`, `login`, `logout`.
    - Employ shadcn/ui components: `Button` for login/logout, `Avatar` for user display, `DropdownMenu` for user actions (e.g., View Profile, Edit README, Logout).
    - Use Lucide React icons for visual cues (e.g., `LogIn`, `LogOut`).

### Task 2.6: Add AuthControls to Header/Navigation - DONE

1.  **Integration**: Place the `<AuthControls />` component in a visible part of the application header, likely within `src/app/layout.tsx` alongside the `<Navigation />` and `<ThemeToggle />` components.

## Phase 3: GitHub API Integration and Profile README Editor

This phase covers creating a service to interact with the GitHub API and building the UI for users to edit their profile README.

### Task 3.1: Create GitHub API Service (`src/lib/githubService.ts`)

1.  **Purpose**: A centralized TypeScript module for making authenticated requests to the GitHub API.
2.  **Helper Function**: `makeGitHubApiRequest(endpoint, token, options)`: A generic internal function to handle common logic like setting Authorization headers and base URL, and basic error handling.
3.  **Key Functions**:
    - `getAuthenticatedUser(token: string): Promise<GitHubUser>`: Fetches user data from `/user`.
    - `getRepo(token: string, owner: string, repoName: string): Promise<GitHubRepo>`: Fetches repo details from `/repos/{owner}/{repoName}`.
    - `createRepo(token: string, repoName: string, description: string, autoInit: boolean = true): Promise<GitHubRepo>`: Creates a new repository via `POST /user/repos`.
    - `getFileContent(token: string, owner: string, repoName: string, filePath: string): Promise<GitHubFileContent | null>`: Fetches file content (and SHA) from `/repos/{owner}/{repoName}/contents/{filePath}`. Should handle 404 by returning `null` if file doesn't exist. Content will be base64.
    - `updateFile(token: string, owner: string, repoName: string, filePath: string, message: string, content: string, sha?: string): Promise<UpdateFileResponse>`: Creates or updates a file via `PUT /repos/{owner}/{repoName}/contents/{filePath}`.
      - `content`: Plain text, needs to be Base64 encoded before sending (`btoa()`).
      - `sha`: Required if updating an existing file.

### Task 3.2: Implement Profile README Editor Page (`src/app/profile/readme/edit/page.tsx`)

1.  **Route Protection**: Use `useAuth()` to check for an authenticated user and token. Redirect to login or homepage if not authenticated.
2.  **Data Fetching (`useEffect`)**:
    - On component mount (and when `user` or `token` changes), if authenticated:
      - Call `githubService.getRepo` to check if the user's profile repository (`username/username`) exists.
      - If it exists, call `githubService.getFileContent` to fetch `README.md`. Decode content from Base64 (`atob()`). Store content and SHA in local state.
      - Set loading and error states appropriately.
3.  **Submit Handler (`handleSubmitReadme`)**:
    - Takes the new README content as input.
    - If the profile repository doesn't exist (based on earlier check), call `githubService.createRepo` first.
    - Call `githubService.updateFile` to create/update `README.md`. Provide commit message, new content (Base64 encoded), and the `sha` (if updating).
    - Handle success and error responses, updating UI messages.
4.  **UI**:
    - Use shadcn `Card` for structure.
    - Display appropriate messages for loading states, errors, and success.
    - Indicate if the profile repository/README will be created or updated.
    - Integrate the `ProfileReadmeForm` component.

### Task 3.3: Create Profile README Form Component (`src/components/ProfileReadmeForm.tsx`)

1.  **Props**: `initialContent: string`, `onSubmit: (newContent: string) => Promise<void>`, `isProcessing: boolean`.
2.  **State**: Local state for the form's content (e.g., `textarea` value), initialized with `initialContent`.
3.  **UI**:
    - Use shadcn `Textarea` for multi-line Markdown input.
    - Use shadcn `Label` for the textarea.
    - Use shadcn `Button` for submission, showing a loading state (`Loader2` icon) when `isProcessing` is true.
    - Provide hints about Markdown usage.

## Phase 4: Styling, Refinements, and Security Review

Final touches, ensuring the feature is robust, user-friendly, and secure.

### Task 4.1: Apply Styling

1.  **Method**: Primarily use Tailwind CSS utility classes for layout and specific styling needs.
2.  **Consistency**: Ensure the new components and pages align with the existing application's design language, leveraging shadcn/ui's theming.
3.  **Responsiveness**: Verify that all new UI elements are responsive across different screen sizes.

### Task 4.2: Review and Refine Error Handling

1.  **User Experience**: Ensure all potential errors (network issues, API errors from GitHub or the worker, invalid token, insufficient scope) are caught and presented to the user in a clear, non-technical way.
2.  **Logging**: Implement client-side logging for easier debugging of authentication or API interaction issues.
3.  **States**: Thoroughly test loading states to provide good user feedback.

### Task 4.3: Security Review

1.  **CSRF**: Confirm the `state` parameter mechanism is correctly implemented and verified in `AuthContext.handleAuthCallback` before calling the worker.
2.  **Token Handling**:
    - Re-evaluate `localStorage` for token storage. While common, be aware of XSS risks. Ensure other parts of the application are secure against XSS.
    - Ensure tokens are not leaked (e.g., in URLs unnecessarily, or in error messages).
3.  **Cloudflare Worker**:
    - Double-check that `ALLOWED_ORIGIN` in the worker is strictly set to the production Next.js app's domain.
    - Ensure production secrets are used, not hardcoded values.
4.  **OAuth Scopes**:
    - Confirm only necessary scopes (`user`, `repo`) are requested.
    - Clearly communicate to the user why these permissions are needed.
    - Verify the Cloudflare Worker and Next.js client correctly check for the `repo` scope in the token response.
5.  **HTTPS**: Ensure all communications (Next.js app, Cloudflare Worker, GitHub API) occur over HTTPS.

### Task 4.4: Testing

1.  **End-to-End Flow**:
    - Login successfully.
    - Logout.
    - Attempt to access protected pages without login.
    - Create a profile README if one doesn't exist.
    - Edit an existing profile README.
2.  **Edge Cases**:
    - GitHub token revocation/expiry (simulate by clearing localStorage and attempting actions, or by revoking app access on GitHub).
    - GitHub API rate limits (less likely for this use case but good to be aware of).
    - Network interruptions during auth or API calls.
    - Incorrect `state` parameter during OAuth callback.
    - Token missing the required `repo` scope.
3.  **Browser Compatibility**: Test on major browsers.
