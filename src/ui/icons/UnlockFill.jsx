import React from "react";
export const UnlockFill = ({ size = "1em", width, height, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    focusable="false"
    height={size || height}
    role="presentation"
    fill="currentColor"
    viewBox="0 0 16 16"
    width={size || width}
    {...props}
  >
    <path d="M11 1a2 2 0 0 0-2 2v4a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h5V3a3 3 0 0 1 6 0v4a.5.5 0 0 1-1 0V3a2 2 0 0 0-2-2" />
  </svg>
);
