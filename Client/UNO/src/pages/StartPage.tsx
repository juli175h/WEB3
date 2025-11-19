import React from "react";
import { Link } from "react-router-dom";

const StartPage = () => {
  return (
    <div style={{ fontFamily: 'system-ui, Arial', padding: 24 }}>
      <h1>UNO — Quick Start</h1>
      <p>If you see this page then the React + Vite setup is working.</p>
      <p>Quick checks:</p>
      <ul>
        <li>React version: {React.version}</li>
        <li>Vite dev server should be running via <code>npm run dev</code></li>
      </ul>
      <p>
        Go to the app: <Link to="/lobby">Open Lobby</Link>
      </p>
    </div>
  );
};

export default StartPage;
