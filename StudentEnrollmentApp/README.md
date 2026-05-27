# Student Enrollment App

React Native / Expo frontend for the Student Enrollment System.

## Run Locally

```bash
npm install
npm run start
```

Set `EXPO_PUBLIC_API_URL` when the Django API is not running at the default LAN URL:

```bash
EXPO_PUBLIC_API_URL=http://YOUR_IP:8000/api/ npm run start
```

## Quality Checks

```bash
npm run lint
npm run typecheck
npm run test
```

`npm run test` currently runs linting and TypeScript checks as the app's baseline debugging practice.

## Build Setup

Preview Android APK:

```bash
npm run build:android
```

Preview iOS build:

```bash
npm run build:ios
```

The build profiles are defined in `eas.json`.

## Implementation Notes

- Navigation uses Expo Router tabs with responsive bottom/side layouts.
- API calls use Axios with JWT access tokens and refresh-token retry handling.
- Authentication tokens are stored through a platform-aware storage wrapper.
- Native image picking is used for profile pictures.
- Shared app-state components handle loading, empty, retry, and error UI.
