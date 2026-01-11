import { useEffect, useState } from "react";
import api from "../services/api";
import { useNavigate } from "react-router-dom";
import "./Profile.css";
import Navbar from "../components/Navbar";

export default function Profile() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [IsAdmin, setIsAdmin] = useState(false);
    const [IsPhotographer, setIsPhotographer] = useState(false);

    const fetchRole = async () => {
        const res = await api.get("/accounts/role/");
        setIsAdmin(
            res.data.roles?.includes("Admin")

        );
        setIsPhotographer(
            res.data.roles?.includes("Photographer")
        );
        // console.log(IsAdmin);




    };

    useEffect(() => {
        fetchUserProfile();
        fetchRole();
    }, []);

    const fetchUserProfile = async () => {
        try {
            const res = await api.get("/accounts/role/");
            setUser(res.data);
            setLoading(false);
        } catch (err) {
            console.error("Failed to fetch user profile:", err);
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        navigate("/login");
    };

    if (loading) return <p>Loading...</p>;

    if (!user) {
        return (
            <div className="profile-container">
                {/* NAVBAR */}
                <Navbar active="profile" />
                <p>Unable to load profile</p>
                <button onClick={() => navigate("/gallery")}>Go Back</button>
            </div>
        );
    }

    return (
        <div className="profile-container">
            {/* NAVBAR */}
            <Navbar active="profile" />
            <div className="profile-card">
                <h2>User Profile</h2>

                <div className="profile-info">
                    <div className="profile-field">
                        <label>Username</label>
                        <p>{user.username || "N/A"}</p>
                    </div>

                    <div className="profile-field">
                        <label>Email</label>
                        <p>{user.email || "N/A"}</p>
                    </div>

                    <div className="profile-field">
                        <label>Roles</label>
                        <div className="roles-list">
                            {user.roles && user.roles.length > 0 ? (
                                user.roles.map((role, index) => (
                                    <span key={index} className="role-badge">
                                        {role}
                                    </span>
                                ))
                            ) : (
                                <p>No roles assigned</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="profile-actions">
                    <button onClick={() => navigate("/gallery")}>Back to Gallery</button>
                </div>
            </div>
        </div>
    );
}
