import React, { useEffect, useState, useRef } from "react"; // Added useRef

interface TopbarProps {
  isDarkMode: boolean;
  onToggleTheme: () => void;
  userName?: string;

  // 🔥 Now we send placeId instead of plain string
  onSearchDestination?: (placeId: string, description: string) => void;
  onLogoClick?: () => void;
}

const Topbar: React.FC<TopbarProps> = ({
  isDarkMode,
  onToggleTheme,
  userName,
  onSearchDestination,
  onLogoClick,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<
    google.maps.places.AutocompletePrediction[]
  >([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);

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