# Frontend

- `src/` is the active React/Vite storefront.
- `mobile/uriona/` is the Android customer app.

Customer clients consume the versioned backend API. Build the storefront with `npm run build` from this directory.

## Firebase email authentication

Create a Firebase project and Web App, enable **Authentication → Sign-in method → Email/Password**, and add the deployed storefront domain under **Authentication → Settings → Authorized domains**. Copy the Web App's `apiKey`, `authDomain`, `projectId`, and `appId` to the matching `VITE_FIREBASE_*` variables in the frontend environment. These values are client configuration, not Admin credentials.

Set `FIREBASE_PROJECT_ID` to the same Firebase project ID in the backend environment. The API verifies Firebase ID tokens and creates/links the Uriona profile and session only after Firebase confirms that the email is verified. Production deployments apply the `firebaseUid` database migration before starting the new backend.
