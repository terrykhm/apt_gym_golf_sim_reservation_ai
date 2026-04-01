/**
 * Single place to adapt UI state → API payload for a future backend / Retell job.
 */
import type {
  BookingPreferencePayload,
  OrderedSlotsByDate,
  ResidentId,
} from "../types";
import { buildBookingPreferencePayload } from "./time";

export function preferencesToPayload(
  residentId: ResidentId,
  residentName: string,
  orderedByDate: OrderedSlotsByDate,
  datesInOrder: string[]
): BookingPreferencePayload {
  return buildBookingPreferencePayload(
    residentId,
    residentName,
    orderedByDate,
    datesInOrder
  );
}
