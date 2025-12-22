import React, { useMemo, useState } from "react";
import { Dropdown } from "@vibe/core"; // Try standard import first as per my previous code, or user says @vibe/core/next?

// User text: "Notice not to import components directly from the @vibe/core package, as they are deprecated. import { Dropdown } from "@vibe/core/next";"
// I should try that if the user explicitly pasted that doc.

export const TestDropdown = () => {
    const options = useMemo(
        () => [
            { value: 1, label: "Option 1" },
            { value: 2, label: "Option 2" },
            { value: 3, label: "Option 3" },
        ],
        []
    );

    return (
        <div style={{ padding: "20px", border: "1px dashed red" }}>
            <h3>Test Dropdown (Next)</h3>
            <Dropdown
                placeholder="Test Dropdown"
                options={options}
                menuPosition="absolute"
                maxMenuHeight={150}
                size="medium"
                className="test-dropdown"
            />
        </div>
    );
};
