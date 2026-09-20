//! Форматирование Unix-времени в ISO-8601 UTC без дополнительных crate.

/// Текущее Unix-время в миллисекундах. При сбое часов — `0`.
pub(crate) fn unix_millis_now() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

/// Форматирует Unix-миллисекунды как `YYYY-MM-DDTHH:MM:SS.mmmZ`.
pub(crate) fn millis_to_iso8601(millis: u64) -> String {
    let secs = millis / 1000;
    let ms = millis % 1000;
    let days = (secs / 86_400) as i64;
    let tod = secs % 86_400;
    let hour = tod / 3600;
    let min = (tod % 3600) / 60;
    let sec = tod % 60;
    let (year, month, day) = civil_from_unix_days(days);
    format!("{year:04}-{month:02}-{day:02}T{hour:02}:{min:02}:{sec:02}.{ms:03}Z")
}

/// Гражданская дата UTC из числа суток с Unix epoch (алгоритм Howard Hinnant).
fn civil_from_unix_days(days: i64) -> (i32, u32, u32) {
    let z = days + 719_468;
    let era = if z >= 0 { z } else { z - 146_096 }.div_euclid(146_097);
    let doe = (z - era * 146_097) as u32;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let mut year = yoe as i32 + era as i32 * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let day = doy - (153 * mp + 2) / 5 + 1;
    let month = if mp < 10 { mp + 3 } else { mp - 9 };
    if month <= 2 {
        year += 1;
    }
    (year, month, day)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn epoch_is_1970_01_01() {
        assert_eq!(millis_to_iso8601(0), "1970-01-01T00:00:00.000Z");
    }

    #[test]
    fn known_instant_formats() {
        assert_eq!(
            millis_to_iso8601(1_704_067_200_000),
            "2024-01-01T00:00:00.000Z"
        );
    }
}
