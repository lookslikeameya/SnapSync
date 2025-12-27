import { useEffect, useState } from "react";
import api from "../services/api";
import "./Gallery.css";

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

  const fetchPhotos = async () => {
    try {
      const res = await api.get("/photos/");
      // console.log(res.data.next)
      setNextPage(res.data.next);
      console.log(nextPage);
      setPhotos(res.data.results);
    } catch {
      alert("Failed to load photos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhotos();
  }, []);


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
    fetchPhotos();
  };

  const removeTag = async (name) => {
    await api.post(
      `/photos/${selectedPhoto.photo_id}/remove_tag/`,
      { tag: name }
    );

    const res = await api.get(`/photos/${selectedPhoto.photo_id}/`);
    setSelectedPhoto(res.data);
    fetchPhotos();
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
    } finally {
      setCommentLoading(false);
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








  if (loading) return <p className="loading">Loading...</p>;

  return (
    <div className="gallery-container">

      {/* GRID */}
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
              src={photo.thumbnail_img}
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
            <img
              src={selectedPhoto.watermark_img}
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



          </div>
        </div>
      )}
    </div>
  );
}
