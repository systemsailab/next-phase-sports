import { db } from "@/lib/db";
import { getCurrentFacilityId } from "@/lib/actions/facility";
import { notFound } from "next/navigation";
import { BookingFlow } from "@/components/booking/booking-flow";
import { spaceTypeLabel } from "@/lib/booking-utils";

interface Props {
  params: Promise<{ spaceId: string }>;
}

export default async function BookSpacePage({ params }: Props) {
  const { spaceId } = await params;
  const facilityId = await getCurrentFacilityId();

  if (!facilityId) notFound();

  const space = await db.space.findFirst({
    where: { id: spaceId, facilityId, isActive: true },
    select: {
      id: true,
      name: true,
      type: true,
      description: true,
      capacity: true,
      hourlyRate: true,
      halfHourRate: true,
      memberHourlyRate: true,
      minBookingMinutes: true,
      maxBookingMinutes: true,
      bookingIncrements: true,
    },
  });

  if (!space) notFound();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <div className="text-sm text-slate-400 mb-1">
          <a href="/book" className="hover:text-slate-600 transition-colors">
            ← All Spaces
          </a>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">{space.name}</h1>
        <p className="text-slate-500 text-sm">{spaceTypeLabel(space.type)}</p>
        {space.description && (
          <p className="text-slate-500 text-sm mt-1">{space.description}</p>
        )}
      </div>

      <BookingFlow space={space} />
    </div>
  );
}
