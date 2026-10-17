// Manual recovery checks for the existing Gmail web-app owner.
// No booking/sheet changes, customer recipients, CC, or BCC.
function checkExistingGmailAuthorization() {
  GmailApp.getAliases();
  console.info('GMAIL_AUTHORIZATION_OK');
}

function sendGmailRecoveryTest20261017() {
  GmailApp.getAliases();
  var lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    var props = PropertiesService.getScriptProperties();
    var key = 'GMAIL_RECOVERY_TEST_20261017';
    if (props.getProperty(key)) {
      console.info('GMAIL_RECOVERY_TEST_ALREADY_ATTEMPTED');
      return;
    }
    // Keep this claim even if sendEmail throws: delivery may be uncertain.
    props.setProperty(key, 'attempted');
    GmailApp.sendEmail(
      's0910278@gmail.com',
      '【復旧確認テスト 20261017】楽器スタジオ予約メール',
      'Gmail送信権限の復旧確認です。予約データは変更していません。',
      { name: '【予約完了】ハードオフ八王子大和田店 楽器スタジオ' }
    );
    props.setProperty(key, 'sent');
    console.info('GMAIL_RECOVERY_TEST_SENT');
  } finally {
    lock.releaseLock();
  }
}
