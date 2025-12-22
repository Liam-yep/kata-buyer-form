import React, { createContext, useContext, useState, useEffect } from "react";
import mondaySdk from "monday-sdk-js";
import MondayService from "../services/MondayService";
const MondayContext = createContext(null);

export const MondayProvider = ({ children }) => {
    const [monday] = useState(() => mondaySdk());
    const [context, setContext] = useState(null);
    const [projects, setProjects] = useState([]);

    useEffect(() => {
        monday.execute("valueCreatedForUser");
        monday.listen("context", (res) => {
            setContext(res.data);
        });
        MondayService.getProjects().then((projs) => {
            setProjects(projs.map(p => ({ value: p.id, label: p.name })));
        });
    }, [monday]);

    return (
        <MondayContext.Provider value={{ monday, context, projects }}>
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
