// Cloud Functions public entry point.
// Keep this file intentionally small: Firebase function names remain unchanged.

export {
  releaseReservedSlot,
  setUserRole,
  listAdminUsers,
  getAdminMyGoldOverview,
  setAdminUserDisabled,
  updateGoldRates,
} from "./admin/functions.js";

export {
  requestGoldExchangeGroup,
  rescheduleGoldExchangeGroup,
  cancelGoldExchangeGroup,
  setExchangeGroupStatus,
  aggregateGoldExchangeGroup,
  setBookingAvailability,
} from "./goldExchange/functions.js";

export {
  bindPushToken,
  onNotificationCreate,
  sendPushTestNotification,
  previewAdminNotificationRecipients,
  sendAdminNotification,
  recordAdminNotificationClick,
  listAdminNotificationSends,
  sendAdminExchangeDayBeforeSummary,
  sendExchangeVisitDayBeforeReminders,
  sendMyGoldWeeklyReports,
  cleanReservedSlots,
} from "./notifications/functions.js";


export {
  saveMyGoldAlertGoals,
  checkMyGoldAlertGoals,
} from "./notifications/myGoldAlerts.js";

export {
  checkNicknameAvailability,
  claimNickname,
  changeNickname,
  cleanupNicknameAfterAuthDelete,
  deleteMyAccount,
  submitGoldExchangeReview,
} from "./account/functions.js";

export {
  welcomeClaimGoldBonus,
  marketingPushClaimGoldBonus,
  memberBonusGetStatus,
  quizGetGoldBonusStatus,
  quizClaimGoldBonus,
  bonusGetGoldUsageState,
  bonusRequestGoldUsage,
  bonusCancelGoldUsage,
  bonusAdminConfirmGoldUsage,
  bonusAdminCancelGoldUsage,
} from "./rewards/functions.js";

export {
  auditGoldExchangeChanges,
  auditBonusGoldChanges,
} from "./audit.js";

export {
  syncKrxGoldPrice,
  refreshGoldPriceNow,
  saveGoldPriceSettings,
  publishPendingGoldPrice,
} from "./goldPrice/functions.js";
