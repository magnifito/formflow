import React, { createContext, useContext, useState, useEffect } from 'react';

interface OrganizationContextType {
    selectedOrgId: number | null;
    setSelectedOrgId: (id: number | null) => void;
    clearSelection: () => void;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

const STORAGE_KEY = 'ff_selected_org_id';

export const OrganizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [selectedOrgId, setSelectedOrgIdState] = useState<number | null>(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored || stored === 'null') return null;
        const parsed = parseInt(stored, 10);
        return isNaN(parsed) ? null : parsed;
    });

    const setSelectedOrgId = (id: number | null) => {
        setSelectedOrgIdState(id);
        if (id === null) {
            localStorage.setItem(STORAGE_KEY, 'null');
        } else {
            localStorage.setItem(STORAGE_KEY, id.toString());
        }
    };

    const clearSelection = () => setSelectedOrgId(null);

    return (
        <OrganizationContext.Provider value={{ selectedOrgId, setSelectedOrgId, clearSelection }}>
            {children}
        </OrganizationContext.Provider>
    );
};

export const useOrganizationContext = () => {
    const context = useContext(OrganizationContext);
    if (context === undefined) {
        throw new Error('useOrganizationContext must be used within an OrganizationProvider');
    }
    return context;
};
