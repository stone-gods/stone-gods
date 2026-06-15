export default function RotateDeviceScreen() {
  return (
    <div
      className="rotate-device-screen"
      role="status"
      aria-live="polite"
      aria-label="Rotate your device to landscape"
    >
      <div className="rotate-device-screen__content">
        <img
          className="rotate-device-screen__logo"
          src="/assets/stone-gods-thumb.png"
          alt=""
          width={72}
          height={72}
          draggable={false}
        />
        <h1 className="rotate-device-screen__title">Stone Gods Slots</h1>

        <div className="rotate-device-screen__device" aria-hidden>
          <div className="rotate-device-screen__phone">
            <span className="rotate-device-screen__phone-screen" />
            <span className="rotate-device-screen__phone-notch" />
          </div>
          <span className="rotate-device-screen__arrow">↻</span>
        </div>

        <p className="rotate-device-screen__heading">Rotate your device</p>
        <p className="rotate-device-screen__label">Landscape mode required</p>
      </div>
    </div>
  );
}
