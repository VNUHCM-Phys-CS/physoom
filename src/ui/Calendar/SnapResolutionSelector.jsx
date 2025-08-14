"use client";

import { useEffect, useState } from "react";
import { Toggle } from "../toggle";
import { Switch } from "@heroui/react";

export default function SnapResolutionSelector({
  usingAutoMode,
  precision,
  onPrecisionChange,
  reviewData
}) {
  const [autoMode, setAutoMode] = useState(usingAutoMode);

  const precisionOptions = [
    { value: 1, label: "Full Slot", description: "Whole time slots only" },
    { value: 0.5, label: "Half Slot", description: "Half time slots" },
    { value: 0.25, label: "Quarter Slot", description: "Quarter slot precision" },
  ];

  const getSnapFromDuration = (duration) => {
    if (!duration) return precision;
    const fractional = Math.round((duration % 1) * 100) / 100;
    if (fractional === 0.5) return 0.5;
    if (fractional === 0.25 || fractional === 0.75) return 0.25;
    return 1;
  };

  // Auto-update when autoMode is on and duration changes
  useEffect(() => {
    if (autoMode && reviewData?.duration) {
      onPrecisionChange(getSnapFromDuration(reviewData.duration));
    }
  }, [autoMode, reviewData?.duration]);

  return (
    <div className="flex flex-col gap-2 p-4 bg-gray-50 rounded-lg mb-4">
      <div className="flex justify-between items-center">
        <label className="text-sm font-semibold text-gray-700">
          Snap Resolution:
        </label>
      </div>

      <div className="flex gap-2 flex-wrap">
        {usingAutoMode&&<Switch className="pr-5"
          isSelected={autoMode}
          onValueChange={setAutoMode}
          color="primary"
        >
          Auto Snap Mode
        </Switch>}
        {precisionOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => onPrecisionChange(option.value)}
            disabled={autoMode}
            className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
              precision === option.value
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-100"
            } ${autoMode ? "opacity-50 cursor-not-allowed" : ""}`}
            title={option.description}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="text-xs text-gray-500">
        {autoMode
          ? `Auto Mode: Based on duration (${reviewData?.duration ?? "N/A"})`
          : `Current: ${
              precisionOptions.find(o => o.value === precision)?.description ||
              `Custom (${precision})`
            }`}
      </div>
    </div>
  );
}
