import React from "react";

import GeneralDashboardScreen from "../screens/GeneralDashboardScreen";

export default function GeneralStack({ token, user, onLogout, onUserChange }) {
  return (
    <GeneralDashboardScreen
      token={token}
      user={user}
      onLogout={onLogout}
      onUserChange={onUserChange}
    />
  );
}
