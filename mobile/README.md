# BunkerMode Mobile

React Native client for BunkerMode mobile execution.

## Scope

- Login with the existing API.
- General stack for planning/review surfaces already implemented in mobile.
- Soldier stack for execution-only mode.
- Stack selection comes from `usuario.active_mode` returned by the API.
- Operational mission list comes from the existing API.
- Complete missions only when `permissions.can_complete` is true.
- Return to General is requested through the backend unlock flow.

## Run

```bash
cd mobile
npm install
npm run start
```

By default the app uses:

```bash
http://127.0.0.1:8000/api/v2
```

Override for device or emulator access:

```bash
EXPO_PUBLIC_API_URL=http://10.0.2.2:8000/api/v2 npm run start
```

Use `10.0.2.2` for Android emulator when the API is running on the host machine.
