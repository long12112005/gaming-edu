// Cấu hình URL Backend dùng chung cho REST API và SignalR Hub.
// NEXT_PUBLIC_API_URL có thể khai báo có hoặc không có hậu tố "/api".
const raw = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

/** Gốc server, ví dụ http://localhost:5000 (dùng cho SignalR: /hubs/...) */
export const API_ORIGIN = raw.replace(/\/+$/, "").replace(/\/api$/i, "");

/** Gốc REST API, ví dụ http://localhost:5000/api */
export const API_URL = `${API_ORIGIN}/api`;
