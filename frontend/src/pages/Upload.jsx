import { useEffect, useState } from "react";
import api from "../services/api";
import "./Upload.css";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

function Upload() {
    const navigate = useNavigate();
    const [files, setFiles] = useState([]);
    const [previews, setPreviews] = useState([]);

    const [albums, setAlbums] = useState([]);
    const [album, setAlbum] = useState("");
    const [loading, setLoading] = useState(false);
    const [tags, setTags] = useState("");
    const [dragActive, setDragActive] = useState(false);
    const [users, setUsers] = useState([]);
    const [taggedUsers, setTaggedUsers] = useState([]);

    // photographer dashboard state
    const [stats, setStats] = useState({ total_uploads: 0, total_downloads: 0, total_favorites: 0 });
    const [myUploads, setMyUploads] = useState([]);
    const [loadingUploads, setLoadingUploads] = useState(false);
    const [nextPage, setNextPage] = useState(null);
    const [loadingMore, setLoadingMore] = useState(false);

    // Gallery modal state (for viewing uploaded photos)
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [comments, setComments] = useState([]);
    const [commentInput, setCommentInput] = useState("");
    const [isFavorite, setIsFavorite] = useState(false);
    const [tagInput, setTagInput] = useState("");
    const [selectedUser, setSelectedUser] = useState("");

    const fetchUsers = async () => {
        const res = await api.get("/accounts/users/");
        setUsers(res.data);
    };

    const fetchMyStats = async () => {
        try {
            const res = await api.get("/photos/my_stats/");
            setStats(res.data);
        } catch (err) {
            console.error("Failed to load my stats", err);
        }
    };

    const fetchMyUploads = async () => {
        try {
            setLoadingUploads(true);
            setMyUploads([]);
            setNextPage(null);
            const res = await api.get("/photos/my_uploads/");
            setNextPage(res.data.next);
            setMyUploads(res.data.results || res.data);
        } catch (err) {
            console.error("Failed to load my uploads", err);
        } finally {
            setLoadingUploads(false);
        }
    };

    const loadMoreUploads = async () => {
        if (!nextPage) return;
        try {
            setLoadingMore(true);
            const res = await api.get(nextPage);
            setMyUploads(prev => [...prev, ...res.data.results]);
            setNextPage(res.data.next);
        } catch (err) {
            console.error("Failed to load more uploads", err);
            alert("Failed to load more uploads");
        } finally {
            setLoadingMore(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        navigate("/login");
    };

    useEffect(() => {
        fetchUsers();
        fetchMyStats();
        fetchMyUploads();
    }, []);

    // Gallery modal logic - fetch photo detail and comments
    const fetchPhotoDetail = async (photoId) => {
        try {
            const res = await api.get(`/photos/${photoId}/`);
            setSelectedPhoto(res.data);
        } catch (err) {
            console.error("Failed to fetch photo detail", err);
        }
    };

    const fetchComments = async () => {
        try {
            const res = await api.get(
                `/photos/${selectedPhoto.photo_id}/comments/`
            );
            setComments(res.data);
        } catch (err) {
            console.error("Failed to load comments", err);
        }
    };

    useEffect(() => {
        if (!selectedPhoto) return;
        fetchComments();
    }, [selectedPhoto]);

    const handleAddComment = async () => {
        if (!commentInput.trim()) return;

        try {
            await api.post(
                `/photos/${selectedPhoto.photo_id}/comments/`,
                { content: commentInput }
            );

            setCommentInput("");
            fetchComments();

        } catch (err) {
            console.error("Failed to post comment", err);
            alert("Failed to add comment");
        }
    };

    useEffect(() => {
        if (!selectedPhoto) return;
        setIsFavorite(selectedPhoto.is_favorite);
    }, [selectedPhoto]);

    const handleFavorite = async () => {
        try {
            await api.post(`/photos/${selectedPhoto.photo_id}/favorite/`);
            setIsFavorite(true);
        } catch (err) {
            console.error(err);
        }
    };

    const handleUnfavorite = async () => {
        try {
            await api.post(`/photos/${selectedPhoto.photo_id}/unfavorite/`);
            setIsFavorite(false);
        } catch (err) {
            console.error(err);
        }
    };

    // ADD TAG ON ENTER
    const handleTagKeyDown = async (e) => {
        if (e.key !== "Enter") return;

        e.preventDefault();
        if (!tagInput.trim()) return;

        const tags = tagInput
            .split(",")
            .map(t => t.trim())
            .filter(Boolean);

        for (let name of tags) {
            await api.post(
                `/photos/${selectedPhoto.photo_id}/add_tag/`,
                { tag: name }
            );
        }

        const res = await api.get(`/photos/${selectedPhoto.photo_id}/`);
        setSelectedPhoto(res.data);
        setTagInput("");
        fetchMyUploads();
    };

    const removeTag = async (name) => {
        await api.post(
            `/photos/${selectedPhoto.photo_id}/remove_tag/`,
            { tag: name }
        );

        const res = await api.get(`/photos/${selectedPhoto.photo_id}/`);
        setSelectedPhoto(res.data);
        fetchMyUploads();
    };

    //handle add user tag
    const addUserTag = async () => {
        if (!selectedUser) return;

        await api.post(
            `/photos/${selectedPhoto.photo_id}/add_user_tag/`,
            { user_id: selectedUser }
        );

        const res = await api.get(`/photos/${selectedPhoto.photo_id}/`);
        setSelectedPhoto(res.data);
        setSelectedUser("");
    };

    //handle remove tag
    const removeUserTag = async (userId) => {
        await api.post(
            `/photos/${selectedPhoto.photo_id}/remove_user_tag/`,
            { user_id: userId }
        );

        const res = await api.get(`/photos/${selectedPhoto.photo_id}/`);
        setSelectedPhoto(res.data);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const droppedFiles = Array.from(e.dataTransfer.files);
        if (droppedFiles.length === 0) return;

        setFiles(droppedFiles);
        setPreviews(droppedFiles.map(file => URL.createObjectURL(file)));
    };

    // fetch albums
    useEffect(() => {
        const fetchAlbums = async () => {
            try {
                const res = await api.get("/albums/");
                setAlbums(res.data);
            } catch {
                alert("Failed to load albums");
            }
        };

        fetchAlbums();
    }, []);

    const handleFileChange = (e) => {
        const selectedFiles = Array.from(e.target.files);
        setFiles(selectedFiles);
        setPreviews(selectedFiles.map(file => URL.createObjectURL(file)));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (files.length === 0) return alert("Select at least one file");
        if (!album) return alert("Select an album");

        try {
            setLoading(true);

            const formData = new FormData();
            files.forEach(file => formData.append("photos", file));
            formData.append("album", album);

            // 1️⃣ Batch upload
            const res = await api.post("/photos/batch_upload/", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            const photoIds = res.data.photo_ids;

            // 2️⃣ Add tags to EACH uploaded photo
            const tagList = tags
                .split(",")
                .map(t => t.trim())
                .filter(Boolean);

            for (let photoId of photoIds) {
                for (let tag of tagList) {
                    await api.post(`/photos/${photoId}/add_tag/`, { tag });
                }
            }
            for (let photoId of photoIds) {
                for (let userId of taggedUsers) {
                    await api.post(
                        `/photos/${photoId}/add_user_tag/`,
                        { user_id: userId }
                    );
                }
            }

            alert("Batch upload started!");
            setFiles([]);
            setPreviews([]);
            setTags("");
            setTaggedUsers([]);
            fetchMyUploads();
            fetchMyStats();

        } catch (err) {
            console.error(err);
            alert("Batch upload failed");
        } finally {
            setLoading(false);
        }
    };



    return (
        <>
            {/* NAVBAR */}
            <Navbar active="upload" />

            <div className="upload-container">
                {/* DASHBOARD CARDS */}
                <div className="dashboard-cards">
                    <div className="card">
                        <div className="card-title">Total Uploads</div>
                        <div className="card-value">{stats.total_uploads}</div>
                    </div>
                    <div className="card">
                        <div className="card-title">Total Downloads</div>
                        <div className="card-value">{stats.total_downloads}</div>
                    </div>
                    <div className="card">
                        <div className="card-title">Total Favorites</div>
                        <div className="card-value">{stats.total_favorites}</div>
                    </div>
                </div>

                {/* HORIZONTAL LAYOUT: Form (Left) + Uploads Grid (Right) */}
                <div className="upload-wrapper">
                    {/* UPLOAD FORM (LEFT COLUMN) */}
                    <form onSubmit={handleSubmit} className="upload-form" style={{ flex: "0 0 350px" }}>
                        <h2>Upload Photos</h2>

                        <div
                            className={`drop-zone ${dragActive ? "active" : ""}`}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                        >
                            <p>Drag & drop files here or click to select</p>
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleFileChange}
                                className="file-input"
                            />
                        </div>

                        {previews.length > 0 && (
                            <div className="preview-grid">
                                {previews.map((src, i) => (
                                    <img key={i} src={src} className="preview" alt="preview" />
                                ))}
                            </div>
                        )}

                        <select 
                            value={album} 
                            onChange={(e) => setAlbum(e.target.value)}
                            className="form-select"
                        >
                            <option value="">Select album</option>
                            {albums.map((a) => (
                                <option key={a.album_id} value={a.album_id}>
                                    {a.title}
                                </option>
                            ))}
                        </select>

                        <select
                            multiple
                            value={taggedUsers}
                            onChange={(e) =>
                                setTaggedUsers(
                                    Array.from(e.target.selectedOptions, o => o.value)
                                )
                            }
                            className="form-select"
                        >
                            {users.map((u) => (
                                <option key={u.id} value={u.id}>
                                    {u.email}
                                </option>
                            ))}
                        </select>

                        <input
                            type="text"
                            placeholder="Tags (comma separated)"
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                            className="form-input"
                        />

                        <button 
                            type="submit"
                            disabled={loading || previews.length === 0}
                            className="btn-primary"
                        >
                            {loading ? "Uploading..." : "Upload Photos"}
                        </button>
                    </form>

                    {/* MY UPLOADS GRID (RIGHT COLUMN) */}
                    <div className="my-uploads-section" style={{ flex: "1" }}>
                        <h2>My Uploads</h2>
                        {loadingUploads ? (
                            <p>Loading uploads...</p>
                        ) : myUploads.length === 0 ? (
                            <p>No uploads yet</p>
                        ) : (
                            <>
                                <div className="upload-grid">
                                    {myUploads.map((p) => (
                                        <div 
                                            key={p.photo_id} 
                                            className="upload-card"
                                            onClick={() => fetchPhotoDetail(p.photo_id)}
                                            style={{ cursor: "pointer" }}
                                        >
                                            <img 
                                                loading="lazy" 
                                                src={p.thumbnail_img || "/placeholder.jpg"} 
                                                alt="thumb" 
                                                className="upload-thumb"
                                            />
                                            
                                        </div>
                                    ))}
                                </div>

                                {nextPage && (
                                    <div className="load-more-container">
                                        <button
                                            className="load-more-btn"
                                            onClick={loadMoreUploads}
                                            disabled={loadingMore}
                                        >
                                            {loadingMore ? "Loading..." : "Load more"}
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* MODAL */}
            {selectedPhoto && (
                <div
                    className="modal-overlay"
                    onClick={() => setSelectedPhoto(null)}
                >
                    <div
                        className="modal-content"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="modal-body">

                            <img
                                src={selectedPhoto.original_img}
                                className="modal-image"
                                alt=""
                            />

                            {/* FAV */}
                            <button
                                className="favorite-btn"
                                onClick={isFavorite ? handleUnfavorite : handleFavorite}
                            >
                                {isFavorite ? "★ Favorited" : "☆ Add to Favorites"}
                            </button>
                            {/* TAGS */}

                            <div className="tags">
                                {selectedPhoto.tags?.map(tag => (
                                    <span key={tag.id} className="tag">
                                        {tag.name}
                                        <button onClick={() => removeTag(tag.name)}>×</button>
                                    </span>
                                ))}
                            </div>

                            {/* {TAGGED USERS} */}
                            {/* TAGGED USERS */}
                            {selectedPhoto.users_tagged.map((u) => (
                                <span key={u.id} className="tag">
                                    {u.email}
                                    <button onClick={() => removeUserTag(u.id)}>×</button>
                                </span>
                            ))}

                            <select
                                value={selectedUser}
                                onChange={(e) => setSelectedUser(e.target.value)}
                            >
                                <option value="">Tag a user</option>
                                {users.map((u) => (
                                    <option key={u.id} value={u.id}>
                                        {u.email}
                                    </option>
                                ))}
                            </select>

                            <button onClick={addUserTag}>Add</button>

                            {/* COMMENTS */}
                            <div className="comments-section">
                                <h4>Comments</h4>

                                <div className="comments-list">
                                    {comments.length === 0 && (
                                        <p className="no-comments">No comments yet</p>
                                    )}

                                    {comments.map((comment) => (
                                        <div key={comment.id} className="comment">
                                            <strong>{comment.user}</strong>
                                            <p>{comment.content}</p>
                                            <span className="comment-time">
                                                {new Date(comment.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* tags INPUT (ENTER ONLY) */}
                            <input
                                className="tag-input"
                                placeholder="Add tag and press Enter"
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={handleTagKeyDown}
                                autoFocus
                            />
                            {/* Comments INPUT (ENTER ONLY) */}
                            <div className="comment-input">
                                <input
                                    type="text"
                                    placeholder="Add a comment..."
                                    value={commentInput}
                                    onChange={(e) => setCommentInput(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                                />
                            </div>
                            <button
                                onClick={() =>
                                    window.location.href =
                                    `http://127.0.0.1:8000/api/photos/${selectedPhoto.photo_id}/download/`
                                }
                            >
                                Download
                            </button>

                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default Upload;
