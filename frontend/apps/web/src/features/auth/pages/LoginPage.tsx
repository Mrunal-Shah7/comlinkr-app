import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../app/providers/AuthProvider";
import Button from "../../../shared/ui/Button";
import Input from "../../../shared/ui/Input";
import { useToast } from "../../../shared/ui/Toast";

export default function LoginPage() {
	const navigate = useNavigate();
	const { login } = useAuth();
	const { notify } = useToast();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault();
		if (!email || !password) {
			setError("Please fill in both fields.");
			return;
		}
		setError("");
		const { onboardingDone } = await login(email, password);
		navigate(onboardingDone ? "/app/feed" : "/onboarding");
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 px-4">
			<form
				onSubmit={handleSubmit}
				className="w-full max-w-[420px] rounded-3xl bg-white p-8 shadow-xl"
			>
			<div className="flex justify-center mb-6">
				<img src="/images/brand/logo.jpg" alt="ComLinkr" className="h-20 w-20" />
			</div>
				<h1 className="text-2xl font-bold text-gray-900 text-center">Welcome back</h1>
				<p className="mt-2 text-sm text-gray-600 text-center">Log in to continue with ComLinkr</p>
				<div className="mt-6 flex flex-col gap-4">
					<Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
					<Input
						label="Password"
						type="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
					/>
				</div>
				{error ? <p className="text-sm text-red-500">{error}</p> : null}
				<Button type="submit" variant="primary" tone="blue" className="mt-4 w-full">
					Log in
				</Button>
				<button
					type="button"
					className="mt-3 text-sm font-semibold text-gray-600"
					onClick={() => notify("Forgot password coming soon")}
				>
					Forgot password?
				</button>
				<p className="mt-4 text-center text-sm text-gray-500">
					New here?{" "}
					<Link to="/auth/signup" className="font-semibold text-brand-blue">
						Create account
					</Link>
				</p>
			</form>
		</div>
	);
}
