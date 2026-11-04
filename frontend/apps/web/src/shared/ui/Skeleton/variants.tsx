export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm animate-pulse">
      <div className="h-4 w-3/4 bg-gray-200 rounded mb-2" />
      <div className="h-3 w-1/2 bg-gray-200 rounded" />
    </div>
  );
}

export function ListingCardSkeleton() {
  return (
    <div className="flex rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden animate-pulse">
      <div className="h-24 w-24 bg-gray-200 flex-shrink-0" />
      <div className="flex flex-1 flex-col justify-between p-3">
        <div>
          <div className="h-4 w-3/4 bg-gray-200 rounded mb-2" />
          <div className="h-3 w-1/2 bg-gray-200 rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-7 w-16 bg-gray-200 rounded-full" />
          <div className="h-7 w-16 bg-gray-200 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function RestaurantCardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden animate-pulse">
      <div className="h-32 w-full bg-gray-200" />
      <div className="p-4">
        <div className="h-3 w-20 bg-gray-200 rounded mb-3" />
        <div className="h-5 w-3/4 bg-gray-200 rounded mb-2" />
        <div className="h-3 w-1/2 bg-gray-200 rounded mb-2" />
        <div className="h-3 w-1/3 bg-gray-200 rounded mb-4" />
        <div className="flex gap-2">
          <div className="h-9 flex-1 bg-gray-200 rounded" />
          <div className="h-9 flex-1 bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  );
}

export function ProfileHeaderSkeleton() {
  return (
    <div className="rounded-3xl bg-gray-200 px-5 py-6 animate-pulse">
      <div className="flex items-start gap-4 mb-4">
        <div className="h-16 w-16 bg-gray-300 rounded-full" />
        <div className="flex-1">
          <div className="h-5 w-32 bg-gray-300 rounded mb-2" />
          <div className="h-4 w-24 bg-gray-300 rounded mb-3" />
          <div className="h-3 w-full bg-gray-300 rounded" />
        </div>
      </div>
      <div className="flex gap-3">
        <div className="h-3 w-20 bg-gray-300 rounded" />
        <div className="h-3 w-28 bg-gray-300 rounded" />
        <div className="h-3 w-24 bg-gray-300 rounded" />
      </div>
    </div>
  );
}
