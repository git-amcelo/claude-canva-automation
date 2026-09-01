"use client";

import { createContext, useContext } from "react";

/**
 * The factor the 1080x1350 canvas is currently scaled by on screen. Drag
 * handlers divide screen-pixel movement by this so dragging tracks the
 * cursor exactly, whatever size the canvas is being displayed at.
 */
export const ScaleContext = createContext(1);

export const useScale = () => useContext(ScaleContext);
