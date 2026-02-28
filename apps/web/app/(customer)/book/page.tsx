import { db } from "@/lib/db";
import { getCurrentFacilityId } from "@/lib/actions/facility";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { spaceTypeLabel, formatCents } from "@/lib/booking-utils";
import { MapPin, Clock, Users, ArrowRight, CalendarDays } from "lucide-react";

export default async function BookPage() {
  const facilityId = await getCurrentFacilityId();

  const [facility, spaces] = await Promise.all([
    facilityId
      ? db.facility.findUnique({
          where: { id: facilityId },
          select: { name: true, description: true, address: true, city: true, state: true },
        })
      : null,
    facilityId
      ? db.space.findMany({
          where: { facilityId, isActive: true },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        })
      : [],
  ]);

  return (
    <div className="space-y-8">
      {/* Hero header */}
      {facility && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 p-8 sm:p-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />
          <div className="relative z-10">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{facility.name}</h1>
            {facility.description && (
              <p className="text-slate-300 mt-2 max-w-2xl text-sm sm:text-base leading-relaxed">{facility.description}</p>
            )}
            <div className="flex items-center gap-2 mt-3 text-slate-400 text-sm">
              <MapPin className="w-3.5 h-3.5" />
              {facility.address}, {facility.city}, {facility.state}
            </div>
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Available Spaces</h2>
            <p className="text-slate-500 text-sm mt-0.5">
              Choose a space to check availability and book your session.
            </p>
          </div>
          <Badge variant="secondary" className="text-xs">
            {spaces.length} {spaces.length === 1 ? "space" : "spaces"}
          </Badge>
        </div>

        {spaces.length === 0 ? (
          <div className="text-center py-20 rounded-2xl border-2 border-dashed border-slate-200">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <CalendarDays className="w-8 h-8 text-slate-300" />
            </div>
            <p className="font-medium text-slate-500">No spaces available right now</p>
            <p className="text-sm text-slate-400 mt-1">Check back soon for available bookings.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {spaces.map((space) => (
              <Link
                key={space.id}
                href={`/book/${space.id}`}
                className="group relative flex flex-col bg-white rounded-2xl border border-slate-200/80 p-5 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-200"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">{space.name}</h3>
                    <Badge variant="secondary" className="mt-1.5 text-[11px] font-medium">
                      {spaceTypeLabel(space.type)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 group-hover:bg-emerald-50 transition-colors">
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>

                {space.description && (
                  <p className="text-slate-500 text-sm mb-4 line-clamp-2 leading-relaxed">
                    {space.description}
                  </p>
                )}

                {/* Price & details */}
                <div className="mt-auto pt-4 border-t border-slate-100 space-y-2">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold text-slate-900">{formatCents(space.hourlyRate)}</span>
                    <span className="text-sm text-slate-400">/hr</span>
                    {space.memberHourlyRate && (
                      <span className="ml-2 text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
                        Members: {formatCents(space.memberHourlyRate)}/hr
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    {space.capacity && (
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {space.capacity}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {space.minBookingMinutes} min
                    </span>
                    {space.groupName && (
                      <span>{space.groupName}</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
