export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = src;
  });
}

export function preloadImages(urls: readonly string[]): Promise<void> {
  const unique = [...new Set(urls)];
  return Promise.all(unique.map(preloadImage)).then(() => undefined);
}
