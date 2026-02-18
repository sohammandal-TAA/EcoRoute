import React, { useEffect, useState } from "react";

interface TopbarProps {
  isDarkMode: boolean;
  onToggleTheme: () => void;
  userName?: string;

  // 🔥 Now we send placeId instead of plain string
  onSearchDestination?: (placeId: string, description: string) => void;
}

const Topbar: React.FC<TopbarProps> = ({
  isDarkMode,
  onToggleTheme,
  userName,
  onSearchDestination,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<
    google.maps.places.AutocompletePrediction[]
  >([]);

  const displayName = (userName || "Guest").trim();
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
      }
    );
  }, [searchQuery]);

  const handleSelect = (
    prediction: google.maps.places.AutocompletePrediction
  ) => {
    setSearchQuery(prediction.description);
    setSuggestions([]);

    if (onSearchDestination) {
      onSearchDestination(prediction.place_id, prediction.description);
    }
  };

  return (
    <header className="dashboard-topbar">
      <div className="dashboard-topbar-left">
        <div className="dashboard-logo-mark">🌿</div>
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
        />

        {suggestions.length > 0 && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              background: "white",
              borderRadius: "8px",
              boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
              zIndex: 1000,
              maxHeight: "250px",
              overflowY: "auto",
            }}
          >
            {suggestions.map((place) => (
              <div
                key={place.place_id}
                onClick={() => handleSelect(place)}
                style={{
                  padding: "10px 14px",
                  cursor: "pointer",
                }}
              >
                {place.description}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="dashboard-topbar-right">
        <button type="button" className="icon-pill">🔔</button>
        <button
          type="button"
          className="icon-pill"
          onClick={onToggleTheme}
        >
          {isDarkMode ? "☀️" : "🌙"}
        </button>
        <div className="dashboard-avatar">
          <span>{initials}</span>
        </div>
        <span className="dashboard-username">{displayName}</span>
      </div>
    </header>
  );
};

export default Topbar;
