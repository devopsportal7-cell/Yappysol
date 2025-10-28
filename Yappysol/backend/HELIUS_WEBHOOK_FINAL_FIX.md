# Helius Webhook - Final Fix

## According to Helius Documentation

The [Helius Webhooks API](https://www.helius.dev/docs/api-reference/webhooks) recommends:
1. Use the **Helius SDK** for managing webhooks
2. The SDK provides `appendAddressesToWebhook()` method
3. Direct API calls require proper field structure

## What I Fixed

### Problem
The 400 error when adding addresses is because:
- We weren't fetching the full webhook details first
- We didn't know what fields Helius expects
- The GET list endpoint doesn't return `accountAddresses` field

### Solution
1. **Fetch full webhook details** using GET `/v0/webhooks/{id}`
2. **Extract existing addresses** from the full response
3. **Merge addresses** before updating
4. **Send complete payload** with all required fields

### Changes Made

```typescript
// NEW: Fetch full webhook details
const { data: webhookDetails } = await httpClient.get(
  `${this.baseUrl}/v0/webhooks/${this.webhookId}?api-key=${this.apiKey}`
);

// Extract existing addresses
const existingAddresses = webhookDetails?.accountAddresses || [];
const allAddresses = [...new Set([...existingAddresses, ...addresses])];

// Update with complete payload
const updatePayload = {
  webhookURL: currentWebhook.webhookURL,
  transactionTypes: currentWebhook.transactionTypes || ['ANY'],
  webhookType: currentWebhook.webhookType || 'enhanced',
  accountAddresses: allAddresses
};
```

## After Deployment, Expected Logs

```
[HELIUS_WEBHOOK] Using existing webhook { webhookId: "..." }
[HELIUS_WEBHOOK] Adding wallet addresses to webhook { addressCount: 7 }
[HELIUS_WEBHOOK] Merging addresses { existing: 2, new: 7, total: 7 }
[HELIUS_WEBHOOK] Updating webhook { webhookId: "...", addressCount: 7 }
[HELIUS_WEBHOOK] Wallet addresses added successfully { addedCount: 5, totalAddresses: 7 }
✅ Helius webhook service initialized
```

## Next Steps

1. **Deploy this fix**
2. **Check Render logs** for the new log messages
3. **Verify in Helius dashboard** - should see all 7 addresses
4. **Test with a transaction** - webhook should receive and process it

If this still fails, the logs will show the exact URL and payload being sent, which will help debug.
