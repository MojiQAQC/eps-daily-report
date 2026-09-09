import { NextResponse } from "next/server";

// WMO Weather interpretation codes (http://www.nodc.noaa.gov/archive/arc0021/0002199/1.1/data/0-data/HTML/WMO-CODE/WMO4677.HTM)
function getWeatherCondition(code: number): {
  label: string;
  icon: "sunny" | "cloudy" | "rain" | "heavy-rain" | "thunderstorm" | "fog";
  badge: "แดดแรง" | "ฝนตก" | "ฟ้าคะนอง" | "ลมแรง" | "ปกติ";
} {
  if (code === 0) {
    return { label: "ท้องฟ้าแจ่มใส แดดแรง", icon: "sunny", badge: "แดดแรง" };
  }
  if (code === 1 || code === 2 || code === 3) {
    return { label: "มีเมฆเป็นส่วนมาก สภาพปกติ", icon: "cloudy", badge: "ปกติ" };
  }
  if (code === 45 || code === 48) {
    return { label: "มีหมอกหรือทัศนวิสัยจำกัด", icon: "fog", badge: "ปกติ" };
  }
  if (code >= 51 && code <= 67) {
    return { label: "มีฝนตกต่อเนื่อง", icon: "rain", badge: "ฝนตก" };
  }
  if (code >= 80 && code <= 82) {
    return { label: "ฝนตกหนัก", icon: "heavy-rain", badge: "ฝนตก" };
  }
  if (code >= 95) {
    return { label: "ฝนฟ้าคะนอง", icon: "thunderstorm", badge: "ฟ้าคะนอง" };
  }
  return { label: "ปกติ", icon: "cloudy", badge: "ปกติ" };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat") || "8.096970";
  const lon = searchParams.get("lon") || "99.682458";

  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&timezone=Asia%2FBangkok`,
      { next: { revalidate: 600 } } // Cache 10 minutes
    );

    if (!res.ok) {
      throw new Error(`Weather API error: ${res.statusText}`);
    }

    const data = await res.json();
    const current = data.current || {};
    const temp = Math.round(current.temperature_2m ?? 30);
    const humidity = current.relative_humidity_2m ?? 75;
    const precip = current.precipitation ?? 0;
    const windSpeedKmh = current.wind_speed_10m ?? 10;
    const windSpeedMph = Math.round((windSpeedKmh * 0.621371) * 10) / 10;
    const weatherCode = current.weather_code ?? 1;

    const condition = getWeatherCondition(weatherCode);

    // EPS Safety threshold check
    // Rules from EPS Daily Report:
    // *หากปริมาณลม 14 mph: หยุดงานที่สูง, งานยก และหากมีฝน 90% Wet Surfaces หยุดงาน ที่สูง ยก เชื่อมไฟฟ้า
    const isHighWind = windSpeedMph >= 14;
    const isRain = precip > 0 || condition.icon === "rain" || condition.icon === "heavy-rain" || condition.icon === "thunderstorm";

    let safetyAlert = "สภาพอากาศปกติ ปลอดภัยสำหรับการปฏิบัติงานตามแผน";
    let alertLevel: "safe" | "warning" | "danger" = "safe";

    if (isHighWind && isRain) {
      safetyAlert = "แจ้งเตือนวิกฤต: ลมแรงเกิน 14 mph และมีฝนตก — หยุดงานที่สูง งานยก และงานเชื่อมไฟฟ้าทันทีตามกฎ EPS";
      alertLevel = "danger";
    } else if (isHighWind) {
      safetyAlert = `แจ้งเตือนลมแรง (${windSpeedMph} mph / เกินเกณฑ์ 14 mph) — หยุดงานที่สูงและงานยกตามกฎความปลอดภัย EPS`;
      alertLevel = "warning";
    } else if (isRain) {
      safetyAlert = "มีฝนตกในพื้นที่ไซต์งาน — ระวังพื้นเปียกลื่น และตรวจสอบความปลอดภัยก่อนปฏิบัติงาน";
      alertLevel = "warning";
    }

    return NextResponse.json({
      success: true,
      location: {
        district: "ทุ่งสง",
        province: "นครศรีธรรมราช",
        country: "ไทย",
        latitude: parseFloat(lat),
        longitude: parseFloat(lon),
      },
      updatedAt: current.time || new Date().toISOString(),
      temperature: temp,
      humidity,
      precipitation: precip,
      windSpeedKmh: Math.round(windSpeedKmh * 10) / 10,
      windSpeedMph,
      weatherCode,
      conditionLabel: condition.label,
      conditionIcon: condition.icon,
      conditionBadge: isHighWind ? "ลมแรง" : condition.badge,
      safetyAlert,
      alertLevel,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to fetch weather",
        // Fallback realistic data
        location: {
          district: "ทุ่งสง",
          province: "นครศรีธรรมราช",
          country: "ไทย",
          latitude: parseFloat(lat),
          longitude: parseFloat(lon),
        },
        updatedAt: new Date().toISOString(),
        temperature: 30,
        humidity: 80,
        precipitation: 0,
        windSpeedKmh: 12,
        windSpeedMph: 7.5,
        weatherCode: 2,
        conditionLabel: "มีเมฆเป็นส่วนมาก สภาพปกติ",
        conditionIcon: "cloudy",
        conditionBadge: "ปกติ",
        safetyAlert: "สภาพอากาศปกติ ปลอดภัยสำหรับการปฏิบัติงานตามแผน",
        alertLevel: "safe",
      },
      { status: 200 }
    );
  }
}
