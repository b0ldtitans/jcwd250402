import { Toaster } from "sonner";
import { Route, Routes } from "react-router-dom";

import {
  TenantLogin,
  Home,
  TenantDashboard,
  TenantRegisterPage,
  PageNotFound,
  CreateProperty,
  EditProperty,
  BookingsPage,
  ReservationsPage,
  CreateRoom,
  FavoritePage,
} from "./pages";
import {
  ProtectedRoute,
  ProtectedTenantRoute,
  RedirectRoute,
} from "./utils/protectedRoute";
import AuthModal from "./components/Modals/AuthModal";
import PaymentModal from "./components/Modals/PaymentModal.jsx";
import ProofImageModal from "./components/Modals/ProofImageModal.jsx";
import SearchModal from "./components/Modals/SearchModal.jsx";
import VerifyUserPage from "./pages/VerifyUserPage";
import { ListingPage } from "./components/propertyListings";
import PropertyDelete from "./components/Modals/PropertyDelete";
import RoomDelete from "./components/Modals/RoomDelete";
import ResetPassword from "./pages/ResetPassword";
import TenantRegisterModal from "./components/Modals/TenantRegister";

function App() {
  return (
    <main>
      <Toaster richColors />
      <TenantRegisterModal />
      <AuthModal />
      <PropertyDelete />
      <PaymentModal />
      <ProofImageModal />
      <RoomDelete />
      <SearchModal />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/property/:id" element={<ListingPage />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/tenant/register" element={<TenantRegisterPage />} />
        <Route path="/edit-property/:id" element={<EditProperty />} />
        <Route path="/verify-email" element={<VerifyUserPage />} />
        <Route
          path="/tenant/dashboard/:propertyId/create-room"
          element={<CreateRoom />}
        />

        {/* USER NEEDS TO BE AUTHENTICATED */}
        <Route path="/bookings" element={<ProtectedRoute />}>
          <Route index element={<BookingsPage />} />
        </Route>

        <Route path="/reservations" element={<ProtectedRoute />}>
          <Route index element={<ReservationsPage />} />
        </Route>

        <Route path="/favorites" element={<ProtectedRoute />}>
          <Route index element={<FavoritePage />} />
        </Route>
        {/* END OF USER NEEDS TO BE AUTHENTICATED */}

        {/* PROTECTED TENANT ROUTE */}
        <Route
          path="/tenant/dashboard/edit-property/:id"
          element={<ProtectedTenantRoute />}
        >
          <Route index element={<EditProperty />} />
        </Route>

        <Route
          path="/tenant/dashboard/create-property"
          element={<ProtectedTenantRoute />}
        >
          <Route index element={<CreateProperty />} />
        </Route>

        <Route path="/tenant/dashboard" element={<ProtectedTenantRoute />}>
          <Route index element={<TenantDashboard />} />
        </Route>
        {/* END OF PROTECTED TENANT ROUTE */}

        {/* IF USER IS AUTHENTICATED IT WILL REDIRECT TO '/' */}
        <Route path="tenant" element={<RedirectRoute />}>
          <Route index element={<TenantLogin />} />{" "}
        </Route>

        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </main>
  );
}

export default App;
