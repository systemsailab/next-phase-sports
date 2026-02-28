import { db } from "@/lib/db";
import { getCurrentFacilityId } from "@/lib/actions/facility";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { spaceTypeLabel, formatCents } from "@/lib/booking-utils";

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
      {facility && (
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{facility.name}</h1>
          {facility.description && (
            <p className="text-slate-500 mt-2 max-w-2xl">{facility.description}</p>
          )}
          <p className="text-slate-400 text-sm mt-1">
            {facility.address}, {facility.city}, {facility.state}
          </p>
        </div>
      )}

      <div>
        <h2 className="text-xl font-semibold text-slate-800 mb-4">Book a Space</h2>
        <p className="text-slate-500 text-sm mb-6">
          Choose a space below to check availability and book your session.
        </p>

        {spaces.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <p className="text-4xl mb-3">🏟️</p>
            <p>No spaces available right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {spaces.map((space) => (
              <Card key={space.id} className="flex flex-col hover:shadow-md transition-shadow">
                <CardContent className="pt-6 flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-slate-900">{space.name}</h3>
                      <Badge variant="secondary" className="mt-1 text-xs">
                        {spaceTypeLabel(space.type)}
                      </Badge>
                    </div>
                    {space.groupName && (
                      <span className="text-xs text-slate-400">{space.groupName}</span>
                    )}
                  </div>

                  {space.description && (
                    <p className="text-slate-500 text-sm mb-3 line-clamp-2">
                      {space.description}
                    </p>
                  )}

                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between text-slate-600">
                      <span>Hourly rate</span>
                      <span className="font-medium text-slate-900">
                        {formatCents(space.hourlyRate)}/hr
                      </span>
                    </div>
                    {space.memberHourlyRate && (
                      <div className="flex justify-between text-slate-500">
                        <span>Member rate</span>
                        <span className="text-emerald-600 font-medium">
                          {formatCents(space.memberHourlyRate)}/hr
                        </span>
                      </div>
                    )}
                    {space.capacity && (
                      <div className="flex justify-between text-slate-500">
                        <span>Capacity</span>
                        <span>{space.capacity} people</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-500">
                      <span>Min booking</span>
                      <span>{space.minBookingMinutes} min</span>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="pt-0">
                  <Button asChild className="w-full bg-emerald-500 hover:bg-emerald-600">
                    <Link href={`/book/${space.id}`}>Check Availability →</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
