import { Plus } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { ROUTES } from "../routes/routePaths";

const PLUS_ROUTES = [
  ROUTES.events,
  ROUTES.housing,
  ROUTES.feed,
  ROUTES.food,
];

export default function PlusButton() {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;

  if (!PLUS_ROUTES.includes(path as any)) return <div className="h-9 w-9" />;

  function handleClick() {
    if (path === ROUTES.feed) {
      navigate(ROUTES.createContent);
    } else if (path === ROUTES.housing) {
      navigate(ROUTES.createListing);
    } else if (path === ROUTES.food) {
      navigate(ROUTES.createRestaurant);
    } else {
      alert(`Create ${path.split("/").pop()} feature coming soon!`);
    }
  }

  return (
    <button
      onClick={handleClick}
      className="btn-active inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#0076EB] to-[#26B324] text-white shadow-md hover:opacity-90 transition"
      aria-label="Create"
    >
      <Plus className="h-6 w-6" />
    </button>
  );
}
