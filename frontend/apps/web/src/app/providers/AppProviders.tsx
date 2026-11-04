import React from "react";
import { AuthProvider } from "./AuthProvider";
import ThemeProvider from "./ThemeProvider";
import ModalProvider from "./ModalProvider";
import ToastProvider from "./ToastProvider";

export default function AppProviders({ children }: { children: React.ReactNode }) {
	return (
		<AuthProvider>
			<ThemeProvider>
				<ToastProvider>
					<ModalProvider>{children}</ModalProvider>
				</ToastProvider>
			</ThemeProvider>
		</AuthProvider>
	);
}
