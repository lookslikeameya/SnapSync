import { useEffect, useState } from "react";
import api from "../services/api";
import "./Gallery.css";
import { Drawer, Stack, Button, Box } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function Gallery() {
  const [photos, setPhotos] = useState([]);
  const [nextPage, setNextPage] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [tagInput, setTagInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  //comments
  const [comments, setComments] = useState([]);
  const [commentInput, setCommentInput] = useState("");
  //favorite
  const [isFavorite, setIsFavorite] = useState(false);
  //tagged users
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  //search tags and albums..
  const [taggedUser, setTaggedUser] = useState("");
  const [searchTag, setSearchTag] = useState("");
  const [albums, setAlbums] = useState([]);
  const [album, setAlbum] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
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
    if (location.state?.album) {
      setAlbum(location.state.album);

      setView("photos");
    }
  }, [location.state]);

  // fetch albums
  useEffect(() => {
    const fetchAlbums = async () => {
      try {
        const res = await api.get("/albums/");
        console.log("ALBUM RESPONSE:", res.data);

        setAlbums(res.data);
      } catch {
        alert("Failed to load albums");
      }
    };

    fetchAlbums();
  }, []);
  //views..for gallery (photos,albums,favorites,tagged)
  const [view, setView] = useState("photos");
  const getEndpoint = () => {
    if (view === "favorites") return "/photos/favorites/";
    if (view === "tagged") return "/photos/tagged/";
    // if (view === "albums") return "/albums/";
    return "/photos/";
  };

  const fetchPhotos = async () => {
    setLoading(true);
    setPhotos([]);
    setNextPage(null);

    let url = getEndpoint();
    if (view != "albums") {
      const params = [];
      if (searchTag) params.push(`tag=${searchTag}`);
      if (taggedUser) params.push(`tagged_user=${taggedUser}`);
      if (album) params.push(`album=${album}`);

      if (params.length) url += `?${params.join("&")}`;

      console.log(album);
      console.log(view);
    }



    try {
      const res = await api.get(url);
      // console.log(res.data.next)
      setNextPage(res.data.next);
      // console.log(nextPage);
      setPhotos(res.data.results);
      console.log(res.data.results);
    } catch {
      alert("Failed to load photos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (view !== "albums") {
      fetchPhotos();
    }
    fetchRole();

  }, [view, album]);


  //load-more logic
  const loadMorePhotos = async () => {
    if (!nextPage) return;

    try {
      setLoadingMore(true);
      const res = await api.get(nextPage);
      setPhotos(prev => [...prev, ...res.data.results]);
      setNextPage(res.data.next);
    } catch {
      alert("Failed to load more photos");
    } finally {
      setLoadingMore(false);
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
    // fetchPhotos();
  };

  const removeTag = async (name) => {
    await api.post(
      `/photos/${selectedPhoto.photo_id}/remove_tag/`,
      { tag: name }
    );

    const res = await api.get(`/photos/${selectedPhoto.photo_id}/`);
    setSelectedPhoto(res.data);
    // fetchPhotos();
  };

  //load comments function
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

  const handleLogout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    navigate("/login");
  };

  useEffect(() => {
    if (!selectedPhoto) return;



    fetchComments();
  }, [selectedPhoto]);
  //submit comment
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
  //fetch isfavorite
  useEffect(() => {
    if (!selectedPhoto) return;

    // TEMP logic: infer favorite state from backend later
    setIsFavorite(selectedPhoto.is_favorite);
  }, [selectedPhoto]);
  //handle favorite and un favorite
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
  //fetch users
  const fetchUsers = async () => {
    const res = await api.get("/accounts/users/");
    // console.log(res.data);
    setUsers(res.data);
  };
  useEffect(() => {

    fetchUsers();

  }, []);



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











  if (loading) return <p className="loading">Loading...</p>;

  return (
    <div className="gallery-container">
      {/* NAVBAR */}
      <Navbar active="gallery" />
      {/* SIDEBAR */}
      <Drawer
        variant="permanent"
        sx={{
          width: 200,
          [`& .MuiDrawer-paper`]: {
            width: 200,
            background: "#0f171e",
            color: "#f1f5f9",
            borderRight: "1px solid #1e293b",
            marginTop: "70px",
          },
        }}
      >
        <Stack spacing={2} sx={{ p: 2 }}>
          <Button onClick={() => {
            setView("photos");
            setAlbum("");
            setSearchTag("");
            setTaggedUser("");
          }}>Photos</Button>

          <Button onClick={() => {
            setView("albums");
            setAlbum("");
            setSearchTag("");
            setTaggedUser("");
          }}>Albums</Button>

          <Button onClick={() => {
            setView("favorites");
            setAlbum("");
            setSearchTag("");
            setTaggedUser("");
          }}>Favorites</Button>

          <Button onClick={() => {
            setView("tagged");
            setAlbum("");
            setSearchTag("");
            setTaggedUser("");
          }}>Tagged-in</Button>
        </Stack>
      </Drawer>

      {/* ================= MAIN CONTENT ================= */}
      <Box
        sx={{
          marginLeft: "200px",        // OFFSET FOR DRAWER
          marginTop: "70px",          // OFFSET FOR NAVBAR
          padding: "24px",
          minHeight: "100vh",
          overflowY: "auto",
        }}
      >

        {/* ALBUM VIEW */}
        {view === "albums" && (
          navigate("/albums")
        )}

        {/* PHOTO VIEW */}
        {view !== "albums" && (
          <>
            {/* ALBUM DETAILS SECTION */}
            <div className="album-details-section">
              {album ? (
                (() => {
                  const selectedAlbum = albums.find(a => a.album_id == album);
                  return selectedAlbum ? (
                    <div className="album-detail-card">
                      {selectedAlbum.cover_image && (
                        <img
                          src={selectedAlbum.cover_image}
                          alt={selectedAlbum.title}
                          className="album-detail-cover"
                        />
                      )}
                      <div className="album-detail-info">
                        <h1>{selectedAlbum.title}</h1>
                        {selectedAlbum.description && (
                          <p className="album-detail-description">{selectedAlbum.description}</p>
                        )}

                        <span className="album-detail-date">
                          {new Date(selectedAlbum.start_date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>

                        <div style={{ marginTop: '15px' }}>
                          <button
                            className="load-more-btn"
                            onClick={() => window.location.href = `http://127.0.0.1:8000/api/albums/${selectedAlbum.album_id}/download_all/`}
                            title="Download all photos in this album as ZIP"
                          >
                            Download Album (ZIP)
                          </button>
                        </div>

                        {/* <button 
                          className="change-album-btn"
                          onClick={() => setAlbum("")}
                        >
                          View All Photos
                        </button> */}
                      </div>
                    </div>
                  ) : null;
                })()
              ) : (
                <div className="album-detail-card all-photos">
                  <div className="album-detail-info">
                    <h1>All Photos</h1>
                    <p>Browse all photos across all albums</p>
                  </div>
                </div>
              )}
            </div>

            {/* ALBUM SELECTOR DROPDOWN
            <div className="gallery-search">
              <select value={album} onChange={(e) => setAlbum(e.target.value)} className="album-select">
                <option value="">All Photos</option>
                {albums.map((a) => (
                  <option key={a.album_id} value={a.album_id}>
                    {a.title}
                  </option>
                ))}
              </select>
            </div> */}

            <div className="gallery-search">
              <input
                className="search-input"
                placeholder="Search by tag"
                value={searchTag}
                onChange={(e) => setSearchTag(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchPhotos()}
              />
            </div>

            <div className="gallery-search">
              <input
                placeholder="Search by tagged user email"
                value={taggedUser}
                onChange={(e) => setTaggedUser(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchPhotos()}
              />
            </div>

            <div className="gallery-grid">
              {photos.map(photo => (
                <div
                  key={photo.photo_id}
                  className="gallery-card"
                  onClick={async () => {
                    const res = await api.get(`/photos/${photo.photo_id}/`);
                    setSelectedPhoto(res.data);
                  }}
                >
                  <img
                    src={photo.thumbnail_img || photo.original_img}
                    className="gallery-img"
                    alt=""
                  />
                </div>
              ))}
            </div>

            {nextPage && (
              <div className="load-more-container">
                <button
                  className="load-more-btn"
                  onClick={loadMorePhotos}
                  disabled={loadingMore}
                >
                  {loadingMore ? "Loading..." : "Load more"}
                </button>
              </div>
            )}
          </>
        )}
      </Box>



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
              {/* LEFT - Image */}
              <div className="modal-left">
                <img
                  src={selectedPhoto.original_img}
                  className="modal-image"
                  alt=""
                />
              </div>

              {/* RIGHT - All Controls */}
              <div className="modal-right">
                {/* Top Actions */}
                <div className="modal-top-actions">
                  <button
                    className={`action-btn favorite-btn ${isFavorite ? 'active' : ''}`}
                    onClick={isFavorite ? handleUnfavorite : handleFavorite}
                    title={isFavorite ? "Remove from favorites" : "Add to favorites"}
                  >
                    {isFavorite ? "♥" : "♡"}
                  </button>




                  <button
                    className="action-btn download-btn"
                    onClick={() =>
                      window.location.href =
                      `http://127.0.0.1:8000/api/photos/${selectedPhoto.photo_id}/download/`
                    }
                    title="Download"
                  >
                    ⬇
                  </button>


                </div>

                {/* Scrollable Content */}
                <div className="modal-scroll-content">


                  {/* TAGGED USERS SECTION */}
                  <div className="modal-section">
                    <h4>Tagged users</h4>
                    <div className="tags">
                      {selectedPhoto.users_tagged?.length > 0 ? (
                        selectedPhoto.users_tagged.map((u) => (
                          <span key={u.id} className="tag">
                            {u.email}
                            <button onClick={() => removeUserTag(u.id)}>×</button>
                          </span>
                        ))
                      ) : (
                        <p className="no-tags">No users tagged</p>
                      )}
                    </div>
                  </div>
                  {(IsAdmin || IsPhotographer) && (
                    /* TAG SOMEONE SECTION */
                    < div className="modal-section">
                      <h4>Tag someone</h4>
                      <select
                        className="modal-select"
                        value={selectedUser}
                        onChange={(e) => setSelectedUser(e.target.value)}
                      >
                        <option value="">enter email address</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.email}
                          </option>
                        ))}
                      </select>
                      <button
                        className="modal-tag-btn"
                        onClick={addUserTag}
                        disabled={!selectedUser}
                      >
                        Tag
                      </button>
                    </div>
                  )}
                  {/* TAGS SECTION */}
                  <div className="modal-section">
                    <h4>Tags</h4>
                    <div className="tags">
                      {selectedPhoto.tags?.length > 0 ? (
                        selectedPhoto.tags.map(tag => (

                          <span key={tag.id} className="tag">
                            {tag.name}
                            {(IsAdmin || IsPhotographer) && (
                              <button onClick={() => removeTag(tag.name)}>×</button>)}
                          </span>

                        ))
                      ) : (
                        <p className="no-tags">No tags</p>
                      )}
                    </div>
                    {(IsAdmin || IsPhotographer) && (
                      <input
                        className="modal-tag-input"
                        placeholder="Add tag and press Enter"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={handleTagKeyDown}
                      />)}
                  </div>

                  {/* METADATA SECTION */}
                  {selectedPhoto.metadata && Object.keys(selectedPhoto.metadata).length > 0 && typeof selectedPhoto.metadata === 'object' && (
                    <div className="modal-section">
                      <h4>Photo Details</h4>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "14px", color: "#ddd" }}>
                        {Object.entries(selectedPhoto.metadata).slice(0, 10).map(([key, value]) => (
                          <div key={key}>
                            <span style={{ fontWeight: "bold", color: "#aaa" }}>{key}: </span>
                            <span>{value?.toString()?.substring(0, 30)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* COMMENTS SECTION */}
                  <div className="modal-section">
                    <h4>Comments</h4>
                    <div className="comments-list">
                      {comments.length === 0 ? (
                        <p className="no-comments">No comments yet</p>
                      ) : (
                        comments.map((comment) => (
                          <div key={comment.id} className="comment">
                            <strong>{comment.user}</strong>
                            <p>{comment.content}</p>
                            <span className="comment-time">
                              {new Date(comment.created_at).toLocaleString()}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="comment-input-group">
                      <input
                        type="text"
                        className="modal-comment-input"
                        placeholder="Add a comment"
                        value={commentInput}
                        onChange={(e) => setCommentInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                      />
                      <button
                        className="modal-send-btn"
                        onClick={handleAddComment}
                      >
                        Send
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}