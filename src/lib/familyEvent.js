// 경조사 설정 (2026-05-01 버전)
// days: 지급 연차(일), money: 경조금(원), wreath: 화환 제공 여부, note: 비고
export const FAMILY_EVENT_VERSION = "2026-05-01";

export const FAMILY_EVENT_CONFIG = {
  MARRIAGE: {
    label: "결혼",
    relations: [
      { value: "SELF", label: "본인", days: 5, money: 2000000, wreath: true },
      { value: "CHILD", label: "자녀", days: 2, money: 500000, wreath: true },
      { value: "SIBLING", label: "형제자매", days: 0, money: 200000, wreath: false },
      {
        value: "SPOUSE_SIBLING",
        label: "배우자의 형제자매",
        days: 0,
        money: 200000,
        wreath: false,
      },
    ],
  },
  DEATH: {
    label: "사망",
    relations: [
      { value: "SPOUSE", label: "배우자", days: 5, money: 5000000, wreath: true },
      { value: "PARENT", label: "부모", days: 5, money: 3000000, wreath: true },
      {
        value: "SPOUSE_PARENT",
        label: "배우자의 부모",
        days: 5,
        money: 3000000,
        wreath: true,
      },
      { value: "CHILD", label: "자녀", days: 5, money: 3000000, wreath: true },
      { value: "GRANDPARENT", label: "조부모", days: 2, money: 300000, wreath: false },
      {
        value: "SPOUSE_GRANDPARENT",
        label: "배우자의 조부모",
        days: 1,
        money: 200000,
        wreath: false,
      },
      { value: "SIBLING", label: "형제자매", days: 2, money: 500000, wreath: false },
      {
        value: "SPOUSE_SIBLING",
        label: "배우자의 형제자매",
        days: 2,
        money: 300000,
        wreath: false,
      },
    ],
  },
  BIRTH: {
    label: "출산",
    relations: [
      {
        value: "SELF",
        label: "본인",
        days: 90,
        money: 2000000,
        wreath: false,
        note: "출산 후 최소 45일 이상 사용",
      },
      {
        value: "SPOUSE",
        label: "배우자",
        days: 10,
        money: 2000000,
        wreath: false,
        note: "출산 후 90일 이내 사용",
      },
    ],
  },
};

export const FAMILY_EVENT_TYPES = Object.entries(FAMILY_EVENT_CONFIG).map(
  ([value, cfg]) => ({ value, label: cfg.label }),
);

// 특정 경조사 대상 정보 조회
export function getFamilyEventInfo(eventType, relation) {
  const ev = FAMILY_EVENT_CONFIG[eventType];
  if (!ev) return null;
  return ev.relations.find((r) => r.value === relation) || null;
}

// "결혼 (본인)" 형태의 라벨 생성
export function getFamilyEventLabel(eventType, relation) {
  const ev = FAMILY_EVENT_CONFIG[eventType];
  if (!ev) return "경조사";
  const info = ev.relations.find((r) => r.value === relation);
  return info ? `${ev.label} (${info.label})` : ev.label;
}

// 시작일(YYYY-MM-DD) + 지급 일수를 연속 달력일로 환산하여 종료일 반환
export function computeFamilyEventEndDate(startDate, days) {
  const [y, m, d] = startDate.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + Math.max(days - 1, 0));
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

// 경조금 포맷 (1,000,000)
export function formatMoney(amount) {
  return Number(amount || 0).toLocaleString("ko-KR");
}
