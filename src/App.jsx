import React from "react";
import "@vibe/core/tokens";
import "./App.css"; // Global styles (layout)
import { MondayProvider } from "./context/MondayContext";
import BuyerForm from "./components/BuyerForm/BuyerForm";

const App = () => {
  return (
    <div className="app-container">
      <MondayProvider>
        <BuyerForm />
      </MondayProvider>
    </div>
  );
};

export default App;
