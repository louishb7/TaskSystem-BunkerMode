import React from "react";

import SoldierDashboard from "../screens/soldier/SoldierDashboard";

export default function SoldierStack({ token, user, onLogout, onUserChange }) {
  return (
    <SoldierDashboard
      token={token}
      user={user}
      onLogout={onLogout}
      onUserChange={onUserChange}
    />
  );
}
