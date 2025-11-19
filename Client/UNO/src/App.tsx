// App.tsx
import React from "react";
import { Routes, Route } from "react-router-dom";
import Lobby from "./pages/Lobby";
import Pending from "./pages/Pending";
import Game from "./pages/Game";

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Lobby />} />
      <Route path="/pending/:id" element={<Pending />} />
      <Route path="/game/:id" element={<Game />} />
    </Routes>
  );
};

export default App;
