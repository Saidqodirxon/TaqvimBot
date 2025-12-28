import moment from "moment";
import "./Calendar.css";

const Calendar = ({ prayerTimes, userData }) => {
  // 24-soatlik formatni 12-soatlik formatga o'tkazish
  const convertTo12Hour = (time24) => {
    if (!time24) return time24;
    const [hours, minutes] = time24.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  const getMethodName = (method) => {
    const methods = {
      0: "Jafari",
      1: "Karachi",
      2: "ISNA",
      3: "MWL",
      4: "Makka",
      5: "Misr",
      7: "Tehran",
      8: "Gulf",
      9: "Quvayt",
      10: "Qatar",
      11: "Singapur",
      12: "Frantsiya",
      13: "Turkiya",
      14: "Rossiya",
    };
    return methods[method] || "Karachi";
  };

  const { timings, date, hijri } = prayerTimes;
  const prayers = [
    {
      name: "Bomdod",
      key: "fajr",
      icon: "🌅",
      time: convertTo12Hour(timings.fajr),
    },
    {
      name: "Quyosh",
      key: "sunrise",
      icon: "☀️",
      time: convertTo12Hour(timings.sunrise),
    },
    {
      name: "Peshin",
      key: "dhuhr",
      icon: "🌞",
      time: convertTo12Hour(timings.dhuhr),
    },
    {
      name: "Asr",
      key: "asr",
      icon: "🌤",
      time: convertTo12Hour(timings.asr),
    },
    {
      name: "Shom",
      key: "maghrib",
      icon: "🌇",
      time: convertTo12Hour(timings.maghrib),
    },
    {
      name: "Xufton",
      key: "isha",
      icon: "🌙",
      time: convertTo12Hour(timings.isha),
    },
  ];

  const currentTime = moment();
  const nextPrayer = prayers.find((prayer) => {
    const prayerTime = moment(prayer.time, "HH:mm");
    return prayerTime.isAfter(currentTime);
  });

  return (
    <div className="calendar">
      <div className="daily-view">
        <div className="date-header">
          <div className="gregorian">📅 {date}</div>
          <div className="hijri">📿 {hijri}</div>
        </div>

        <div className="prayer-list">
          {prayers.map((prayer) => {
            const isNext = nextPrayer && nextPrayer.key === prayer.key;
            const isPast = moment(prayer.time, "HH:mm").isBefore(currentTime);

            return (
              <div
                key={prayer.key}
                className={`prayer-item ${isNext ? "next" : ""} ${
                  isPast ? "past" : ""
                }`}
              >
                <div className="prayer-icon">{prayer.icon}</div>
                <div className="prayer-info">
                  <div className="prayer-name">{prayer.name}</div>
                  {isNext && <div className="next-badge">Keyingi namoz</div>}
                </div>
                <div className="prayer-time">{prayer.time}</div>
              </div>
            );
          })}
        </div>

        {userData?.prayerSettings && (
          <div className="settings-info">
            <div className="setting-item">
              <span className="label">Hisoblash usuli:</span>
              <span className="value">
                {getMethodName(userData.prayerSettings.calculationMethod)}
              </span>
            </div>
            <div className="setting-item">
              <span className="label">Mazhab:</span>
              <span className="value">
                {userData.prayerSettings.school === 1 ? "Hanafiy" : "Shofeiy"}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Calendar;
