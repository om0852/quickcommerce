"use client";

import React, { createContext, useContext } from 'react';

const AuthContext = createContext({ isAdmin: false });

export function AuthProvider({ children, isAdmin }) {
    return (
        <AuthContext.Provider value={{ isAdmin }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
