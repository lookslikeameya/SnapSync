import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Gallery from "./pages/Gallery";
import ProtectedRoute from "./components/ProtectedRoute";
import Upload from "./pages/Upload";
import OmniportSuccess from "./pages/OmniportSuccess";

import SignUp from "./pages/SignUp";
import VerifyOtp from "./pages/VerifyOtp";
import Albums from "./pages/Albums";
import Profile from "./pages/Profile";
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />



        <Route
          path="/gallery"
          element={
            <ProtectedRoute>
              <Gallery />
            </ProtectedRoute>
          }
        />
        <Route
          path="/albums"
          element={
            <ProtectedRoute>
              <Albums />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/upload"
          element={
            <ProtectedRoute>
              <Upload />
            </ProtectedRoute>
          }
        />

        <Route path="/omniport-success" element={<OmniportSuccess />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
