import React from "react";
import { ToastProvider as UiToastProvider } from "../../shared/ui/Toast";

export default function ToastProvider({ children }: { children: React.ReactNode }) {
	return <UiToastProvider>{children}</UiToastProvider>;
}
