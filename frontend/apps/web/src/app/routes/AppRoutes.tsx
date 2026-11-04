import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import AdminRoute from "./AdminRoute";
import PublicRoute from "./PublicRoute";
import { useAuth } from "../providers/AuthProvider";
import { getProfile } from "../../shared/lib/storage";

import LoginPage from "../../features/auth/pages/LoginPage";
import SignupPage from "../../features/auth/pages/SignupPage";
import OnboardingPage from "../../features/onboarding/pages/OnboardingPage";

import AppLayout from "../layout/AppLayout";

// Group2 placeholders
import FeedPage from "../../features/feed/pages/FeedPage";
import EventsPage from "../../features/events/pages/EventsPage";
import FoodPage from "../../features/food/pages/FoodPage";
import CommunityPage from "../../features/community/pages/CommunityPage";
import ChatPage from "../../features/chat/pages/ChatPage";
import CreatePostPage from "../../features/createPost/pages/CreatePostPage";
import PostPublishedPage from "../../features/createPost/pages/PostPublishedPage";
import ListingsPage from "../../features/housing/pages/ListingsPage";
import ListingDetailPage from "../../features/housing/pages/ListingDetailPage";

// Create pages
import CreateContentPage from "../../features/feed/pages/CreateContentPage";
import CreateListingPage from "../../features/housing/pages/CreateListingPage";
import CreateRestaurantPage from "../../features/food/pages/CreateRestaurantPage";

// Group3 pages
import ProfilePage from "../../features/profile/pages/ProfilePage";
import EditProfilePage from "../../features/profile/pages/EditProfilePage";
import MyPostsPage from "../../features/profile/pages/MyPostsPage.tsx";
import NotificationsPage from "../../features/profile/pages/NotificationsPage.tsx";
import SettingsPage from "../../features/settings/pages/SettingsPage";
import SupportPage from "../../features/settings/pages/SupportPage";
import PrivacyPolicyPage from "../../features/settings/pages/PrivacyPolicyPage";
import FavoritesPage from "../../features/favorites/pages/FavoritesPage";
import InterestedPage from "../../features/interested/pages/InterestedPage";

// Admin pages
import AdminLayout from "../../features/admin/layout/AdminLayout";
import AdminDashboard from "../../features/admin/pages/AdminDashboard";
import UserManagement from "../../features/admin/pages/UserManagement";
import ContentModeration from "../../features/admin/pages/ContentModeration";
import AnalyticsPage from "../../features/admin/pages/AnalyticsPage";
import ReportsPage from "../../features/admin/pages/ReportsPage";
import AdminSettings from "../../features/admin/pages/AdminSettings";
import FeedManagementPage from "../../features/admin/pages/FeedManagementPage";
import ListingsManagementPage from "../../features/admin/pages/ListingsManagementPage";
import FoodManagementPage from "../../features/admin/pages/FoodManagementPage";
import CommunityManagementPage from "../../features/admin/pages/CommunityManagementPage";
import RoommatesPage from "../../features/admin/pages/RoommatesPage";
import AuthManagementPage from "../../features/admin/pages/AuthManagementPage";
import SupportRequestsPage from "../../features/admin/pages/SupportRequestsPage";

function RootRedirect() {
  const { isAuthed } = useAuth();
  const profile = getProfile();
  if (!isAuthed) return <Navigate to="/auth/login" replace />;
  if (!profile) return <Navigate to="/onboarding" replace />;
  return <Navigate to="/app/feed" replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />

      <Route
        path="/auth/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/auth/signup"
        element={
          <PublicRoute>
            <SignupPage />
          </PublicRoute>
        }
      />

      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <OnboardingPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="feed" element={<FeedPage />} />
        <Route path="events" element={<EventsPage />} />
        <Route path="food" element={<FoodPage />} />
        <Route path="community" element={<CommunityPage />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="create" element={<CreatePostPage />} />
        <Route path="create-content" element={<CreateContentPage />} />
        <Route path="create-listing" element={<CreateListingPage />} />
        <Route path="create-restaurant" element={<CreateRestaurantPage />} />
        <Route path="published" element={<PostPublishedPage />} />
        <Route path="housing" element={<ListingsPage />} />
        <Route path="housing/:id" element={<ListingDetailPage />} />

        <Route path="profile" element={<ProfilePage />} />
        <Route path="profile/edit" element={<EditProfilePage />} />
        <Route path="myposts" element={<MyPostsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="favorites" element={<FavoritesPage />} />
        <Route path="interested" element={<InterestedPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="support" element={<SupportPage />} />
        <Route path="privacy-policy" element={<PrivacyPolicyPage />} />
      </Route>

      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="content" element={<ContentModeration />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="feed" element={<FeedManagementPage />} />
        <Route path="listings" element={<ListingsManagementPage />} />
        <Route path="food" element={<FoodManagementPage />} />
        <Route path="community" element={<CommunityManagementPage />} />
        <Route path="roommates" element={<RoommatesPage />} />
        <Route path="auth" element={<AuthManagementPage />} />
        <Route path="support" element={<SupportRequestsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
