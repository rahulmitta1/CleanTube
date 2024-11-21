function setLocalStorage(key, value) {
  try {
    // Ensure we're storing an object, not an array
    if (key.includes("Titles")) {
      localStorage.setItem(key, JSON.stringify(value || {}));
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch (error) {
    showNotification(
      "Storage limit exceeded. Please clear some items.",
      "warning"
    );
  }
}

function getLocalStorage(key, defaultValue = "[]") {
  const storedItem = localStorage.getItem(key);

  // For title keys, return an object, for other keys return an array
  if (key.includes("Titles")) {
    return storedItem ? JSON.parse(storedItem) : {};
  }

  return JSON.parse(storedItem || defaultValue);
}

// Advanced Notification System
function showNotification(message, type = "info", duration = 3000) {
  const container =
    document.getElementById("notification-container") ||
    createNotificationContainer();

  const notification = document.createElement("div");
  notification.className = `notification ${type}`;

  // Enhanced notification with icon
  const icons = {
    info: "ri-information-line",
    success: "ri-check-line",
    warning: "ri-warning-line",
    error: "ri-close-circle-line",
  };

  notification.innerHTML = `
      <i class="${icons[type] || icons.info}"></i>
      <span>${message}</span>
  `;

  container.appendChild(notification);

  // Auto-remove notification
  const fadeOut = () => {
    notification.classList.add("fade-out");
    setTimeout(() => notification.remove(), 500);
  };

  const timer = setTimeout(fadeOut, duration);

  // Allow dismissing notification by clicking
  notification.addEventListener("click", () => {
    clearTimeout(timer);
    fadeOut();
  });
}

function createNotificationContainer() {
  const container = document.createElement("div");
  container.id = "notification-container";
  document.body.appendChild(container);
  return container;
}

// Advanced URL Handling
class URLHandler {
  static extractVideoId(url) {
    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  }

  static extractPlaylistId(url) {
    const regExp = /[&?]list=([^#&?]*)/;
    const match = url.match(regExp);
    return match ? match[1] : null;
  }

  static validateYouTubeURL(url) {
    return this.extractVideoId(url) || this.extractPlaylistId(url);
  }

  static getThumbnailUrl(videoId) {
    return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
  }
}

// Content Management Class
class ContentManager {
  constructor() {
    try {
      // Ensure methods are bound correctly
      this.loadSavedItems = this.loadSavedItems.bind(this);
      this.renderItems = this.renderItems.bind(this);

      console.log("Loading saved items...");

      // Explicitly check if getLocalStorage is available
      if (typeof getLocalStorage !== "function") {
        throw new Error("getLocalStorage function is not defined");
      }

      // Use explicit method calls with error handling
      this.savedVideos = this.loadSavedItems("savedVideos");
      this.savedPlaylists = this.loadSavedItems("savedPlaylists");

      this.savedVideoTitles = this.loadSavedItems("savedVideoTitles") || {};
      this.savedPlaylistTitles =
        this.loadSavedItems("savedPlaylistTitles") || {};

      console.log("Saved Videos:", this.savedVideos);
      console.log("Saved Playlists:", this.savedPlaylists);

      // Render the items
      this.renderItems("savedVideos");
      this.renderItems("savedPlaylists");
    } catch (error) {
      console.error("Error in ContentManager constructor:", error);
      // Optionally, show a user-friendly notification
      showNotification(`Initialization error: ${error.message}`, "error");
    }
  }

  loadSavedItems(key) {
    try {
      console.log(`Loading items for key: ${key}`);
      return getLocalStorage(key);
    } catch (error) {
      console.error(`Error loading items for ${key}:`, error);
      return [];
    }
  }

  playItem(url, type) {
    const videoPlayer = document.getElementById("video-player");

    if (type === "savedVideos") {
      const videoId = URLHandler.extractVideoId(url);
      videoPlayer.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    } else {
      const playlistId = URLHandler.extractPlaylistId(url);
      videoPlayer.src = `https://www.youtube.com/embed/videoseries?list=${playlistId}&autoplay=1`;
    }

    showNotification(
      `Playing ${type === "savedVideos" ? "video" : "playlist"}!`,
      "success"
    );
  }

  loadSavedItems(key) {
    return getLocalStorage(key);
  }

  addItem(key, url, customTitle = null) {
    if (!URLHandler.validateYouTubeURL(url)) {
      showNotification("Invalid YouTube URL!", "error");
      return false;
    }

    const items = this.loadSavedItems(key);
    const titleKey =
      key === "savedVideos" ? "savedVideoTitles" : "savedPlaylistTitles";

    // Prevent duplicates
    if (!items.includes(url)) {
      items.push(url);

      // Save titles separately
      const titles = this.loadSavedItems(titleKey) || {};
      titles[url] = customTitle || this.getItemTitle(url);

      setLocalStorage(key, items);
      setLocalStorage(titleKey, titles);

      this.renderItems(key);
      showNotification(
        `${key === "savedVideos" ? "Video" : "Playlist"} added successfully!`,
        "success"
      );
      return true;
    }

    showNotification("Item already exists!", "warning");
    return false;
  }

  addVideo(url, title = null) {
    return this.addItem("savedVideos", url, title);
  }

  addPlaylist(url, title = null) {
    return this.addItem("savedPlaylists", url, title);
  }

  removeItem(key, index) {
    const items = this.loadSavedItems(key);
    const titleKey =
      key === "savedVideos" ? "savedVideoTitles" : "savedPlaylistTitles";
    const titles = this.loadSavedItems(titleKey) || {};
    const url = items[index];
    const title = titles[url] || this.getItemTitle(url);

    if (confirm(`Delete ${title}?`)) {
      items.splice(index, 1);
      delete titles[url];

      setLocalStorage(key, items);
      setLocalStorage(titleKey, titles);

      this.renderItems(key);
      showNotification("Item deleted successfully!", "success");
    }
  }

  renameItem(key, index) {
    const items = this.loadSavedItems(key);
    const titleKey =
      key === "savedVideos" ? "savedVideoTitles" : "savedPlaylistTitles";
    const titles = this.loadSavedItems(titleKey) || {};
    const currentUrl = items[index];
    const currentTitle = titles[currentUrl] || this.getItemTitle(currentUrl);

    // Create rename modal
    const modalHtml = `
        <div class="rename-modal" id="rename-modal">
            <div class="rename-modal-content">
                <h3>Rename ${key === "savedVideos" ? "Video" : "Playlist"}</h3>
                <input type="text" id="rename-input" value="${currentTitle}" placeholder="Enter new name">
                <div class="rename-modal-actions">
                    <button class="cancel-btn" id="cancel-rename">Cancel</button>
                    <button class="save-btn" id="save-rename">Save</button>
                </div>
            </div>
        </div>
    `;

    // Append modal to body
    const modalContainer = document.createElement("div");
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer);

    const modal = document.getElementById("rename-modal");
    const renameInput = document.getElementById("rename-input");
    const cancelBtn = document.getElementById("cancel-rename");
    const saveBtn = document.getElementById("save-rename");

    // Cancel button
    cancelBtn.addEventListener("click", () => {
      document.body.removeChild(modal.parentElement);
    });

    // Save button
    saveBtn.addEventListener("click", () => {
      const newTitle = renameInput.value.trim();

      if (newTitle && newTitle !== currentTitle) {
        // Retrieve the most current titles to avoid overwriting
        const currentTitles = this.loadSavedItems(titleKey) || {};

        // Update the title
        currentTitles[currentUrl] = newTitle;

        // Debug logging
        console.log(`Updating title for ${currentUrl}:`, {
          oldTitle: currentTitle,
          newTitle: newTitle,
          allTitles: currentTitles,
        });

        // Save to local storage
        setLocalStorage(titleKey, currentTitles);

        // Force re-render of the list
        this.renderItems(key);

        // Remove the modal
        document.body.removeChild(modal.parentElement);

        // Show success notification
        showNotification("Item renamed successfully!", "success");
      } else {
        showNotification("Invalid title!", "error");
      }
    });

    // Allow saving on Enter key
    renameInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        saveBtn.click();
      }
    });
  }

  reorderItem(key, index, direction) {
    const items = this.loadSavedItems(key);
    const titleKey =
      key === "savedVideos" ? "savedVideoTitles" : "savedPlaylistTitles";
    const titles = this.loadSavedItems(titleKey) || {};

    const url = items.splice(index, 1)[0];
    items.splice(index + direction, 0, url);

    setLocalStorage(key, items);
    this.renderItems(key);
  }

  getItemTitle(url) {
    const videoId = URLHandler.extractVideoId(url);
    const playlistId = URLHandler.extractPlaylistId(url);
    return videoId
      ? `Video: ${videoId}`
      : playlistId
      ? `Playlist: ${playlistId}`
      : "Unnamed Item";
  }

  renderItems(key) {
    const listId = key === "savedVideos" ? "saved-videos" : "playlist-list";
    const listElement = document.getElementById(listId);
    const items = this.loadSavedItems(key);
    const titleKey =
      key === "savedVideos" ? "savedVideoTitles" : "savedPlaylistTitles";
    const titles = this.loadSavedItems(titleKey) || {};

    // Debug logging to verify data
    console.log(`Rendering ${key}:`, {
      items: items,
      titles: titles,
    });

    // Clear existing list
    listElement.innerHTML = "";

    if (items.length === 0) {
      listElement.innerHTML = `
            <li class="empty-item">
                <i class="ri-video-add-line"></i>
                <p>No ${
                  key === "savedVideos" ? "videos" : "playlists"
                } saved</p>
            </li>
        `;
      return;
    }

    items.forEach((url, index) => {
      const itemElement = document.createElement("li");
      itemElement.className = "item";

      // Create thumbnail for video/playlist
      const videoId = URLHandler.extractVideoId(url);
      const thumbnailUrl = videoId ? URLHandler.getThumbnailUrl(videoId) : "";

      // Get the title (use custom title if exists, otherwise use default)
      const title = titles[url] || this.getItemTitle(url);
      console.log(`Rendering item: ${url}, Title: ${title}`);

      itemElement.innerHTML = `
            <div class="item-main">
              ${
                thumbnailUrl
                  ? `<img src="${thumbnailUrl}" alt="Thumbnail" class="item-thumbnail">`
                  : ""
              }
              <div class="item-content">
                  <span class="item-title">${title}</span>
              </div>
            </div>
            <div class="item-actions">
              <button class="play-btn" title="Play">
                  <i class="ri-play-fill"></i>
              </button>
              <button class="rename-btn" title="Rename">
                  <i class="ri-edit-line"></i>
              </button>
              <button class="delete-btn" title="Delete">
                  <i class="ri-delete-bin-line"></i>
              </button>
              <button class="move-up-btn" title="Move Up">
                  <i class="ri-arrow-up-line"></i>
              </button>
              <button class="move-down-btn" title="Move Down">
                  <i class="ri-arrow-down-line"></i>
              </button>
            </div>
        `;

      // Event Listeners (same as before)
      itemElement.querySelector(".play-btn").addEventListener("click", () => {
        this.playItem(url, key);
      });

      itemElement.querySelector(".rename-btn").addEventListener("click", () => {
        this.renameItem(key, index);
      });

      itemElement.querySelector(".delete-btn").addEventListener("click", () => {
        this.removeItem(key, index);
      });

      // Move Up Button
      const moveUpBtn = itemElement.querySelector(".move-up-btn");
      moveUpBtn.addEventListener("click", () => {
        if (index > 0) {
          this.reorderItem(key, index, -1);
        }
      });

      // Move Down Button
      const moveDownBtn = itemElement.querySelector(".move-down-btn");
      moveDownBtn.addEventListener("click", () => {
        const items = this.loadSavedItems(key);
        if (index < items.length - 1) {
          this.reorderItem(key, index, 1);
        }
      });

      listElement.appendChild(itemElement);
    });
  }

  clearItems(key) {
    if (
      confirm(
        `Are you sure you want to clear all ${
          key === "savedVideos" ? "videos" : "playlists"
        }?`
      )
    ) {
      const titleKey =
        key === "savedVideos" ? "savedVideoTitles" : "savedPlaylistTitles";
      setLocalStorage(key, []);
      setLocalStorage(titleKey, {});
      this.renderItems(key);
      showNotification(
        `All ${key === "savedVideos" ? "videos" : "playlists"} cleared!`,
        "success"
      );
    }
  }

  // Method to embed a video directly in the app
  embedItem(url, type) {
    const videoPlayer = document.getElementById("video-player");

    if (type === "savedVideos") {
      const videoId = URLHandler.extractVideoId(url);
      videoPlayer.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    } else {
      const playlistId = URLHandler.extractPlaylistId(url);
      videoPlayer.src = `https://www.youtube.com/embed/videoseries?list=${playlistId}&autoplay=1`;
    }

    showNotification(
      `Embedding ${type === "savedVideos" ? "video" : "playlist"}!`,
      "success"
    );
  }

  // Method to copy video/playlist URL
  copyItemUrl(url) {
    navigator.clipboard
      .writeText(url)
      .then(() => {
        showNotification("URL copied to clipboard!", "success");
      })
      .catch((err) => {
        showNotification("Failed to copy URL", "error");
      });
  }
}

// CleanTube Class
class CleanTube {
  constructor() {
    try {
      console.log("Initializing CleanTube...");

      // Ensure contentManager is created correctly
      this.contentManager = new ContentManager();

      console.log("Initializing event listeners...");
      this.initializeEventListeners();

      console.log("CleanTube initialized successfully");
    } catch (error) {
      console.error("Error initializing CleanTube:", error);
      showNotification(`Initialization error: ${error.message}`, "error");
    }
  }

  initializeEventListeners() {
    // Debug logging and error checking
    const elements = [
      { id: "url-input", name: "URL Input" },
      { id: "load-btn", name: "Load Button" },
      { id: "toggle-sidebar-btn", name: "Sidebar Toggle" },
      { id: "fullscreen-btn", name: "Fullscreen Button" },
      { id: "add-video-btn", name: "Add Video Button" },
      { id: "add-playlist-btn", name: "Add Playlist Button" },
      { id: "clear-videos-btn", name: "Clear Videos Button" },
    ];

    elements.forEach((el) => {
      const element = document.getElementById(el.id);
      if (!element) {
        console.error(`Element not found: ${el.name} (ID: ${el.id})`);
      }
    });
    // URL Loading
    const urlInput = document.getElementById("url-input");
    const loadButton = document.getElementById("load-btn");

    loadButton.addEventListener("click", () =>
      this.loadContent(urlInput.value)
    );
    urlInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") this.loadContent(urlInput.value);
    });

    // Sidebar Toggle
    document
      .getElementById("toggle-sidebar-btn")
      .addEventListener("click", this.toggleSidebar);

    // Fullscreen
    document
      .getElementById("fullscreen-btn")
      .addEventListener("click", this.toggleFullscreen);

    // Add Video
    document.getElementById("add-video-btn").addEventListener("click", () => {
      const videoUrl = prompt("Enter YouTube Video URL:");
      if (videoUrl) {
        const customTitle = prompt("Enter a custom title (optional):");
        this.contentManager.addVideo(videoUrl, customTitle);
      }
    });

    // Add Playlist
    document
      .getElementById("add-playlist-btn")
      .addEventListener("click", () => {
        const playlistUrl = prompt("Enter YouTube Playlist URL:");
        if (playlistUrl) {
          const customTitle = prompt("Enter a custom title (optional):");
          this.contentManager.addPlaylist(playlistUrl, customTitle);
        }
      });

    // Clear Videos
    document
      .getElementById("clear-videos-btn")
      .addEventListener("click", () =>
        this.contentManager.clearItems("savedVideos")
      );

    // Clear Playlists
    const clearPlaylistsBtn = document.getElementById("clear-playlists-btn");
    if (clearPlaylistsBtn) {
      clearPlaylistsBtn.addEventListener("click", () =>
        this.contentManager.clearItems("savedPlaylists")
      );
    }
  }

  loadContent(url) {
    const urlInput = document.getElementById("url-input");

    if (!url) {
      showNotification("Please enter a URL!", "warning");
      return;
    }

    const videoId = URLHandler.extractVideoId(url);
    const playlistId = URLHandler.extractPlaylistId(url);

    if (videoId) {
      this.contentManager.addItem("savedVideos", url);
      this.contentManager.playItem(url, "savedVideos");
    } else if (playlistId) {
      this.contentManager.addItem("savedPlaylists", url);
      this.contentManager.playItem(url, "savedPlaylists");
    } else {
      showNotification("Invalid YouTube URL!", "error");
    }

    // Clear input after loading
    urlInput.value = "";
  }

  toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    const appContainer = document.getElementById("app-container");

    sidebar.classList.toggle("hidden");
    appContainer.classList.toggle("focus-mode");
  }

  toggleFullscreen() {
    const videoContainer = document.getElementById("video-container");

    if (!document.fullscreenElement) {
      videoContainer.requestFullscreen().catch((err) => {
        showNotification(`Fullscreen error: ${err.message}`, "error");
      });
    } else {
      document.exitFullscreen();
    }
  }
}

// Initialize the app when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
  new CleanTube();
});
