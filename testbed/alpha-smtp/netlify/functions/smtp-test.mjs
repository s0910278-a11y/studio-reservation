import { getStore } from '@netlify/blobs';
import { createHandler } from '../../src/service.mjs';
import { createSender } from '../../src/smtp.mjs';

// Separate test-site scope persists across redeploys. Never the reservation site's store.
export default createHandler({
  getEnv: key => Netlify.env.get(key),
  storeFactory: () => getStore({ name: 'studio-smtp-test-v1', consistency: 'strong' }),
  senderFactory: createSender,
  audit: event => console.info(JSON.stringify(event)),
});
