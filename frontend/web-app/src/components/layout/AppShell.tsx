"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";

import Header from "./Header";
import MainMenu from "./MainMenu";
import SideNavDrawer from "./SideNavDrawer";
import ChatbotWidget from "../chat/ChatbotWidget";
import { ChatContextProvider } from "@/context/ChatContext";

export default function AppShell({
    children,
    }: {
    children: React.ReactNode;
    }) {
    const pathname = usePathname();

    const [detectedLocation, setDetectedLocation] =
        useState({
        city: "",
        state: "",
        district: "",
        postalCode: "",
        });

    const [drawerOpen, setDrawerOpen] = useState(false);

    const authPages = [
        "/signin",
        "/register",
        "/verify-email",
        "/forgot-password",
        "/reset-password",
    ];

    const hideLayout =
        authPages.includes(pathname);

    return (
        <ChatContextProvider>
        {!hideLayout && (
            <>
            <Header
                detectedLocation={detectedLocation}
                setDetectedLocation={setDetectedLocation}
            />

            <MainMenu
                onOpenAll={() => setDrawerOpen(true)}
            />

            <SideNavDrawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
            />
            </>
        )}

        <main className={!hideLayout ? "pt-[100px]" : ""}>
            {children}
        </main>

        {!hideLayout && <ChatbotWidget />}
        </ChatContextProvider>
    );
}