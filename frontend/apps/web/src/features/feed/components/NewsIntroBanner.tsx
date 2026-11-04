export default function NewsIntroBanner() {
	return (
		<div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0076EB] via-blue-500 to-[#26B324] px-5 py-4 shadow-lg">
			{/* Decorative circles */}
			<div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10" />
			<div className="absolute -left-4 -bottom-4 h-20 w-20 rounded-full bg-white/10" />
			
			<div className="relative z-10 flex items-center justify-between">
				<div>
					<p className="text-xs font-bold uppercase tracking-wider text-white/90 mb-1">
						📰 Latest News
					</p>
					<p className="text-sm text-white font-medium">
						Quick updates from around your city.
					</p>
				</div>
				<span className="rounded-full bg-white px-4 py-1.5 text-xs font-bold text-blue-600 shadow-md backdrop-blur-sm">
					Now
				</span>
			</div>
		</div>
	);
}
