# BunkerMode Mobile

React Native client for Soldier execution only.

## Scope

- Login with the existing API.
- Explicit activation of Soldier mode.
- Operational mission list from the existing API.
- Complete missions only when `permissions.can_complete` is true.
- Submit failure justification only when `permissions.can_justify` is true.

No General planning screens are included.

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
