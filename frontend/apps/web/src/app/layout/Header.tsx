import { ChevronLeft, MessageCircle } from "lucide-react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { ROUTES } from "../routes/routePaths";
import HamburgerMenu from "./HamburgerMenu";
import PlusButton from "./PlusButton";

const TITLE_MAP: Record<string, string> = {
  [ROUTES.login]: "Login",
  [ROUTES.signup]: "Sign Up",
  [ROUTES.onboarding]: "Onboarding",
  [ROUTES.feed]: "Explore",
  [ROUTES.events]: "Events",
  [ROUTES.food]: "Food",
  [ROUTES.community]: "Community",
  [ROUTES.chat]: "Chat",
  [ROUTES.create]: "Create Post",
  [ROUTES.createContent]: "Create Post",
  [ROUTES.createListing]: "Create Listing",
  [ROUTES.createRestaurant]: "Add Restaurant",
  [ROUTES.published]: "Post Published",
  [ROUTES.profile]: "Profile",
  [ROUTES.profileEdit]: "Edit Profile",
  [ROUTES.favorites]: "Saved",
  [ROUTES.interested]: "Interested",
  [ROUTES.myPosts]: "My Posts",
  [ROUTES.notifications]: "Notifications",
  [ROUTES.housing]: "Listings",
  [ROUTES.support]: "Help & Support",
  [ROUTES.privacyPolicy]: "Privacy Policy",
  [ROUTES.settings]: "Settings",
};

function getTitle(path: string): string {
  if (TITLE_MAP[path]) return TITLE_MAP[path];
  if (path.startsWith("/app/housing/")) return "Listing Details";
  return "ComLinkr";
}

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;
  const title = getTitle(path);
  const showBack = ![ROUTES.feed, ROUTES.food, ROUTES.community, ROUTES.housing].includes(path as never);

  return (
    <header className="fixed top-0 z-50 flex h-[var(--header-height)] w-full max-w-[430px] items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm">
      <div className="flex items-center gap-3">
        <HamburgerMenu />
        {showBack && (
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-active inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white hover:bg-gray-50 transition"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
      </div>
      <div className="flex items-center gap-2 absolute left-1/2 transform -translate-x-1/2">
        <img src="/images/brand/logo.jpg" alt="ComLinkr" className="h-12 w-12 object-cover" />
        <h1 className="text-base font-bold text-gray-900 leading-tight">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        {path === ROUTES.housing && (
          <Link
            to={ROUTES.chat}
            className="btn-active inline-flex h-10 w-10 items-center justify-center rounded-full bg-white border border-gray-200 hover:bg-gray-50 transition"
            aria-label="Chat"
          >
            <MessageCircle className="h-5 w-5 text-gray-700" />
          </Link>
        )}
        <PlusButton />
      </div>
    </header>
  );
}