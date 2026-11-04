import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../app/providers/AuthProvider";
import Button from "../../../shared/ui/Button";
import Input from "../../../shared/ui/Input";

export default function SignupPage() {
	const navigate = useNavigate();
	const { signup } = useAuth();
	const [name, setName] = useState("");
	const [username, setUsername] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault();
		if (!name || !username || !email || !password) {
			setError("Please complete all fields.");
			return;
		}
		if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
			setError("Username must be 3-20 characters (letters, numbers, underscores only)");
			return;
		}
		setError("");
		await signup(name, email, password, username);
		navigate("/onboarding");
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
				<h1 className="text-2xl font-bold text-gray-900 text-center">Create account</h1>
				<p className="mt-2 text-sm text-gray-600 text-center">Join the ComLinkr community</p>
				<div className="mt-6 flex flex-col gap-4">
					<Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" />
					<Input 
						label="Username" 
						value={username} 
						onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} 
						placeholder="john_doe" 
						maxLength={20}
					/>
					<Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@example.com" />
					<Input
						label="Password"
						type="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						placeholder="••••••••"
					/>
				</div>
				{error ? <p className="text-sm text-red-500">{error}</p> : null}
				<Button type="submit" variant="primary" tone="blue" className="mt-4 w-full">
					Create account
				</Button>
				<p className="mt-4 text-center text-sm text-gray-500">
					Already have an account?{" "}
					<Link to="/auth/login" className="font-semibold text-brand-blue">
						Log in
					</Link>
				</p>
			</form>
		</div>
	);
}
