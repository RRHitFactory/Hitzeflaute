"use client";

import React, { useEffect, useState } from "react";
import { GameSettings, TechnologySettings, Shape } from "@/types/game";

const BUS_TOPOLOGY_OPTIONS = [
  "line",
  "grid",
  "random",
  "regular_polygon",
  "layered_polygon",
];
const TRANSMISSION_TOPOLOGY_OPTIONS = [
  "sequential",
  "random",
  "grid",
  "spiderweb",
];
const LOAD_TECHNOLOGIES = ["residential", "industrial", "freezer"];
const GENERATOR_TECHNOLOGIES = [
  "ccgt",
  "coal",
  "gas_turbine",
  "lignite",
  "nuclear",
  "solar",
  "wind",
];
const TRANSMISSION_TECHNOLOGIES = ["AC", "DC"];

interface Props {
  settings: GameSettings | null | undefined;
  onChange?: (settings: GameSettings) => void;
  editable?: boolean;
  className?: string;
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

export function SettingsTable({
  settings,
  onChange,
  editable = false,
  className = "",
}: Props) {
  const [local, setLocal] = useState<GameSettings | null>(null);
  const [mapAreaText, setMapAreaText] = useState<string>("");

  useEffect(() => {
    if (settings) {
      setLocal(clone(settings));
      try {
        setMapAreaText(
          JSON.stringify(settings.map_area ?? { points: [] }, null, 2),
        );
      } catch {
        setMapAreaText("");
      }
    } else {
      setLocal(null);
      setMapAreaText("");
    }
  }, [settings]);

  const emitChange = (next: GameSettings | null) => {
    setLocal(next);
    if (onChange && next) {
      onChange(clone(next));
    }
  };

  if (!local) {
    return (
      <div className={className}>
        <p className="text-sm text-gray-600">No settings available</p>
      </div>
    );
  }

  // Helpers for nested arrays of TechnologySettings
  const updateTechArray = (
    key: "loads" | "generators" | "transmission",
    idx: number,
    patch: Partial<TechnologySettings>,
  ) => {
    const next = clone(local);
    const arr = next[key].data;
    arr[idx] = { ...arr[idx], ...patch };
    emitChange(next);
  };

  const addTech = (key: "loads" | "generators" | "transmission") => {
    const next = clone(local);
    next[key].data.push({
      id: Date.now(),
      tech_name: "New",
      enabled: true,
      probability_of_appearing: 0.1,
    });
    emitChange(next);
  };

  const removeTech = (
    key: "loads" | "generators" | "transmission",
    idx: number,
  ) => {
    const next = clone(local);
    next[key].data.splice(idx, 1);
    emitChange(next);
  };

  // Generic field setter
  const setField = <K extends keyof GameSettings>(
    field: K,
    value: GameSettings[K],
  ) => {
    const next = clone(local);
    // @ts-ignore
    next[field] = value;
    emitChange(next);
  };

  const applyMapAreaText = () => {
    try {
      const parsed: Shape = JSON.parse(mapAreaText);
      const next = clone(local);
      next.map_area = parsed;
      emitChange(next);
    } catch (err) {
      alert("JSON inválido en Map Area");
    }
  };

  return (
    <div className={`bg-gray-100 rounded-md p-4 ${className}`}>
      <h3 className="text-lg font-semibold mb-3 text-black">Game Settings</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-black">Bus Topology</label>
          <select
            value={local.bus_topology ?? ""}
            onChange={(e) => setField("bus_topology", e.target.value)}
            disabled={!editable}
            className="w-full p-2 border rounded text-black"
          >
            <option value="">-- Select topology --</option>
            {BUS_TOPOLOGY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-black">
            Transmission Topology
          </label>
          <select
            value={local.transmission_topology ?? ""}
            onChange={(e) => setField("transmission_topology", e.target.value)}
            disabled={!editable}
            className="w-full p-2 border rounded text-black"
          >
            <option value="">-- Select topology --</option>
            {TRANSMISSION_TOPOLOGY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-black">Number of Buses</label>
          <input
            type="number"
            value={local.n_buses ?? 0}
            onChange={(e) =>
              setField("n_buses", parseInt(e.target.value || "0"))
            }
            disabled={!editable}
            className="w-full p-2 border rounded text-black"
          />
        </div>

        <div>
          <label className="block text-sm text-black">Max rounds</label>
          <input
            type="number"
            value={local.max_rounds ?? 0}
            onChange={(e) =>
              setField("max_rounds", parseInt(e.target.value || "0"))
            }
            disabled={!editable}
            className="w-full p-2 border rounded text-black"
          />
        </div>

        <div>
          <label className="block text-sm text-black">Initial funds</label>
          <input
            type="number"
            value={local.initial_funds ?? 0}
            onChange={(e) =>
              setField("initial_funds", parseInt(e.target.value || "0"))
            }
            disabled={!editable}
            className="w-full p-2 border rounded text-black"
          />
        </div>

        <div>
          <label className="block text-sm text-black">Min bid price</label>
          <input
            type="number"
            value={local.min_bid_price ?? 0}
            onChange={(e) =>
              setField("min_bid_price", parseInt(e.target.value || "0"))
            }
            disabled={!editable}
            className="w-full p-2 border rounded text-black"
          />
        </div>

        <div>
          <label className="block text-sm text-black">Max bid price</label>
          <input
            type="number"
            value={local.max_bid_price ?? 0}
            onChange={(e) =>
              setField("max_bid_price", parseInt(e.target.value || "0"))
            }
            disabled={!editable}
            className="w-full p-2 border rounded text-black"
          />
        </div>

        <div>
          <label className="block text-sm text-black">Enable fixed costs</label>
          <input
            type="checkbox"
            checked={local.enable_fixed_costs}
            onChange={(e) => setField("enable_fixed_costs", e.target.checked)}
            disabled={!editable}
            className="mt-2"
          />
        </div>

        <div>
          <label className="block text-sm text-black">
            Probability new asset
          </label>
          <input
            type="number"
            step="0.01"
            min={0}
            max={1}
            value={local.probability_of_new_asset ?? 0}
            onChange={(e) =>
              setField(
                "probability_of_new_asset",
                parseFloat(e.target.value || "0"),
              )
            }
            disabled={!editable}
            className="w-full p-2 border rounded text-black"
          />
        </div>

        <div>
          <label className="block text-sm text-black">
            Probability new transmission
          </label>
          <input
            type="number"
            step="0.01"
            min={0}
            max={1}
            value={local.probability_of_new_transmission ?? 0}
            onChange={(e) =>
              setField(
                "probability_of_new_transmission",
                parseFloat(e.target.value || "0"),
              )
            }
            disabled={!editable}
            className="w-full p-2 border rounded text-black"
          />
        </div>

        <div>
          <label className="block text-sm text-black">
            Probability new bus
          </label>
          <input
            type="number"
            step="0.01"
            min={0}
            max={1}
            value={local.probability_of_new_bus ?? 0}
            onChange={(e) =>
              setField(
                "probability_of_new_bus",
                parseFloat(e.target.value || "0"),
              )
            }
            disabled={!editable}
            className="w-full p-2 border rounded text-black"
          />
        </div>

        <div>
          <label className="block text-sm text-black">Initial ice cream</label>
          <input
            type="number"
            value={local.n_init_ice_cream ?? 0}
            onChange={(e) =>
              setField("n_init_ice_cream", parseInt(e.target.value || "0"))
            }
            disabled={!editable}
            className="w-full p-2 border rounded text-black"
          />
        </div>

        <div>
          <label className="block text-sm text-black">Initial assets</label>
          <input
            type="number"
            value={local.n_init_assets ?? 0}
            onChange={(e) =>
              setField("n_init_assets", parseInt(e.target.value || "0"))
            }
            disabled={!editable}
            className="w-full p-2 border rounded text-black"
          />
        </div>
      </div>

      {/* Technology lists */}
      <div className="mt-4">
        <h4 className="font-medium text-black">Loads</h4>
        <div className="space-y-2 mt-2">
          {local.loads.data.map((t, i) => (
            <div key={t.id} className="flex gap-2 items-center">
              <select
                className="p-1 border rounded text-black"
                value={t.tech_name}
                disabled={!editable}
                onChange={(e) =>
                  updateTechArray("loads", i, { tech_name: e.target.value })
                }
              >
                <option value="">-- Select load type --</option>
                {LOAD_TECHNOLOGIES.map((tech) => (
                  <option key={tech} value={tech}>
                    {tech}
                  </option>
                ))}
              </select>
              <input
                type="number"
                step="0.01"
                min={0}
                max={1}
                value={t.probability_of_appearing}
                disabled={!editable}
                onChange={(e) =>
                  updateTechArray("loads", i, {
                    probability_of_appearing: parseFloat(e.target.value || "0"),
                  })
                }
                className="p-1 border rounded text-black w-24"
              />
              <label className="text-sm text-black">
                <input
                  type="checkbox"
                  checked={t.enabled}
                  disabled={!editable}
                  onChange={(e) =>
                    updateTechArray("loads", i, { enabled: e.target.checked })
                  }
                  className="ml-2"
                />
                Enabled
              </label>
              {editable && (
                <button
                  onClick={() => removeTech("loads", i)}
                  className="ml-auto text-red-600"
                >
                  Remove
                </button>
              )}
            </div>
          ))}

          {editable && (
            <button
              onClick={() => addTech("loads")}
              className="mt-2 text-sm text-blue-700"
            >
              + Add Load Type
            </button>
          )}
        </div>
      </div>

      <div className="mt-4">
        <h4 className="font-medium text-black">Generators</h4>
        <div className="space-y-2 mt-2">
          {local.generators.data.map((t, i) => (
            <div key={t.id} className="flex gap-2 items-center">
              <select
                className="p-1 border rounded text-black"
                value={t.tech_name}
                disabled={!editable}
                onChange={(e) =>
                  updateTechArray("generators", i, {
                    tech_name: e.target.value,
                  })
                }
              >
                <option value="">-- Select generator type --</option>
                {GENERATOR_TECHNOLOGIES.map((tech) => (
                  <option key={tech} value={tech}>
                    {tech}
                  </option>
                ))}
              </select>
              <input
                type="number"
                step="0.01"
                min={0}
                max={1}
                value={t.probability_of_appearing}
                disabled={!editable}
                onChange={(e) =>
                  updateTechArray("generators", i, {
                    probability_of_appearing: parseFloat(e.target.value || "0"),
                  })
                }
                className="p-1 border rounded text-black w-24"
              />
              <label className="text-sm text-black">
                <input
                  type="checkbox"
                  checked={t.enabled}
                  disabled={!editable}
                  onChange={(e) =>
                    updateTechArray("generators", i, {
                      enabled: e.target.checked,
                    })
                  }
                  className="ml-2"
                />
                Enabled
              </label>
              {editable && (
                <button
                  onClick={() => removeTech("generators", i)}
                  className="ml-auto text-red-600"
                >
                  Remove
                </button>
              )}
            </div>
          ))}

          {editable && (
            <button
              onClick={() => addTech("generators")}
              className="mt-2 text-sm text-blue-700"
            >
              + Add Generator Type
            </button>
          )}
        </div>
      </div>

      <div className="mt-4">
        <h4 className="font-medium text-black">Transmission</h4>
        <div className="space-y-2 mt-2">
          {local.transmission.data.map((t, i) => (
            <div key={t.id} className="flex gap-2 items-center">
              <select
                className="p-1 border rounded text-black"
                value={t.tech_name}
                disabled={!editable}
                onChange={(e) =>
                  updateTechArray("transmission", i, {
                    tech_name: e.target.value,
                  })
                }
              >
                <option value="">-- Select transmission type --</option>
                {TRANSMISSION_TECHNOLOGIES.map((tech) => (
                  <option key={tech} value={tech}>
                    {tech}
                  </option>
                ))}
              </select>
              <input
                type="number"
                step="0.01"
                min={0}
                max={1}
                value={t.probability_of_appearing}
                disabled={!editable}
                onChange={(e) =>
                  updateTechArray("transmission", i, {
                    probability_of_appearing: parseFloat(e.target.value || "0"),
                  })
                }
                className="p-1 border rounded text-black w-24"
              />
              <label className="text-sm text-black">
                <input
                  type="checkbox"
                  checked={t.enabled}
                  disabled={!editable}
                  onChange={(e) =>
                    updateTechArray("transmission", i, {
                      enabled: e.target.checked,
                    })
                  }
                  className="ml-2"
                />
                Enabled
              </label>
              {editable && (
                <button
                  onClick={() => removeTech("transmission", i)}
                  className="ml-auto text-red-600"
                >
                  Remove
                </button>
              )}
            </div>
          ))}

          {editable && (
            <button
              onClick={() => addTech("transmission")}
              className="mt-2 text-sm text-blue-700"
            >
              + Add Transmission Type
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function getDefaultGameSettings(): GameSettings {
  return {
    bus_topology: "layered_polygon",
    transmission_topology: "spiderweb",
    n_buses: 5,
    max_rounds: 20,
    n_init_ice_cream: 3,
    n_init_assets: 10,
    n_init_non_freezer_loads: 4,
    min_bid_price: -1000,
    max_bid_price: 1000,
    initial_funds: 10000,
    enable_fixed_costs: false,
    loads: {
      class: "TechnologySettingsRepo",
      data: [
        {
          id: 1,
          tech_name: "residential",
          enabled: true,
          probability_of_appearing: 0.7,
        },
        {
          id: 2,
          tech_name: "industrial",
          enabled: true,
          probability_of_appearing: 0.3,
        },
      ],
    },
    generators: {
      class: "TechnologySettingsRepo",
      data: [
        {
          id: 1,
          tech_name: "ccgt",
          enabled: true,
          probability_of_appearing: 0.1,
        },
        {
          id: 2,
          tech_name: "coal",
          enabled: true,
          probability_of_appearing: 0.1,
        },
        {
          id: 3,
          tech_name: "gas_turbine",
          enabled: true,
          probability_of_appearing: 0.1,
        },
        {
          id: 4,
          tech_name: "lignite",
          enabled: true,
          probability_of_appearing: 0.15,
        },
        {
          id: 5,
          tech_name: "nuclear",
          enabled: true,
          probability_of_appearing: 0.05,
        },
        {
          id: 6,
          tech_name: "solar",
          enabled: true,
          probability_of_appearing: 0.25,
        },
        {
          id: 7,
          tech_name: "wind",
          enabled: true,
          probability_of_appearing: 0.25,
        },
      ],
    },
    transmission: {
      class: "TechnologySettingsRepo",
      data: [
        {
          id: 1,
          tech_name: "AC",
          enabled: true,
          probability_of_appearing: 0.5,
        },
        {
          id: 2,
          tech_name: "DC",
          enabled: true,
          probability_of_appearing: 0.5,
        },
      ],
    },
    probability_of_new_asset: 0.2,
    probability_of_new_transmission: 0.05,
    probability_of_new_bus: 0.01,
  };
}
