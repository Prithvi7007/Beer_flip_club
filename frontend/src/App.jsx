import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_URL = "http://127.0.0.1:8000/api";
const PLAYER_COLORS = ["purple", "yellow", "orange", "white"];

function boardPosition(value) {
  return 4 + value * 92;
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

function prettyIndustry(value) {
  return value
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
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
    for (const location of boardData.locations) result[location.id] = location;
    for (const merchant of boardData.merchants) result[merchant.id] = merchant;
    return result;
  }, [boardData]);

  function selectLocation(location) {
    setSelected({ ...location, type: "location" });
    const firstSpace = location.spaces[0];
    setIndustryDraft({
      owner: "purple",
      industry: firstSpace?.allowed_industries?.[0] ?? "",
      level: 1,
      flipped: false,
    });
  }

  async function assignRouteOwner(routeId, color) {
    setSaving(true);
    setError("");
    try {
      const updated = await apiRequest(`/game/routes/${routeId}`, {
        method: "PUT",
        body: JSON.stringify({ owner: color, era: game.era }),
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
      await apiRequest(`/game/routes/${routeId}`, { method: "DELETE" });
      const updated = await apiRequest("/game");
      setGame(updated);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function placeIndustry(space) {
    if (!industryDraft.industry) return;

    setSaving(true);
    setError("");
    try {
      const updated = await apiRequest(`/game/industries/${space.id}`, {
        method: "PUT",
        body: JSON.stringify(industryDraft),
      });
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
      await apiRequest(`/game/industries/${spaceId}`, { method: "DELETE" });
      const updated = await apiRequest("/game");
      setGame(updated);
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
      const updated = await apiRequest("/game/new", { method: "POST" });
      setGame(updated);
      setSelected(null);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <main className="page-state">Loading Brass board…</main>;

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Beer Flip</p>
          <h1>Brass: Birmingham</h1>
          <p>
            Backend-owned game state · {boardData.locations.length} locations ·{" "}
            {boardData.routes.length} routes
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

      <section className="board-panel">
        <div className="board">
          <svg
            className="route-layer"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {boardData.routes.map((route) => {
              const start = endpoints[route.endpoint_a];
              const end = endpoints[route.endpoint_b];
              if (!start || !end) return null;

              const owner = game.routes[route.id]?.owner;
              const isSelected =
                selected?.type === "route" && selected.id === route.id;

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

          {boardData.merchants.map((merchant) => (
            <button
              key={merchant.id}
              className={`merchant ${
                selected?.id === merchant.id ? "selected" : ""
              }`}
              style={{
                left: `${boardPosition(merchant.x)}%`,
                top: `${boardPosition(merchant.y)}%`,
              }}
              onClick={() => setSelected({ ...merchant, type: "merchant" })}
              type="button"
            >
              <span>{merchant.name}</span>
              <small>{merchant.link_icons} link icons</small>
            </button>
          ))}

          {boardData.locations.map((location) => {
            const placedCount = location.spaces.filter(
              (space) => game.industries[space.id],
            ).length;

            return (
              <button
                key={location.id}
                className={`location ${
                  selected?.id === location.id ? "selected" : ""
                }`}
                style={{
                  left: `${boardPosition(location.x)}%`,
                  top: `${boardPosition(location.y)}%`,
                }}
                onClick={() => selectLocation(location)}
                type="button"
              >
                <span>{location.name}</span>
                <small>
                  {placedCount}/{location.spaces.length} placed
                </small>
              </button>
            );
          })}
        </div>

        <aside className="details-panel">
          {!selected && (
            <>
              <p className="eyebrow">Board inspector</p>
              <h2>Select something</h2>
              <p>Click a location, merchant, or route.</p>
            </>
          )}

          {selected?.type === "merchant" && (
            <>
              <p className="eyebrow">Selected merchant</p>
              <h2>{selected.name}</h2>
              <p>Link icons: {selected.link_icons}</p>
              <code>{selected.id}</code>
            </>
          )}

          {selected?.type === "route" && (
            <>
              <p className="eyebrow">Selected route</p>
              <h2 className="route-title">
                {selected.endpointAName}
                <span>↕</span>
                {selected.endpointBName}
              </h2>
              <code>{selected.id}</code>

              <div className="owner-picker">
                <p>Assign owner</p>
                <div className="owner-buttons">
                  {PLAYER_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`owner-button ${color}`}
                      onClick={() => assignRouteOwner(selected.id, color)}
                      disabled={saving}
                    >
                      {color}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="owner-button clear"
                    onClick={() => clearRouteOwner(selected.id)}
                    disabled={saving}
                  >
                    Clear
                  </button>
                </div>
              </div>
            </>
          )}

          {selected?.type === "location" && (
            <>
              <p className="eyebrow">Selected location</p>
              <h2>{selected.name}</h2>

              <div className="space-list">
                {selected.spaces.map((space) => {
                  const placed = game.industries[space.id];

                  return (
                    <article className="space-card" key={space.id}>
                      <div className="space-card-header">
                        <div>
                          <strong>{space.id}</strong>
                          <small>
                            {space.allowed_industries
                              .map(prettyIndustry)
                              .join(" / ")}
                          </small>
                        </div>

                        {placed && (
                          <span className={`tile-owner-dot ${placed.owner}`} />
                        )}
                      </div>

                      {placed ? (
                        <div className="placed-tile">
                          <p>
                            <strong>{prettyIndustry(placed.industry)}</strong>
                          </p>
                          <p>
                            {placed.owner} · Level {placed.level} ·{" "}
                            {placed.flipped ? "Flipped" : "Unflipped"}
                          </p>
                          <button
                            type="button"
                            className="danger-button"
                            onClick={() => clearIndustry(space.id)}
                            disabled={saving}
                          >
                            Remove tile
                          </button>
                        </div>
                      ) : (
                        <div className="industry-form">
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
                              {space.allowed_industries.map((industry) => (
                                <option value={industry} key={industry}>
                                  {prettyIndustry(industry)}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label>
                            Owner
                            <select
                              value={industryDraft.owner}
                              onChange={(event) =>
                                setIndustryDraft((current) => ({
                                  ...current,
                                  owner: event.target.value,
                                }))
                              }
                            >
                              {PLAYER_COLORS.map((color) => (
                                <option value={color} key={color}>
                                  {color}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label>
                            Level
                            <input
                              type="number"
                              min="1"
                              max="8"
                              value={industryDraft.level}
                              onChange={(event) =>
                                setIndustryDraft((current) => ({
                                  ...current,
                                  level: Number(event.target.value),
                                }))
                              }
                            />
                          </label>

                          <label className="checkbox-label">
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
                            Flipped
                          </label>

                          <button
                            type="button"
                            className="place-button"
                            onClick={() => placeIndustry(space)}
                            disabled={saving}
                          >
                            Place tile
                          </button>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </aside>
      </section>
    </main>
  );
}
