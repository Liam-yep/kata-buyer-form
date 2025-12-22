import React, { createContext, useContext, useState, useEffect } from "react";
import mondaySdk from "monday-sdk-js";

const MondayContext = createContext(null);

export const MondayProvider = ({ children }) => {
    const [monday] = useState(() => mondaySdk());
    const [context, setContext] = useState(null);

    useEffect(() => {
        monday.execute("valueCreatedForUser");
        monday.listen("context", (res) => {
            setContext(res.data);
        });
    }, [monday]);

    return (
        <MondayContext.Provider value={{ monday, context }}>
            {children}
        </MondayContext.Provider>
    );
};

export const useMonday = () => {
    const context = useContext(MondayContext);
    if (!context) {
        throw new Error("useMonday must be used within a MondayProvider");
    }
    return context;
};
