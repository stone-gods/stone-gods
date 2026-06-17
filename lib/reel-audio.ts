const REEL_STOP_SRC = "/assets/sounds/reel-stop.wav";

let stopTemplate: HTMLAudioElement | null = null;

function stopTemplateAudio(): HTMLAudioElement {
  if (!stopTemplate) {
    stopTemplate = new Audio(REEL_STOP_SRC);
    stopTemplate.preload = "auto";
    stopTemplate.volume = 0.65;
  }
  return stopTemplate;
}

export function preloadReelStopSound(): void {
  stopTemplateAudio();
}

export function playReelStopSound(): void {
  const clip = stopTemplateAudio().cloneNode(true) as HTMLAudioElement;
  clip.volume = 0.65;
  void clip.play().catch(() => {});
}
