import crypto from 'crypto';
import { NextFunction, Response } from 'express';
import { config } from '../config/env';
import knex from '../database/connection';
import { WebhookRequest } from '../types/webhook.types';
import { ApiError } from '../utils/ApiError';

// Middleware to capture raw body for webhook signature verification
export const rawBodyParser = (
  req: WebhookRequest,
  res: Response,
  next: NextFunction
) => {
  req.rawBody = '';
  req.setEncoding('utf8');

  req.on('data', (chunk: string) => {
    req.rawBody += chunk;
  });

  req.on('end', () => {
    next();
  });
};

// Verify webhook signature using HMAC SHA256
const verifySignature = (
  secret: string,
  payload: string,
  signatureHeader?: string
): boolean => {
  if (!signatureHeader) return false;

  const computed = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  const normalizedHeader = signatureHeader.replace(/^sha256=/i, '');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(computed, 'hex'),
      Buffer.from(normalizedHeader, 'hex')
    );
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return false;
  }
};

// Get provider details and verify webhook signature
export const webhookAuthMiddleware = async (
  req: WebhookRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const providerName = req.params.provider?.toLowerCase();
    if (!providerName) {
      throw new ApiError(400, 'Provider not specified');
    }

    // Get provider config from database
    const provider = await knex('providers')
      .where({ name: providerName, is_active: true })
      .first();

    if (!provider) {
      throw new ApiError(404, 'Provider not found or inactive');
    }

    // Get signature from appropriate header based on provider
    let signatureHeader;
    switch (providerName) {
      case 'palmpay':
        signatureHeader = req.get(config.webhooks.palmpay.signatureHeader);
        break;
      case 'paystack':
        signatureHeader = req.get('x-paystack-signature');
        break;
      case 'flutterwave':
        signatureHeader = req.get('verif-hash');
        break;
      default:
        signatureHeader = req.get(config.webhooks.palmpay.signatureHeader); // fallback
        break;
    }

    const webhookSecret =
      provider.webhook_secret || config.webhooks.palmpay.secret;

    if (!webhookSecret) {
      throw new ApiError(500, 'Webhook secret not configured');
    }

    const raw = req.rawBody || JSON.stringify(req.body);
    const signatureOk = verifySignature(webhookSecret, raw, signatureHeader);

    if (!signatureOk) {
      throw new ApiError(400, 'Invalid webhook signature');
    }

    // Store webhook event for audit
    const eventType = req.body.event_type || req.body.type || null;
    const eventId = req.body.event_id || req.body.id || req.body.txn_id || null;

    // Since we already fetched the provider above and verified it exists and is active,
    // we can use its ID directly
    const providerId = provider.id;

    const [webhookEvent] = await knex('webhook_events')
      .insert({
        provider_id: providerId,
        event_type: eventType,
        event_id: eventId,
        payload: req.body,
        headers: req.headers,
        signature_ok: signatureOk,
        processed: false,
        created_at: new Date(),
      })
      .returning('*');

    // Attach webhook event to request for use in subsequent middleware/controller
    req.webhookEvent = webhookEvent;

    next();
  } catch (error) {
    next(error);
  }
};
