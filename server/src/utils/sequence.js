import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});
const Counter = mongoose.model('Counter', counterSchema);

export async function nextSequence(key) {
  const doc = await Counter.findByIdAndUpdate(
    key,
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  return doc.seq;
}

const pad = (n, w = 5) => String(n).padStart(w, '0');

export async function nextSoNumber() {
  const year = new Date().getFullYear();
  const n = await nextSequence(`SO-${year}`);
  return `SO-${year}-${pad(n)}`;
}
export async function nextOrderNumber() {
  const year = new Date().getFullYear();
  const n = await nextSequence(`ORD-${year}`);
  return `ORD-${year}-${pad(n)}`;
}
export async function nextDispatchNumber() {
  const year = new Date().getFullYear();
  const n = await nextSequence(`DSP-${year}`);
  return `DSP-${year}-${pad(n)}`;
}
