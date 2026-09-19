export const AUDIT_ACTION_LABELS: Record<string, string> = {
  LOGIN_SUCCESS: "Tizimga kirdi",
  LOGIN_FAILED: "Kirish muvaffaqiyatsiz",
  PASSWORD_CHANGED: "Parolni almashtirdi",
  PASSWORD_RESET: "Parol tiklandi",
  USER_CREATED: "Foydalanuvchi yaratildi",
  USER_UPDATED: "Foydalanuvchi tahrirlandi",
  USER_ACTIVATED: "Foydalanuvchi faollashtirildi",
  USER_BLOCKED: "Foydalanuvchi bloklandi",
  ORG_CREATED: "Tashkilot yaratildi",
  ORG_UPDATED: "Tashkilot tahrirlandi",
  ORG_ACTIVATED: "Tashkilot faollashtirildi",
  ORG_DEACTIVATED: "Tashkilot faolsizlantirildi",
  DEPARTMENT_CREATED: "Bo'lim yaratildi",
  DEPARTMENT_UPDATED: "Bo'lim tahrirlandi",
  DEPARTMENT_ACTIVATED: "Bo'lim faollashtirildi",
  DEPARTMENT_DEACTIVATED: "Bo'lim faolsizlantirildi",
  TASK_CREATED: "Topshiriq yaratildi",
  TASK_UPDATED: "Topshiriq tahrirlandi",
  TASK_SUBMITTED: "Topshiriq ijroga topshirildi",
  TASK_ACCEPTED: "Topshiriq qabul qilindi",
  TASK_RETURNED: "Topshiriq qaytarildi",
  TASK_CANCELLED: "Topshiriq bekor qilindi",
  TASK_DELETED: "Topshiriq o'chirildi",
  TASK_RESTORED: "Topshiriq tiklandi",
};

export function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action;
}
