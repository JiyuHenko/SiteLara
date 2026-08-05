/*
  Integração LB FIT com Google Apps Script.
  Ao atualizar a implantação no Apps Script, mantenha a mesma URL /exec.
*/
window.LBFIT_FORM_CONFIG = {
  googleAppsScriptUrl: "https://script.google.com/macros/s/AKfycbz32cTEu1vEiWue74tuZEv_mtXJTWzF7yY9WkHjcRXPGdV5pCV983jq0HmJSHnaaPVLKg/exec",
  messageOrigins: [
    "https://script.google.com",
    "https://script.googleusercontent.com",
    "https://larabiagioni.com.br"
  ],
  draftStorageKey: "lbfit-influencer-application-v2",
  confirmationPollIntervalMs: 1100,
  confirmationTimeoutMs: 9000,
  optimisticSuccessDelayMs: 7000,
  pendingSubmissionStorageKey: "lbfit-pending-submission-v1"
};
