import React from "react";

export default function PageContainer({ children }: { children: React.ReactNode }) {
	return <div className="px-4 pb-safe pt-4">{children}</div>;
}
