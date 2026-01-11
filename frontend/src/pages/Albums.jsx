import { useEffect, useState } from "react";
import api from "../services/api";
import { useNavigate } from "react-router-dom";
import "./Albums.css";
import Navbar from "../components/Navbar";

export default function Albums() {

    const navigate = useNavigate();
    const [albums, setAlbums] = useState([]);
    const [users, setUsers] = useState([]);

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [coordinators, setCoordinators] = useState([]);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [coverImage, setCoverImage] = useState(null);
    const [previewImage, setPreviewImage] = useState(null);

    const [loading, setLoading] = useState(true);

    const [IsAdmin, setIsAdmin] = useState(false);
    const [IsPhotographer, setIsPhotographer] = useState(false);
    const [EditingAlbum, setEditingAlbum] = useState(false);
    const [Me, setMe] = useState(null);
    /* ---------------- FETCH IsAdmin ---------------- */

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
    const fetchMe = async () => {
        const res = await api.get("/accounts/role/");
        setMe(res.data);

    };


    const canEditAlbum = (album) => {
        if (!Me) return false;
        if (IsAdmin) return true;
        return album.coordinators?.includes(Me.id);
    };




    /* ---------------- FETCH ALBUMS ---------------- */

    const fetchAlbums = async () => {
        try {
            const res = await api.get("/albums/");
            setAlbums(res.data);
        } catch {
            alert("Failed to load albums");
        } finally {
            setLoading(false);
        }
    };

    /* ---------------- FETCH USERS ---------------- */

    const fetchUsers = async () => {
        const res = await api.get("/accounts/event-coordinators/");
        setUsers(res.data);
    };

    const handleLogout = () => {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        navigate("/login");
    };

    useEffect(() => {
        fetchAlbums();
        fetchUsers();
        fetchRole();
        fetchMe();
        
    }, []);

    /* ---------------- CREATE ALBUM ---------------- */

    const createAlbum = async () => {
        if (!title.trim()) return alert("Title required");

        try {
            const formData = new FormData();
            formData.append("title", title);
            formData.append("description", description);
            if (startDate) formData.append("start_date", startDate);
            if (endDate) formData.append("end_date", endDate);

            coordinators.forEach(id =>
                formData.append("coordinators", id)
            );

            if (coverImage) {
                formData.append("cover_image", coverImage);
            }

            await api.post("/albums/", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });

            setTitle("");
            setDescription("");
            setStartDate("");
            setEndDate("");
            setCoordinators([]);
            setCoverImage(null);
            setPreviewImage(null);

            fetchAlbums();
        } catch (err) {
            console.error(err);
            alert("Album creation failed");
        }
    };

    /* ---------------- DELETE ALBUM ---------------- */

    const deleteAlbum = async (albumId) => {


        await api.delete(`/albums/${albumId}/`);
        fetchAlbums();
    };

    //UPDATE ALBUM
    const updateAlbum = async () => {
        try {
            const formData = new FormData();
            formData.append("title", title);
            formData.append("description", description);
            if (startDate) formData.append("start_date", startDate);
            if (endDate) formData.append("end_date", endDate);

            coordinators.forEach(id =>
                formData.append("coordinators", id)
            );

            if (coverImage) {
                formData.append("cover_image", coverImage);
            }

            await api.patch(`/albums/${EditingAlbum.album_id}/`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            setTitle("");
            setDescription("");
            setStartDate("");
            setEndDate("");
            setCoordinators([]);
            setCoverImage(null);
            setEditingAlbum(null);
            setPreviewImage(null);
            fetchAlbums();
        } catch (err) {
            alert("Update failed");
        }
    };

    if (loading) return <p>Loading...</p>;



    return (
        <div className="albums-container">
            {/* NAVBAR */}
            <Navbar active="albums" />
            <h2>Albums</h2>
            {IsAdmin && !EditingAlbum && (
                <div className="create-album-card">
                    <h3>Create Album</h3>

                    <input
                        type="text"
                        placeholder="Album title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />

                    <textarea
                        placeholder="Description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />

                    <label>Start Date</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                    />

                    <label>End Date</label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                    />

                    <label>Event Coordinators</label>
                    <select
                        multiple
                        value={coordinators}
                        onChange={(e) =>
                            setCoordinators(
                                Array.from(e.target.selectedOptions, o => o.value)
                            )
                        }
                    >
                        {users.map(u => (
                            <option key={u.id} value={String(u.id)}>
                                {u.email}
                            </option>
                        ))}
                    </select>
                    <label>Cover Image</label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                            const file = e.target.files[0];
                            setCoverImage(file);
                            if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                    setPreviewImage(reader.result);
                                };
                                reader.readAsDataURL(file);
                            }
                        }}
                    />
                    {previewImage && (
                        <div style={{ marginTop: "10px" }}>
                            <img src={previewImage} alt="Preview" style={{ maxWidth: "200px", maxHeight: "200px", borderRadius: "4px" }} />
                        </div>
                    )}

                    <button onClick={createAlbum}>
                        Create Album
                    </button>
                </div>
            )}
            {EditingAlbum && (
                <div className="create-album-card">
                    <h3>Edit Album</h3>

                    <input
                        type="text"
                        placeholder="Album title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />

                    <textarea
                        placeholder="Description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />

                    <label>Start Date</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                    />

                    <label>End Date</label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                    />

                    <label>Event Coordinators</label>
                    <select
                        multiple
                        value={coordinators}
                        onChange={(e) =>
                            setCoordinators(
                                Array.from(e.target.selectedOptions, o => o.value)
                            )
                        }
                    >
                        {users.map(u => (
                            <option key={u.id} value={String(u.id)}>
                                {u.email}
                            </option>
                        ))}
                    </select>
                    <label>Cover Image</label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                            const file = e.target.files[0];
                            setCoverImage(file);
                            if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                    setPreviewImage(reader.result);
                                };
                                reader.readAsDataURL(file);
                            }
                        }}
                    />
                    {previewImage && (
                        <div style={{ marginTop: "10px" }}>
                            <img src={previewImage} alt="Preview" style={{ maxWidth: "200px", maxHeight: "200px", borderRadius: "4px" }} />
                        </div>
                    )}

                    <button onClick={updateAlbum}>
                        Edit Album
                    </button>
                </div>
            )}


            <div className="albums-grid">
                {albums.map(album => (
                    <div
                        key={album.album_id}
                        className="album-card"
                        onClick={() =>
                            navigate("/gallery", {
                                state: {
                                    album: album.album_id
                                }
                            })
                        }
                    >
                        <img
                            src={album.cover_image || "/placeholder.jpg"}
                            className="album-cover"
                            alt=""
                        />
                        <div className="album-info">
                            <h3>{album.title}</h3>
                            <p>{album.description}</p>

                            {album.start_date && (
                                <span className="album-date">
                                    📅 {album.start_date}
                                </span>
                            )}
                        </div>
                        {IsAdmin && (
                            <button
                                className="delete-album-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    deleteAlbum(album.album_id);
                                }}
                            >
                                Delete
                            </button>
                        )}
                        {canEditAlbum(album) && (
                            <button
                                className="edit-album-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingAlbum(album);
                                    setTitle(album.title);
                                    setDescription(album.description || "");
                                    setStartDate(album.start_date || "");
                                    setEndDate(album.end_date || "");
                                    setCoordinators((album.coordinators || []).map(id => String(id)));
                                    setCoverImage(null);
                                    setPreviewImage(album.cover_image || null);
                                }}
                            >
                                Edit
                            </button>
                        )}


                    </div>


                ))}
            </div>
        </div>
    );
}