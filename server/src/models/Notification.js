import mongoose from 'mongoose';

export const NOTIFICATION_TYPES = Object.freeze([
  'new_order',
  'order_approved',
  'dispatch_ready',
  'sale_authorized',
  'invoice_generated',
  'payment_recorded',
  'kyc_update',
]);

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    recipientLevel: Number,
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    message: { type: String, required: true },
    relatedEntity: {
      kind: { type: String, enum: ['Order', 'SalesOrder', 'DispatchForm', 'Invoice', 'Client'] },
      id: { type: mongoose.Schema.Types.ObjectId },
    },
    channels: { type: [String], enum: ['inapp', 'email', 'sms'], default: ['inapp'] },
    isRead: { type: Boolean, default: false, index: true },
    sentAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

export const Notification = mongoose.model('Notification', notificationSchema);
