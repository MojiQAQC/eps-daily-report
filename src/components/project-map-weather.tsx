"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  ExternalLink,
  MapPin,
  ShieldCheck,
  Sun,
} from "lucide-react";
import { Badge, Button, Field, TextInput } from "@/components/ui";

interface WeatherData {
  success: boolean;
  location: {
    district: string;
    province: string;
    country: string;
    latitude: number;
    longitude: number;
  };
  updatedAt: string;
  temperature: number;
  humidity: number;
  precipitation: number;
  windSpeedKmh: number;
  windSpeedMph: number;
  weatherCode: number;
  conditionLabel: string;
  conditionIcon: "sunny" | "cloudy" | "rain" | "heavy-rain" | "thunderstorm" | "fog";
  conditionBadge: "แดดแรง" | "ฝนตก" | "ฟ้าคะนอง" | "ลมแรง" | "ปกติ";
  safetyAlert: string;
  alertLevel: "safe" | "warning" | "danger";
}

const CONDITION_ICONS = {
  sunny: Sun,
  cloudy: Cloud,
  rain: CloudRain,
  "heavy-rain": CloudRain,
  thunderstorm: CloudLightning,
  fog: CloudFog,
} satisfies Record<WeatherData["conditionIcon"], typeof Sun>;

const ALERT_STYLES = {
  danger: { icon: AlertOctagon, className: "bg-danger text-ondanger", label: "คำเตือนสภาพอากาศหน้างาน" },
  warning: { icon: AlertTriangle, className: "bg-warningbg text-warningink", label: "คำเตือนสภาพอากาศหน้างาน" },
  safe: { icon: ShieldCheck, className: "bg-success text-onsuccess", label: "เกณฑ์ความปลอดภัยสภาพอากาศ EPS" },
} satisfies Record<WeatherData["alertLevel"], { icon: typeof AlertOctagon; className: string; label: string }>;

export function ProjectMapWeather() {
  // Baseline location: Thung Song, Nakhon Si Thammarat
  const [lat, setLat] = useState("8.096970");
  const [lon, setLon] = useState("99.682458");
  const [locationName, setLocationName] = useState("อ.ทุ่งสง จ.นครศรีธรรมราช");

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLocationModal, setShowLocationModal] = useState(false);

  // Form state for editing location
  const [tempLat, setTempLat] = useState(lat);
  const [tempLon, setTempLon] = useState(lon);
  const [tempName, setTempName] = useState(locationName);

  const firstFieldRef = useRef<HTMLInputElement>(null);

  async function fetchWeather(targetLat: string, targetLon: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/weather?lat=${targetLat}&lon=${targetLon}`);
      if (res.ok) {
        const data: WeatherData = await res.json();
        setWeather(data);
      }
    } catch (err) {
      console.error("Failed to fetch weather:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchWeather(lat, lon);
  }, [lat, lon]);

  useEffect(() => {
    if (!showLocationModal) return;
    firstFieldRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setShowLocationModal(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [showLocationModal]);

  function handleSaveLocation(e: React.FormEvent) {
    e.preventDefault();
    if (tempLat && tempLon) {
      setLat(tempLat.trim());
      setLon(tempLon.trim());
      setLocationName(tempName.trim() || `${tempLat}, ${tempLon}`);
      setShowLocationModal(false);
    }
  }

  const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lon}`;
  const embedMapsUrl = `https://maps.google.com/maps?q=${lat},${lon}&hl=th&z=15&output=embed`;

  const ConditionIcon = weather ? CONDITION_ICONS[weather.conditionIcon] : CloudFog;
  const alert = ALERT_STYLES[weather?.alertLevel ?? "safe"];
  const AlertIcon = alert.icon;

  return (
    <section aria-labelledby="project-map-heading" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 id="project-map-heading" className="text-lg font-bold">
            แผนที่โครงการ &amp; สภาพอากาศหน้างาน
          </h2>
          <Badge>STS-9.9 MW Biomass</Badge>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            {weather?.updatedAt
              ? `ซิงค์สภาพอากาศ ${new Date(weather.updatedAt).toLocaleTimeString("th-TH", {
                  hour: "2-digit",
                  minute: "2-digit",
                })} น.`
              : "กำลังซิงค์ข้อมูล..."}
          </span>
          <button
            type="button"
            onClick={() => setShowLocationModal(true)}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 py-1 text-xs font-semibold transition-colors duration-200 hover:bg-surface2"
          >
            <MapPin className="h-3.5 w-3.5 text-primary" aria-hidden />
            แก้ไขพิกัดไซต์งาน
          </button>
        </div>
      </div>

      {/* Grid: Map on Left (7 cols), Weather on Right (5 cols) */}
      <div className="grid gap-4 lg:grid-cols-12">
        {/* Left: Map Card */}
        <div className="relative flex flex-col overflow-hidden rounded-md border border-line bg-surface lg:col-span-7 xl:col-span-8">
          {/* Map frame */}
          <div className="relative h-72 sm:h-80 lg:h-full min-h-[300px] w-full bg-surface2">
            <iframe
              title="แผนที่โครงการ STS-9.9 MW Biomass"
              src={embedMapsUrl}
              className="h-full w-full border-0"
              loading="lazy"
              allowFullScreen
            />

            {/* Floating location card */}
            <div className="absolute left-3 top-3 z-10 max-w-[280px] rounded-md border border-line bg-bg p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold leading-snug text-ink">{locationName}</h3>
                  <p className="mt-0.5 text-xs text-muted">
                    พิกัด: {lat}, {lon}
                  </p>
                </div>
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded p-1 text-muted transition-colors duration-200 hover:bg-surface2 hover:text-primary"
                  title="เปิดใน Google Maps"
                >
                  <ExternalLink className="h-4 w-4" aria-hidden />
                </a>
              </div>
            </div>
          </div>

          {/* Map status legend footer */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-2.5 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5 font-medium text-ink">
              <span className="h-2.5 w-2.5 rounded-full bg-success" />
              กำลังก่อสร้าง (On Plan)
            </span>
            <span>โครงการนำร่อง STS 9.9 MW Biomass</span>
          </div>
        </div>

        {/* Right: Weather Card */}
        <div className="flex flex-col justify-between rounded-md border border-line bg-surface p-5 lg:col-span-5 xl:col-span-4">
          <div>
            <div className="flex items-center justify-between gap-2 border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" aria-hidden />
                <span className="text-sm font-bold tracking-wide text-ink">{locationName}</span>
              </div>
              <Badge>กรมอุตุฯ / Live</Badge>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-extrabold tracking-tighter text-ink">
                  {loading ? "--" : weather?.temperature ?? 28}
                </span>
                <span className="text-2xl font-light text-muted">°C</span>
              </div>

              <div className="flex flex-col items-center gap-1">
                <ConditionIcon className="h-14 w-14 text-primary" aria-hidden />
                <span className="text-xs font-semibold text-muted">
                  {weather?.conditionLabel || "กำลังโหลดข้อมูล..."}
                </span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 rounded-md bg-surface2 p-2.5 text-center">
              <div>
                <span className="block text-[11px] text-muted">ความชื้น</span>
                <span className="text-sm font-bold text-ink">{weather?.humidity ?? 80}%</span>
              </div>
              <div className="border-x border-line">
                <span className="block text-[11px] text-muted">ความเร็วลม</span>
                <span className="text-sm font-bold text-ink">
                  {weather?.windSpeedMph ?? 7.5} <span className="text-[10px] font-normal text-muted">mph</span>
                </span>
              </div>
              <div>
                <span className="block text-[11px] text-muted">ปริมาณฝน</span>
                <span className="text-sm font-bold text-ink">{weather?.precipitation ?? 0} mm</span>
              </div>
            </div>
          </div>

          {/* Safety Alert Box (EPS Safety Rule Compliance) */}
          <div className="mt-4">
            <div className={`flex items-start gap-2.5 rounded-md p-3 text-xs leading-relaxed ${alert.className}`}>
              <AlertIcon className="h-4 w-4 shrink-0" aria-hidden />
              <div>
                <strong className="block font-semibold">{alert.label}</strong>
                <p className="mt-0.5 opacity-95">
                  {weather?.safetyAlert || "ลม < 14 mph และไม่มีฝนตกหนัก ปลอดภัยสำหรับงานที่สูงและงานยก"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Location Modal */}
      {showLocationModal && (
        <div
          className="fixed inset-0 z-modal flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowLocationModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="location-modal-title"
            className="w-full max-w-md rounded-md border border-line bg-bg p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="location-modal-title" className="text-lg font-bold text-ink">
              แก้ไขพิกัดและสถานที่ตั้งโครงการ
            </h3>
            <p className="mt-1 text-xs text-muted">
              กำหนดพิกัดละติจูดและลองจิจูดสำหรับหมุดแผนที่และการดึงข้อมูลสภาพอากาศ
            </p>

            <form onSubmit={handleSaveLocation} className="mt-4 flex flex-col gap-3">
              <Field label="ชื่อสถานที่ / โครงการ" htmlFor="location-name">
                <TextInput
                  ref={firstFieldRef}
                  id="location-name"
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  placeholder="เช่น อ.ทุ่งสง จ.นครศรีธรรมราช"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="ละติจูด (Latitude)" htmlFor="location-lat">
                  <TextInput
                    id="location-lat"
                    type="text"
                    value={tempLat}
                    onChange={(e) => setTempLat(e.target.value)}
                    placeholder="เช่น 8.096970"
                    required
                  />
                </Field>
                <Field label="ลองจิจูด (Longitude)" htmlFor="location-lon">
                  <TextInput
                    id="location-lon"
                    type="text"
                    value={tempLon}
                    onChange={(e) => setTempLon(e.target.value)}
                    placeholder="เช่น 99.682458"
                    required
                  />
                </Field>
              </div>

              <p className="rounded-md bg-surface2 p-3 text-xs text-muted">
                <strong className="font-semibold text-ink">เคล็ดลับ:</strong> คุณสามารถเปิด Google Maps
                คลิกขวาบนจุดก่อสร้างจริง แล้วคัดลอกพิกัดตัวเลขมาวางที่นี่ได้ตลอดเวลา
              </p>

              <div className="mt-2 flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setShowLocationModal(false)}>
                  ยกเลิก
                </Button>
                <Button type="submit">บันทึกพิกัดใหม่</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
