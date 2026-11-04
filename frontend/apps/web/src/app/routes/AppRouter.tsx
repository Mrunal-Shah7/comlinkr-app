import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./index";

export default function AppRouter() {
	return (
		<BrowserRouter>
			<AppRoutes />
		</BrowserRouter>
	);
}
