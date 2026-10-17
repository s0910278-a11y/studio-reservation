// Run manually as the existing web-app deploying user after approving recovery.
// This checks Gmail authorization without sending mail or changing sheet data.
function checkExistingGmailAuthorization() {
  GmailApp.getAliases();
  console.info('GMAIL_AUTHORIZATION_OK: no email sent');
}
