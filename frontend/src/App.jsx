import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_URL = "http://127.0.0.1:8000/api/board";

const PLAYER_COLORS = ["purple", "yellow", "orange", "white"];

function boardPosition(value) {
  return 4 + value * 92;
}

export default function App() {
  const [boardData, setBoardData] = useState({
    locations: [],
    merchants: [],
    routes: [],
  });

  const [selected, setSelected] = useState(null);
  const [routeOwners, setRouteOwners] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadBoard() {
      try {
        const response = await fetch(API_URL);

        if (!response.ok) {
          throw new Error(`Board request failed: ${response.status}`);
        }

        const data = await response.json();
        setBoardData(data);
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setLoading(false);
      }
    }

    loadBoard();
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

  function assignRouteOwner(routeId, color) {
    setRouteOwners((current) => ({
      ...current,
      [routeId]: color,
    }));
  }

  function clearRouteOwner(routeId) {
    setRouteOwners((current) => {
      const next = { ...current };
      delete next[routeId];
      return next;
    });
  }

  if (loading) {
    return <main className="page-state">Loading Brass board…</main>;
  }

  if (error) {
    return <main className="page-state error">Error: {error}</main>;
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <p className="eyebrow">Beer Flip</p>
        <h1>Brass: Birmingham</h1>
        <p>
          {boardData.locations.length} locations and{" "}
          {boardData.routes.length} routes loaded from BrassCore.
        </p>
      </header>

      <section className="board-panel">
        <div className="board">
          <svg
            className="route-layer"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-label="Brass Birmingham routes"
          >
            {boardData.routes.map((route) => {
              const start = endpoints[route.endpoint_a];
              const end = endpoints[route.endpoint_b];

              if (!start || !end) {
                return null;
              }

              const isSelected =
                selected?.type === "route" && selected.id === route.id;

              const owner = routeOwners[route.id];

              const routeSelection = {
                ...route,
                type: "route",
                endpointAName: start.name,
                endpointBName: end.name,
              };

              return (
                <g key={route.id}>
                  <line
                    className="route-hit-area"
                    x1={boardPosition(start.x)}
                    y1={boardPosition(start.y)}
                    x2={boardPosition(end.x)}
                    y2={boardPosition(end.y)}
                    onClick={() => setSelected(routeSelection)}
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
              className={[
                "merchant",
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
            >
              <span>{merchant.name}</span>
              <small>{merchant.link_icons} link icons</small>
            </button>
          ))}

          {boardData.locations.map((location) => (
            <button
              key={location.id}
              className={[
                "location",
                selected?.id === location.id ? "selected" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              style={{
                left: `${boardPosition(location.x)}%`,
                top: `${boardPosition(location.y)}%`,
              }}
              onClick={() =>
                setSelected({
                  ...location,
                  type: "location",
                })
              }
              type="button"
            >
              <span>{location.name}</span>
              <small>{location.spaces} spaces</small>
            </button>
          ))}
        </div>

        <aside className="details-panel">
          {selected ? (
            <>
              <p className="eyebrow">
                {selected.type === "merchant"
                  ? "Selected merchant"
                  : selected.type === "route"
                    ? "Selected route"
                    : "Selected location"}
              </p>

              {selected.type === "route" ? (
                <>
                  <h2 className="route-title">
                    {selected.endpointAName}
                    <span>↕</span>
                    {selected.endpointBName}
                  </h2>

                  <p>
                    Available during:{" "}
                    {selected.supported_eras.join(" and ")}
                  </p>

                  <code>{selected.id}</code>

                  <div className="owner-picker">
                    <p>Assign owner</p>

                    <div className="owner-buttons">
                      {PLAYER_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={`owner-button ${color}`}
                          onClick={() =>
                            assignRouteOwner(selected.id, color)
                          }
                        >
                          {color}
                        </button>
                      ))}

                      <button
                        type="button"
                        className="owner-button clear"
                        onClick={() => clearRouteOwner(selected.id)}
                      >
                        Clear
                      </button>
                    </div>

                    {routeOwners[selected.id] && (
                      <p className="current-owner">
                        Current owner:{" "}
                        <strong>{routeOwners[selected.id]}</strong>
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <h2>{selected.name}</h2>

                  {selected.type === "merchant" ? (
                    <p>Link icons: {selected.link_icons}</p>
                  ) : (
                    <p>Industry spaces: {selected.spaces}</p>
                  )}

                  <code>{selected.id}</code>
                </>
              )}
            </>
          ) : (
            <>
              <p className="eyebrow">Board inspector</p>
              <h2>Select something</h2>
              <p>Click a city, merchant, or route.</p>
            </>
          )}
        </aside>
      </section>
    </main>
  );
}