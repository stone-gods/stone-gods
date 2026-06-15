"use client";

import { useEffect, useState } from "react";

export function useIsPortrait(): boolean {
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(orientation: portrait)");

    function update() {
      setIsPortrait(query.matches);
    }

    update();
    query.addEventListener("change", update);
    window.addEventListener("resize", update);
    return () => {
      query.removeEventListener("change", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return isPortrait;
}
