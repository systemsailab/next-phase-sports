import { notFound } from "next/navigation";
import { getSpace } from "@/lib/actions/spaces";
import type { SpaceInput } from "@/lib/schemas/spaces";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { SpaceForm } from "@/components/admin/space-form";

interface EditSpacePageProps {
  params: Promise<{ spaceId: string }>;
}

export default async function EditSpacePage({ params }: EditSpacePageProps) {
  const { spaceId } = await params;
  const space = await getSpace(spaceId);

  if (!space) notFound();

  // Convert cents → dollars for form display
  const defaultValues: Partial<SpaceInput> = {
    name: space.name,
    type: space.type as SpaceInput["type"],
    description: space.description ?? "",
    capacity: space.capacity,
    squareFootage: space.squareFootage,
    hourlyRate: space.hourlyRate / 100,
    halfHourRate: space.halfHourRate != null ? space.halfHourRate / 100 : null,
    memberHourlyRate: space.memberHourlyRate != null ? space.memberHourlyRate / 100 : null,
    minBookingMinutes: space.minBookingMinutes,
    maxBookingMinutes: space.maxBookingMinutes,
    bookingIncrements: space.bookingIncrements,
    bufferMinutes: space.bufferMinutes,
    groupName: space.groupName ?? "",
    sortOrder: space.sortOrder,
    isActive: space.isActive,
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/settings/spaces">← Spaces</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{space.name}</h1>
          <p className="text-slate-500 text-sm">Edit space details</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Space Details</CardTitle>
          <CardDescription>
            Update pricing, scheduling rules, and display settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SpaceForm spaceId={spaceId} defaultValues={defaultValues} />
        </CardContent>
      </Card>
    </div>
  );
}
