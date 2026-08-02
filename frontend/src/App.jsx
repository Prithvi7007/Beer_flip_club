import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_URL = "http://127.0.0.1:8000/api";
const PLAYER_COLORS = ["purple", "yellow", "orange", "white"];

function boardPosition(value) {
  return 4 + value * 92;
}

function prettyIndustry(value) {
  return value
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function industryAbbreviation(value) {
  const abbreviations = {
    coal_mine: "C",
    iron_works: "I",
    brewery: "B",
    manufacturer: "M",
    cotton_mill: "CT",
    pottery: "P",
  };

  return abbreviations[value] ?? "?";
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    ...options,
  });

  if (response.status === 204) {
    return null;
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail ?? `Request failed: ${response.status}`);
  }

  return data;
}

export default function App() {
  const [boardData, setBoardData] = useState({
    locations: [],
    merchants: [],
    routes: [],
  });

  const [game, setGame] = useState({
    era: "canal",
    routes: {},
    industries: {},
    players: [],
  });

  const [selected, setSelected] = useState(null);
  const [selectedSpaceId, setSelectedSpaceId] = useState(null);

  const [industryDraft, setIndustryDraft] = useState({
    owner: "purple",
    industry: "",
    level: 1,
    flipped: false,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadInitialData() {
      try {
        const [loadedBoard, loadedGame] = await Promise.all([
          apiRequest("/board"),
          apiRequest("/game"),
        ]);

        setBoardData(loadedBoard);
        setGame(loadedGame);
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setLoading(false);
      }
    }

    loadInitialData();
  }, []);

  const endpoints = useMemo(() => {
    const result = {};

    for (const location of boardData.locations) {
      result[location.id] = location;
    }

    for (const merchant of boardData.merchants) {
      result[merchant.id] = merchant;
    }

    return result;
  }, [boardData]);

  const selectedLocation =
    selected?.type === "location"
      ? boardData.locations.find((location) => location.id === selected.id)
      : null;

  const selectedSpace = selectedLocation?.spaces.find(
    (space) => space.id === selectedSpaceId,
  );

  function chooseLocation(location) {
    setSelected({ ...location, type: "location" });

    const firstSpace = location.spaces[0];
    setSelectedSpaceId(firstSpace?.id ?? null);

    setIndustryDraft({
      owner: "purple",
      industry: firstSpace?.allowed_industries?.[0] ?? "",
      level: 1,
      flipped: false,
    });
  }

  function chooseSpace(space) {
    setSelectedSpaceId(space.id);

    const placed = game.industries[space.id];

    setIndustryDraft({
      owner: placed?.owner ?? "purple",
      industry:
        placed?.industry ??
        space.allowed_industries[0] ??
        "",
      level: placed?.level ?? 1,
      flipped: placed?.flipped ?? false,
    });
  }

  async function assignRouteOwner(routeId, color) {
    setSaving(true);
    setError("");

    try {
      const updated = await apiRequest(`/game/routes/${routeId}`, {
        method: "PUT",
        body: JSON.stringify({
          owner: color,
          era: game.era,
        }),
      });

      setGame(updated);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function clearRouteOwner(routeId) {
    setSaving(true);
    setError("");

    try {
      await apiRequest(`/game/routes/${routeId}`, {
        method: "DELETE",
      });

      setGame(await apiRequest("/game"));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function saveIndustry() {
    if (!selectedSpace || !industryDraft.industry) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      const updated = await apiRequest(
        `/game/industries/${selectedSpace.id}`,
        {
          method: "PUT",
          body: JSON.stringify(industryDraft),
        },
      );

      setGame(updated);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function clearIndustry(spaceId) {
    setSaving(true);
    setError("");

    try {
      await apiRequest(`/game/industries/${spaceId}`, {
        method: "DELETE",
      });

      setGame(await apiRequest("/game"));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function startNewGame() {
    setSaving(true);
    setError("");

    try {
      setGame(
        await apiRequest("/game/new", {
          method: "POST",
        }),
      );

      setSelected(null);
      setSelectedSpaceId(null);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main className="page-state">Loading digital board…</main>;
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Beer Flip</p>
          <h1>Brass: Birmingham</h1>
          <p className="subtitle">
            Digital board · Backend-owned game state
          </p>
        </div>

        <button
          type="button"
          className="new-game-button"
          onClick={startNewGame}
          disabled={saving}
        >
          New game
        </button>
      </header>

      {error && <div className="error-banner">{error}</div>}

      <section className="workspace">
        <div className="board-frame">
          <img
            className="board-image"
            src="/brass-birmingham-board.jpg"
            alt="Brass Birmingham board"
          />

          <svg
            className="route-layer"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {boardData.routes.map((route) => {
              const start = endpoints[route.endpoint_a];
              const end = endpoints[route.endpoint_b];

              if (!start || !end) {
                return null;
              }

              const owner = game.routes[route.id]?.owner;
              const isSelected =
                selected?.type === "route" &&
                selected.id === route.id;

              return (
                <g key={route.id}>
                  <line
                    className="route-hit-area"
                    x1={boardPosition(start.x)}
                    y1={boardPosition(start.y)}
                    x2={boardPosition(end.x)}
                    y2={boardPosition(end.y)}
                    onClick={() =>
                      setSelected({
                        ...route,
                        type: "route",
                        endpointAName: start.name,
                        endpointBName: end.name,
                      })
                    }
                  />

                  <line
                    className={[
                      "route",
                      isSelected ? "selected" : "",
                      owner ? `owned ${owner}` : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    x1={boardPosition(start.x)}
                    y1={boardPosition(start.y)}
                    x2={boardPosition(end.x)}
                    y2={boardPosition(end.y)}
                  />
                </g>
              );
            })}
          </svg>

          {boardData.locations.map((location) => {
            const placedTiles = location.spaces
              .map((space) => game.industries[space.id])
              .filter(Boolean);

            return (
              <button
                key={location.id}
                className={[
                  "city-hotspot",
                  selected?.id === location.id ? "selected" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={{
                  left: `${boardPosition(location.x)}%`,
                  top: `${boardPosition(location.y)}%`,
                }}
                onClick={() => chooseLocation(location)}
                type="button"
                aria-label={`Open ${location.name}`}
              >
                {placedTiles.length > 0 && (
                  <span className="tile-cluster">
                    {placedTiles.map((tile) => (
                      <span
                        key={tile.space_id}
                        className={`mini-tile ${tile.owner} ${
                          tile.flipped ? "flipped" : ""
                        }`}
                      >
                        {industryAbbreviation(tile.industry)}
                        {tile.level}
                      </span>
                    ))}
                  </span>
                )}
              </button>
            );
          })}

          {boardData.merchants.map((merchant) => (
            <button
              key={merchant.id}
              className={[
                "merchant-hotspot",
                selected?.id === merchant.id ? "selected" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              style={{
                left: `${boardPosition(merchant.x)}%`,
                top: `${boardPosition(merchant.y)}%`,
              }}
              onClick={() =>
                setSelected({
                  ...merchant,
                  type: "merchant",
                })
              }
              type="button"
              aria-label={`Open ${merchant.name}`}
            />
          ))}
        </div>

        <aside className="drawer">
          {!selected && (
            <div className="empty-drawer">
              <p className="eyebrow">Board inspector</p>
              <h2>Select the board</h2>
              <p>
                Click a city, route, or merchant directly on the image.
              </p>
            </div>
          )}

          {selected?.type === "merchant" && (
            <>
              <p className="eyebrow">Merchant</p>
              <h2>{selected.name}</h2>
              <p>{selected.link_icons} printed link icons</p>
              <code>{selected.id}</code>
            </>
          )}

          {selected?.type === "route" && (
            <>
              <p className="eyebrow">Route</p>

              <h2 className="route-title">
                {selected.endpointAName}
                <span>↕</span>
                {selected.endpointBName}
              </h2>

              <code>{selected.id}</code>

              <section className="drawer-section">
                <h3>Assign owner</h3>

                <div className="color-grid">
                  {PLAYER_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`color-choice ${color}`}
                      onClick={() =>
                        assignRouteOwner(selected.id, color)
                      }
                      disabled={saving}
                    >
                      <span className="color-swatch" />
                      {color}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => clearRouteOwner(selected.id)}
                  disabled={saving}
                >
                  Clear route
                </button>
              </section>
            </>
          )}

          {selected?.type === "location" && selectedLocation && (
            <>
              <p className="eyebrow">City</p>
              <h2>{selectedLocation.name}</h2>

              <div className="space-tabs">
                {selectedLocation.spaces.map((space, index) => {
                  const placed = game.industries[space.id];

                  return (
                    <button
                      key={space.id}
                      type="button"
                      className={[
                        "space-tab",
                        selectedSpaceId === space.id ? "active" : "",
                        placed ? `occupied ${placed.owner}` : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => chooseSpace(space)}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>

              {selectedSpace && (
                <section className="drawer-section">
                  <div className="space-heading">
                    <div>
                      <h3>Industry space</h3>
                      <code>{selectedSpace.id}</code>
                    </div>

                    {game.industries[selectedSpace.id] && (
                      <span
                        className={`large-owner-dot ${
                          game.industries[selectedSpace.id].owner
                        }`}
                      />
                    )}
                  </div>

                  <label>
                    Industry
                    <select
                      value={industryDraft.industry}
                      onChange={(event) =>
                        setIndustryDraft((current) => ({
                          ...current,
                          industry: event.target.value,
                        }))
                      }
                    >
                      {selectedSpace.allowed_industries.map(
                        (industry) => (
                          <option value={industry} key={industry}>
                            {prettyIndustry(industry)}
                          </option>
                        ),
                      )}
                    </select>
                  </label>

                  <label>
                    Level
                    <div className="level-stepper">
                      <button
                        type="button"
                        onClick={() =>
                          setIndustryDraft((current) => ({
                            ...current,
                            level: Math.max(1, current.level - 1),
                          }))
                        }
                      >
                        −
                      </button>

                      <strong>{industryDraft.level}</strong>

                      <button
                        type="button"
                        onClick={() =>
                          setIndustryDraft((current) => ({
                            ...current,
                            level: Math.min(8, current.level + 1),
                          }))
                        }
                      >
                        +
                      </button>
                    </div>
                  </label>

                  <fieldset>
                    <legend>Owner</legend>

                    <div className="color-grid">
                      {PLAYER_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={[
                            "color-choice",
                            color,
                            industryDraft.owner === color
                              ? "active"
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          onClick={() =>
                            setIndustryDraft((current) => ({
                              ...current,
                              owner: color,
                            }))
                          }
                        >
                          <span className="color-swatch" />
                          {color}
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  <label className="toggle-row">
                    <span>Flipped</span>

                    <input
                      type="checkbox"
                      checked={industryDraft.flipped}
                      onChange={(event) =>
                        setIndustryDraft((current) => ({
                          ...current,
                          flipped: event.target.checked,
                        }))
                      }
                    />
                  </label>

                  <button
                    type="button"
                    className="primary-button"
                    onClick={saveIndustry}
                    disabled={saving}
                  >
                    {game.industries[selectedSpace.id]
                      ? "Update tile"
                      : "Place tile"}
                  </button>

                  {game.industries[selectedSpace.id] && (
                    <button
                      type="button"
                      className="danger-button"
                      onClick={() =>
                        clearIndustry(selectedSpace.id)
                      }
                      disabled={saving}
                    >
                      Remove tile
                    </button>
                  )}
                </section>
              )}
            </>
          )}
        </aside>
      </section>
    </main>
  );
}
