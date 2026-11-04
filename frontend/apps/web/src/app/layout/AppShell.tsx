import React from "react";
import BottomNav from "./BottomNav";
import Header from "./Header";
import PageContainer from "./PageContainer";

export default function AppShell({ children }: { children: React.ReactNode }) {
	return (
		<div className="min-h-screen bg-gray-100 text-gray-900">
			<div className="relative mx-auto min-h-screen max-w-[430px] bg-gray-50 shadow-xl">
				<Header />
				<main className="pt-[var(--header-height)]">
					<PageContainer>{children}</PageContainer>
				</main>
				<BottomNav />
			</div>
		</div>
	);
}
