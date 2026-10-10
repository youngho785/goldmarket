import assert from "node:assert/strict";
import { deleteApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getMessaging } from "firebase-admin/messaging";
const host = process.env.FIRESTORE_EMULATOR_HOST || "";
if (!/^(127\.0\.0\.1|localhost):\d+$/.test(host) ||
    process.env.GCLOUD_PROJECT !== "demo-goldmarket" ||
    !/^(127\.0\.0\.1|localhost):\d+$/.test(process.env.FIREBASE_AUTH_EMULATOR_HOST || "")) {
  throw Error("SAFETY STOP: demo localhost Firestore and Auth emulators only");
}
// Run the real notification handler with a stubbed sender below. No FCM network calls.
process.env.FUNCTIONS_EMULATOR = "false";
const { db, koreaDateKey, addDaysToDateKey, setReservedTime } = await import("../lib/core/runtime.js");
const { withPushDelivery, deliveryHash, MAX_PUSH_ATTEMPTS, PUSH_MAX_AGE_MS } = await import("../lib/notifications/delivery.js");
const { reconcileBonusUsageForGroup } = await import("../lib/rewards/reconciliation.js");
const { recoverGoldExchangeBonus } = await import("../lib/rewards/recovery.js");
const firestore = db();
const run = "ops-" + Date.now();
const cleanup = [];
const authCleanup = [];
const messaging = getMessaging();
const originalSender = messaging.sendEachForMulticast;
// Fail closed until an individual test installs its synthetic response.
messaging.sendEachForMulticast = async () => { throw Error("SAFETY STOP: no FCM sender configured"); };
try {
  const notificationPath = "notifications/test/items/" + run;
  const ref = firestore.doc("pushDeliveryReceipts/" + deliveryHash(notificationPath));
  cleanup.push(ref);
  const sent = [];
  let first = true;
  const attempt = async (receipts, acknowledge) => {
    for (const token of ["token-a", "token-b"]) {
      if (receipts.has(deliveryHash(token))) continue;
      if (token === "token-b" && first) { first=false; throw Error("temporary"); }
      sent.push(token);
      await acknowledge([token], 1);
    }
  };
  await assert.rejects(withPushDelivery(notificationPath, Date.now(), attempt), /temporary/);
  await withPushDelivery(notificationPath, Date.now(), attempt);
  await withPushDelivery(notificationPath, Date.now(), attempt);
  assert.deepEqual(sent, ["token-a", "token-b"]);
  assert.equal((await ref.get()).get("successes"), 2);
  console.log("PASS: partial success survives retry and repeated events");

  const busyPath = notificationPath+"-busy";
  const busyRef = firestore.doc("pushDeliveryReceipts/"+deliveryHash(busyPath));
  cleanup.push(busyRef);
  await busyRef.set({leaseUntilMs:Date.now()+60000, attempts:1});
  await assert.rejects(withPushDelivery(busyPath,Date.now(),()=>{throw Error("must not send");}), /LEASE_BUSY/);
  await busyRef.set({attempts:MAX_PUSH_ATTEMPTS});
  await withPushDelivery(busyPath,Date.now(),()=>{throw Error("must not send");});
  assert.equal((await busyRef.get()).get("status"), "exhausted");
  await withPushDelivery(notificationPath+"-old",Date.now()-PUSH_MAX_AGE_MS-1000,()=>{throw Error("must not send");});
  console.log("PASS: concurrency lease, attempt limit and age limit");

  const uid=run;
  const groupId=run;
  const group=firestore.doc("goldExchangeGroups/"+groupId);
  const user=firestore.doc("users/"+uid);
  const exchange=firestore.doc("goldExchanges/"+groupId);
  const redemption=firestore.doc("bonusGoldRedemptionRequests/"+uid);
  cleanup.push(group,user,exchange,redemption);
  await user.set({bonusGoldMilliGrams:1000,bonusGoldG:1});
  await group.set({ownerUid:uid,repStatus:"scheduled",bonusGoldUsageStatus:"used",
    bonusGoldUsedMilliGrams:2000,finalRecognizedG:10});
  await exchange.set({groupId,userId:uid,status:"scheduled"});
  await redemption.set({groupId,status:"used"});
  await reconcileBonusUsageForGroup({groupId,targetStatus:"canceled",adminUid:"test"});
  assert.equal((await user.get()).get("bonusGoldMilliGrams"),1000);
  console.log("PASS: stale cancellation cannot restore a newer reservation");

  // Simulate the callable finishing its transaction, then failing before reconciliation.
  await group.update({repStatus:"canceled"});
  await exchange.update({status:"canceled"});
  await recoverGoldExchangeBonus.run({params:{groupId}});
  await recoverGoldExchangeBonus.run({params:{groupId}});
  await reconcileBonusUsageForGroup({groupId,targetStatus:"canceled",adminUid:"test"});
  assert.equal((await user.get()).get("bonusGoldMilliGrams"),3000);
  assert.equal((await group.get()).get("bonusGoldUsageStatus"),"restored");
  assert.equal((await user.collection("ledger").get()).size,1);
  assert.equal((await firestore.collection("notifications").doc(uid).collection("items").get()).size,1);
  console.log("PASS: failed post-commit work recovers with exactly one credit and one notification");

  const { onNotificationCreate } = await import("../lib/notifications/functions.js");
  const { rescheduleGoldExchangeGroup, cancelGoldExchangeGroup } = await import("../lib/goldExchange/functions.js");
  const adminA = run + "-admin-a";
  const adminB = run + "-admin-b";
  await firestore.doc("users/" + adminA).set({role:"admin",admin:true,superAdmin:true});
  await firestore.doc("users/" + adminB).set({superAdmin:true});
  cleanup.push(firestore.doc("users/"+adminA),firestore.doc("users/"+adminB),
    firestore.doc("notifications/"+adminA),firestore.doc("notifications/"+adminB));
  const customer=run+"-customer";
  await getAuth().createUser({uid:customer,email:customer+"@example.test",emailVerified:true});
  authCleanup.push(customer);
  await firestore.doc("users/"+customer).set({});
  cleanup.push(firestore.doc("users/"+customer),firestore.doc("notifications/"+customer));
  let nextDay=addDaysToDateKey(koreaDateKey(),1);
  while(new Date(nextDay+"T00:00:00Z").getUTCDay()===0) nextDay=addDaysToDateKey(nextDay,1);
  let changedDay=addDaysToDateKey(nextDay,1);
  while(new Date(changedDay+"T00:00:00Z").getUTCDay()===0) changedDay=addDaysToDateKey(changedDay,1);
  const reservationId=run+"-reservation";
  const reservationGroup=firestore.doc("goldExchangeGroups/"+reservationId);
  const reservationRow=firestore.doc("goldExchanges/"+reservationId);
  const slots=firestore.doc("appConfig/reservedSlots");
  const availability=firestore.doc("appConfig/bookingAvailability");
  cleanup.push(reservationGroup,reservationRow,slots,availability);
  await availability.set({version:1,dates:{}});
  await slots.set(setReservedTime({},nextDay,"11:00",true));
  await reservationGroup.set({ownerUid:customer,repStatus:"requested",visitDate:nextDay,visitTime:"11:00"});
  await reservationRow.set({groupId:reservationId,userId:customer,name:"Synthetic customer",
    status:"requested",visitDate:nextDay,visitTime:"11:00"});
  const request={auth:{uid:customer,token:{email_verified:true}},
    data:{groupId:reservationId,visitDate:changedDay,visitTime:"12:00",reason:"Synthetic test"}};

  // Inject an administrator notification write failure in the real callable's transaction.
  const originalTransaction=firestore.runTransaction;
  const failAdminWrite=async callable => {
    firestore.runTransaction=function(callback,options) {
      return originalTransaction.call(this,tx => {
        const originalCreate=tx.create;
        tx.create=function(ref,...args) {
          if(ref.path.startsWith("notifications/"+adminA+"/")) throw Error("INJECTED_ADMIN_NOTIFICATION_FAILURE");
          return originalCreate.call(this,ref,...args);
        };
        return callback(tx);
      },options);
    };
    try { await assert.rejects(callable(),/INJECTED_ADMIN_NOTIFICATION_FAILURE/); }
    finally { firestore.runTransaction=originalTransaction; }
  };
  const countAdminType=async (admin,type) => (await firestore.collection("notifications")
    .doc(admin).collection("items").where("type","==",type).get()).size;
  await failAdminWrite(()=>rescheduleGoldExchangeGroup.run(request));
  assert.equal((await reservationGroup.get()).get("visitDate"),nextDay);
  assert.equal((await reservationRow.get()).get("status"),"requested");
  assert.equal((await firestore.doc("notifications/"+customer).collection("items").get()).size,0);
  assert.equal(await countAdminType(adminA,"admin_exchange_rescheduled"),0);
  assert.equal((await slots.get()).get(nextDay+".11:00"),true);
  console.log("PASS: administrator alert failure rolls back reschedule, slot and customer alert");

  // Force an ABORTED callback retry after all writes have been queued.
  let transactionCallbacks=0;
  firestore.runTransaction=function(callback,options) {
    return originalTransaction.call(this,async tx => {
      const result=await callback(tx);
      transactionCallbacks++;
      if(transactionCallbacks===1) { const error=Error("INJECTED_TRANSACTION_RETRY"); error.code=10; throw error; }
      return result;
    },options);
  };
  try { await rescheduleGoldExchangeGroup.run(request); }
  finally { firestore.runTransaction=originalTransaction; }
  assert.ok(transactionCallbacks>=2);
  for(const admin of [adminA,adminB]) assert.equal(await countAdminType(admin,"admin_exchange_rescheduled"),1);
  await assert.rejects(rescheduleGoldExchangeGroup.run(request));
  for(const admin of [adminA,adminB]) assert.equal(await countAdminType(admin,"admin_exchange_rescheduled"),1);
  console.log("PASS: transaction retry and repeated reschedule do not duplicate administrator alerts");

  const cancelRequest={auth:request.auth,data:{groupId:reservationId,reason:"Synthetic cancellation"}};
  await failAdminWrite(()=>cancelGoldExchangeGroup.run(cancelRequest));
  assert.equal((await reservationGroup.get()).get("repStatus"),"requested");
  assert.equal((await slots.get()).get(changedDay+".12:00"),true);
  for(const admin of [adminA,adminB]) assert.equal(await countAdminType(admin,"admin_exchange_canceled_by_customer"),0);
  await cancelGoldExchangeGroup.run(cancelRequest);
  await assert.rejects(cancelGoldExchangeGroup.run(cancelRequest));
  assert.equal((await reservationGroup.get()).get("repStatus"),"canceled");
  for(const admin of [adminA,adminB]) assert.equal(await countAdminType(admin,"admin_exchange_canceled_by_customer"),1);
  console.log("PASS: cancellation is atomic and creates one alert per deduplicated administrator");

  const campaignUser=run+"-campaign";
  const campaignUserRef=firestore.doc("users/"+campaignUser);
  cleanup.push(campaignUserRef,firestore.doc("notifications/"+campaignUser));
  await campaignUserRef.set({fcmTokens:["synthetic-token"],nativeFcmTokens:[]});
  const createCampaign=async suffix => {
    const batchId=run+"-"+suffix;
    const sendRef=firestore.doc("adminNotificationSends/"+batchId);
    const notification=firestore.doc("notifications/"+campaignUser+"/items/"+suffix);
    cleanup.push(sendRef);
    await sendRef.set({pushProcessedCount:0,pushAttemptedCount:0,pushSuccessCount:0,
      pushFailureCount:0,pushUnavailableCount:0});
    await notification.set({title:"Synthetic",body:"Synthetic",type:"admin_notice",
      meta:{source:"admin_manual",batchId},link:"/"});
    const receipt=firestore.doc("pushDeliveryReceipts/"+deliveryHash(notification.path));
    cleanup.push(receipt);
    return {sendRef,notification,receipt,event:{params:{uid:campaignUser,docId:suffix},data:await notification.get()}};
  };
  const response=success=>({successCount:success?1:0,failureCount:success?0:1,
    responses:[success?{success:true,messageId:"synthetic"}:
      {success:false,error:{code:"messaging/server-unavailable"}}]});
  const campaign=await createCampaign("retry-success");
  let sendCalls=0;
  messaging.sendEachForMulticast=async()=>response(++sendCalls>1);
  await assert.rejects(onNotificationCreate.run(campaign.event),/PUSH_DELIVERY_RETRY/);
  assert.equal((await campaign.sendRef.get()).get("pushProcessedCount"),0);
  assert.equal((await campaign.notification.get()).get("campaignDeliveryTrackedAt"),undefined);
  await onNotificationCreate.run(campaign.event);
  await onNotificationCreate.run(campaign.event);
  assert.equal(sendCalls,2);
  const campaignResult=(await campaign.sendRef.get()).data();
  assert.deepEqual([campaignResult.pushProcessedCount,campaignResult.pushAttemptedCount,
    campaignResult.pushSuccessCount,campaignResult.pushFailureCount,campaignResult.pushUnavailableCount],
    [1,1,1,0,0]);
  assert.equal((await campaign.notification.get()).get("campaignPushStatus"),"success");
  console.log("PASS: actual notification handler retries a temporary failure and records final success exactly once");

  const legacy=await createCampaign("legacy-failure");
  await legacy.sendRef.update({pushProcessedCount:1,pushAttemptedCount:1,pushFailureCount:1});
  await legacy.notification.update({campaignDeliveryTrackedAt:new Date(),campaignPushAttempted:true,
    campaignPushSuccess:false,campaignPushStatus:"failed"});
  messaging.sendEachForMulticast=async()=>response(true);
  await onNotificationCreate.run(legacy.event);
  await onNotificationCreate.run(legacy.event);
  const legacyResult=(await legacy.sendRef.get()).data();
  assert.deepEqual([legacyResult.pushProcessedCount,legacyResult.pushAttemptedCount,
    legacyResult.pushSuccessCount,legacyResult.pushFailureCount], [1,1,1,0]);
  console.log("PASS: legacy first-failure statistics upgrade to success without double counting");

  const statsRetry=await createCampaign("statistics-retry");
  let statsSendCalls=0;
  messaging.sendEachForMulticast=async()=>{statsSendCalls++;return response(true);};
  let failStats=true;
  firestore.runTransaction=function(callback,options) {
    return originalTransaction.call(this,tx => {
      const originalSet=tx.set;
      tx.set=function(ref,...args) {
        if(ref.path===statsRetry.sendRef.path && failStats) {failStats=false;throw Error("INJECTED_STATISTICS_FAILURE");}
        return originalSet.call(this,ref,...args);
      };
      return callback(tx);
    },options);
  };
  try { await assert.rejects(onNotificationCreate.run(statsRetry.event),/PUSH_DELIVERY_RETRY/); }
  finally {firestore.runTransaction=originalTransaction;}
  await onNotificationCreate.run(statsRetry.event);
  assert.equal(statsSendCalls,1);
  assert.equal((await statsRetry.sendRef.get()).get("pushSuccessCount"),1);
  assert.equal((await statsRetry.sendRef.get()).get("pushFailureCount"),0);
  console.log("PASS: statistics write failure recovers from receipts without resending FCM");

  const terminal=await createCampaign("terminal-failure");
  messaging.sendEachForMulticast=async()=>response(false);
  for(let attempt=0;attempt<MAX_PUSH_ATTEMPTS;attempt++) {
    await assert.rejects(onNotificationCreate.run(terminal.event),/PUSH_DELIVERY_RETRY/);
  }
  await onNotificationCreate.run(terminal.event);
  await onNotificationCreate.run(terminal.event);
  assert.equal((await terminal.receipt.get()).get("status"),"exhausted");
  assert.equal((await terminal.sendRef.get()).get("pushProcessedCount"),1);
  assert.equal((await terminal.sendRef.get()).get("pushFailureCount"),1);
  assert.equal((await terminal.sendRef.get()).get("pushSuccessCount"),0);
  console.log("PASS: exhausted retries finalize a single failure statistic");
} finally {
  messaging.sendEachForMulticast = originalSender;
  for (const authUid of authCleanup) await getAuth().deleteUser(authUid);
  for (const ref of cleanup.reverse()) await firestore.recursiveDelete(ref);
  await firestore.recursiveDelete(firestore.doc("notifications/"+run));
  for (const app of getApps()) await deleteApp(app);
}