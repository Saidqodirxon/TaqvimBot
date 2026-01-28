import { useState, useEffect } from "react";
import "./Qibla.css";

const Qibla = ({ userData }) => {
  const [qiblaDirection, setQiblaDirection] = useState(null);
  const [deviceHeading, setDeviceHeading] = useState(0);
  const [error, setError] = useState(null);
  const [distance, setDistance] = useState(null);
  const [directionName, setDirectionName] = useState("");
  const [needsPermission, setNeedsPermission] = useState(false);

  useEffect(() => {
    if (userData?.location) {
      calculateQibla();
    }
  }, [userData]);

  useEffect(() => {
    // Check if permission is needed (iOS 13+)
    if (
      typeof DeviceOrientationEvent !== "undefined" &&
      typeof DeviceOrientationEvent.requestPermission === "function"
    ) {
      setNeedsPermission(true);
    } else if (window.DeviceOrientationEvent) {
      startListening();
    } else {
      setError("Qurilmangiz kompas funksiyasini qo'llab-quvvatlamaydi");
    }

    return () => {
      stopListening();
    };
  }, []);

  const requestPermission = async () => {
    try {
      const permission = await DeviceOrientationEvent.requestPermission();
      if (permission === "granted") {
        setNeedsPermission(false);
        startListening();
      } else {
        setError("Kompas uchun ruxsat berilmadi");
      }
    } catch (error) {
      console.error("Permission error:", error);
      setError("Kompas ruxsatini so'rashda xatolik");
    }
  };

  const startListening = () => {
    window.addEventListener(
      "deviceorientationabsolute",
      handleOrientation,
      true
    );
    window.addEventListener("deviceorientation", handleOrientation, true);
  };

  const stopListening = () => {
    window.removeEventListener(
      "deviceorientationabsolute",
      handleOrientation,
      true
    );
    window.removeEventListener("deviceorientation", handleOrientation, true);
  };

  const handleOrientation = (event) => {
    // alpha: z-axis (0-360)
    // beta: x-axis (-180 to 180)
    // gamma: y-axis (-90 to 90)

    let heading = null;

    // iOS qurilmalar uchun webkitCompassHeading (aniqroq)
    if (
      event.webkitCompassHeading !== undefined &&
      event.webkitCompassHeading !== null
    ) {
      heading = event.webkitCompassHeading;
    }
    // Android va boshqa qurilmalar uchun alpha
    else if (event.alpha !== null) {
      // event.absolute true bo'lsa, alpha true north'ga nisbatan
      // false bo'lsa, device frame'ga nisbatan
      heading = event.absolute ? event.alpha : (360 - event.alpha) % 360;
    }

    if (heading !== null && !isNaN(heading)) {
      setDeviceHeading(Math.round(heading));
    }
  };

  const calculateQibla = () => {
    if (
      !userData?.location ||
      !userData.location.latitude ||
      !userData.location.longitude
    ) {
      setError(
        "📍 Joylashuvingizni kiritmadingiz.\n\nQibla yo'nalishini aniqlash uchun botda joylashuvingizni kiriting."
      );
      return;
    }

    const userLat = userData.location.latitude;
    const userLon = userData.location.longitude;

    // Ka'ba koordinatalari
    const KAABA_LAT = 21.4225;
    const KAABA_LON = 39.8262;

    // Qibla yo'nalishini hisoblash
    const bearing = calculateBearing(userLat, userLon, KAABA_LAT, KAABA_LON);
    setQiblaDirection(bearing);

    // Masofani hisoblash
    const dist = calculateDistance(userLat, userLon, KAABA_LAT, KAABA_LON);
    setDistance(dist);

    // Yo'nalish nomini aniqlash
    const direction = getDirectionName(bearing);
    setDirectionName(direction);
  };

  const calculateBearing = (lat1, lon1, lat2, lon2) => {
    const toRadians = (deg) => (deg * Math.PI) / 180;
    const toDegrees = (rad) => (rad * 180) / Math.PI;

    const φ1 = toRadians(lat1);
    const φ2 = toRadians(lat2);
    const Δλ = toRadians(lon2 - lon1);

    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x =
      Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

    let bearing = Math.atan2(y, x);
    bearing = toDegrees(bearing);
    bearing = (bearing + 360) % 360;

    return Math.round(bearing);
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const toRadians = (deg) => (deg * Math.PI) / 180;
    const R = 6371; // Earth radius in km

    const φ1 = toRadians(lat1);
    const φ2 = toRadians(lat2);
    const Δφ = toRadians(lat2 - lat1);
    const Δλ = toRadians(lon2 - lon1);

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return Math.round(distance);
  };

  const getDirectionName = (bearing) => {
    const directions = [
      "Shimol",
      "Shimoliy-Sharq",
      "Sharq",
      "Janubiy-Sharq",
      "Janub",
      "Janubiy-G'arb",
      "G'arb",
      "Shimoliy-G'arb",
    ];
    const index = Math.round(bearing / 45) % 8;
    return directions[index];
  };

  if (needsPermission) {
    return (
      <div className="qibla-container">
        <div className="permission-request">
          <div className="permission-icon">🧭</div>
          <h3>Kompas ruxsati kerak</h3>
          <p>
            Qibla yo'nalishini aniqlash uchun qurilmangizning kompas sensoriga
            ruxsat bering.
          </p>
          <button className="btn-permission" onClick={requestPermission}>
            🔓 Ruxsat berish
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="qibla-error">
        <p>⚠️ {error}</p>
      </div>
    );
  }

  if (!qiblaDirection) {
    return (
      <div className="qibla-loading">
        <p>Hisoblanmoqda...</p>
      </div>
    );
  }

  // Qibla yo'nalishini device heading'ga nisbatan hisoblash
  const qiblaRotation = qiblaDirection - deviceHeading;

  return (
    <div className="qibla-container">
      <div className="qibla-header">
        <h2>🕋 Qibla Yo'nalishi</h2>
        <div className="qibla-info">
          <div className="info-item">
            <span className="label">Yo'nalish:</span>
            <span className="value">{directionName}</span>
          </div>
          <div className="info-item">
            <span className="label">Burchak:</span>
            <span className="value">{qiblaDirection}°</span>
          </div>
          <div className="info-item">
            <span className="label">Masofa:</span>
            <span className="value">{distance?.toLocaleString()} km</span>
          </div>
        </div>
      </div>

      <div className="compass-container">
        <div className="compass-background">
          {/* Cardinal directions */}
          <div className="cardinal-marks">
            <div className="mark north">Sh</div>
            <div className="mark east">Sh</div>
            <div className="mark south">J</div>
            <div className="mark west">G'</div>
          </div>

          {/* Rotating compass needle */}
          <div
            className="compass-needle"
            style={{
              transform: `rotate(${qiblaRotation}deg)`,
            }}
          >
            <div className="needle-pointer">▲</div>
            <div className="kaaba-icon">🕋</div>
          </div>

          {/* Center dot */}
          <div className="compass-center"></div>
        </div>

        <div className="device-heading">
          <p>Qurilma yo'nalishi: {deviceHeading}°</p>
        </div>
      </div>

      <div className="qibla-instructions">
        <p>
          📱 Qurilmangizni tekis ushlang va aylantiring. Yashil ko'rsatkich
          Ka'ba tomonga yo'naltirilgan.
        </p>
      </div>
    </div>
  );
};

export default Qibla;
