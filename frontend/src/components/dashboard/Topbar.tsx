import React, { useEffect, useState, useRef } from "react";
import './TopbarProfileCard.css';

interface TopbarProps {
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onSearchDestination?: (placeId: string, description: string) => void;
  onLogoClick?: () => void;
  userName: string;
}


const Topbar: React.FC<TopbarProps> = ({
  isDarkMode,
  onToggleTheme,
  onSearchDestination,
  onLogoClick,
  userName,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [user, setUser] = useState<{ name?: string; email?: string; picture?: string } | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  // Close profile card on outside click
  const profileRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!showProfile) return;
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfile(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showProfile]);

  // Fetch user info from /api/user/me
  useEffect(() => {
    fetch("/api/user/me", { credentials: "include" })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data) {
          setUser({
            name: data.name || data.given_name || data.email || "Guest",
            email: data.email,
            picture: data.picture || data.avatar_url || data.avatar,
          });
        } else {
          setUser(null);
        }
      })
      .catch(() => setUser(null));
  }, []);

  // 🔥 Refs for autoscrolling
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // 🔥 Autoscroll effect: triggers when keyboard selection changes
  useEffect(() => {
    if (selectedIndex >= 0 && itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [selectedIndex]);

  const displayName = (user?.name || "Guest").trim();
  const initials =
    displayName
      .split(" ")
      .filter(Boolean)
      .map((p) => p[0]?.toUpperCase())
      .join("")
      .slice(0, 2) || "GU";

  // 🔥 Autocomplete logic
  useEffect(() => {
    console.log("Google object:", window.google);
    console.log("Places available:", window.google?.maps?.places);

    if (!searchQuery || !window.google?.maps?.places) {
      setSuggestions([]);
      setSelectedIndex(-1);
      return;
    }

    const service = new window.google.maps.places.AutocompleteService();

    service.getPlacePredictions(
      {
        input: searchQuery,
        componentRestrictions: { country: "in" },
      },
      (predictions, status) => {
        console.log("Predictions:", predictions);
        console.log("Status:", status);
        setSuggestions(predictions || []);
        setSelectedIndex(-1);
        // Clear old refs when new suggestions arrive
        itemRefs.current = [];
      }
    );
  }, [searchQuery]);

  const handleSelect = (
    prediction: google.maps.places.AutocompletePrediction
  ) => {
    // Clear search query to prevent refetching suggestions & show clean input after selection
    setSearchQuery('');
    setSuggestions([]);
    setSelectedIndex(-1);

    if (onSearchDestination) {
      onSearchDestination(prediction.place_id, prediction.description);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSelect(suggestions[selectedIndex]);
        }
        break;
      case "Escape":
        setSuggestions([]);
        setSelectedIndex(-1);
        break;
    }
  };

  return (
    <header className="dashboard-topbar">
      <div className="dashboard-topbar-left" onClick={onLogoClick} style={{ cursor: 'pointer' }}>
        <div className="dashboard-logo-mark">🍃</div>
        <div className="dashboard-logo-text">
          <span className="brand">EcoRoute</span>
          <span className="badge">ai</span>
        </div>
      </div>

      <div className="dashboard-topbar-search" style={{ position: "relative" }}>
        <input
          type="text"
          placeholder="Search for a cleaner destination"
          className="dashboard-search-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />

        {suggestions.length > 0 && (
          <div
            ref={scrollContainerRef} // Attached ref for the container
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              background: isDarkMode ? "#1a4d2e" : "white",
              borderRadius: "8px",
              boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
              zIndex: 1000,
              maxHeight: "250px",
              overflowY: "auto",
            }}
          >
            {suggestions.map((place, index) => (
              <div
                key={place.place_id}
                ref={(el) => (itemRefs.current[index] = el)} // Added individual item refs
                onClick={() => handleSelect(place)}
                style={{
                  padding: "10px 14px",
                  cursor: "pointer",
                  backgroundColor:
                    selectedIndex === index
                      ? (isDarkMode ? "#2d6a4f" : "#f0f0f0")
                      : (isDarkMode ? "#1a4d2e" : "white"),
                  color: isDarkMode ? "#e8f5e9" : "#000",
                  transition: "background-color 0.2s",
                }}
                onMouseEnter={() => setSelectedIndex(index)}
                onMouseLeave={() => setSelectedIndex(-1)}
              >
                {place.description}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="dashboard-topbar-right">
        {/* <button type="button" className="icon-pill">🔔</button> */}
        <button
          type="button"
          className="icon-pill"
          onClick={onToggleTheme}
        >
          {isDarkMode ? "☀️" : "🌙"}
        </button>
        <div className="dashboard-avatar" style={{ position: 'relative' }}>
          <button
            type="button"
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            onClick={() => setShowProfile((v) => !v)}
            aria-label="Show profile"
          >
            {user?.picture ? (
              <img
                src={user.picture}
                alt={displayName}
                style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }}
              />
            ) : (
              <span>{initials}</span>
            )}
          </button>
          {showProfile && (
            <div
              ref={profileRef}
              className="profile-card-anim"
              style={{
                position: 'absolute',
                top: 40,
                right: 0,
                minWidth: 220,
                background: isDarkMode ? '#1a4d2e' : '#fff',
                color: isDarkMode ? '#e8f5e9' : '#222',
                borderRadius: 12,
                boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                padding: 20,
                zIndex: 2000,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                animation: 'profileCardFadeIn 0.22s cubic-bezier(.4,1.4,.6,1)'
              }}
            >
              {user?.picture ? (
                <div style={{
                  padding: 3,
                  borderRadius: '50%',
                  background: isDarkMode ? '#174c36' : '#f0f0f0',
                  marginBottom: 12,
                  boxShadow: '0 6px 32px 0 rgba(0,0,0,0.38), 0 2px 12px 0 rgba(0,0,0,0.22)'
                }}>
                  <img
                    src={user.picture}
                    alt={displayName}
                    style={{ width: 92, height: 92, borderRadius: '50%', objectFit: 'cover', display: 'block' }}
                  />
                </div>
              ) : (
                <div style={{ width: 92, height: 92, borderRadius: '50%', background: '#b7e4c7', color: '#222', fontSize: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                  {initials}
                </div>
              )}
              <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 4 }}>{displayName}</div>
              <div style={{ fontSize: 12, color: isDarkMode ? '#b7e4c7' : '#555', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center', maxWidth: 180 }}>{user?.email}</div>
            </div>
          )}
        </div>
        <span className="dashboard-username">{displayName}</span>
      </div>
    </header>
  );
};

export default Topbar;