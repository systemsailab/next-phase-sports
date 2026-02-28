import { getFacility } from "@/lib/actions/facility";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FacilityForm } from "@/components/admin/facility-form";
import { HoursForm } from "@/components/admin/hours-form";
import { PoliciesForm } from "@/components/admin/policies-form";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type {
  OperatingHoursInput,
  CancellationPolicyInput,
  FacilityInput,
} from "@/lib/actions/facility";

export default async function SettingsPage() {
  const facility = await getFacility();

  if (!facility) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-64 text-center">
        <p className="text-slate-500 mb-4">No facility found. Create one to get started.</p>
        <Button asChild className="bg-emerald-500 hover:bg-emerald-600">
          <Link href="/admin/onboarding">Set Up Facility</Link>
        </Button>
      </div>
    );
  }

  const facilityDefaults: FacilityInput & { id: string } = {
    id: facility.id,
    name: facility.name,
    slug: facility.slug,
    description: facility.description ?? "",
    email: facility.email ?? "",
    phone: facility.phone ?? "",
    website: facility.website ?? "",
    address: facility.address ?? "",
    city: facility.city ?? "",
    state: facility.state ?? "",
    zip: facility.zip ?? "",
    timezone: facility.timezone ?? "America/Chicago",
  };

  const hoursDefaults = facility.operatingHours as OperatingHoursInput | null;

  const rawPolicy = facility.cancellationPolicy as Record<string, number> | null;
  const policiesDefaults: CancellationPolicyInput = {
    fullRefundHours: rawPolicy?.fullRefundHours ?? 48,
    creditOnlyHours: rawPolicy?.creditOnlyHours ?? 24,
    noRefundHours: rawPolicy?.noRefundHours ?? 2,
    bookingBufferMin: facility.bookingBufferMin ?? 0,
    requireWaiver: facility.requireWaiver ?? false,
    allowWalkIns: facility.allowWalkIns ?? true,
    unmannedMode: facility.unmannedMode ?? false,
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage your facility details, hours, and booking policies
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/settings/spaces">Manage Spaces →</Link>
        </Button>
      </div>

      <Tabs defaultValue="facility" className="w-full">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="facility">Facility</TabsTrigger>
          <TabsTrigger value="hours">Hours</TabsTrigger>
          <TabsTrigger value="policies">Policies</TabsTrigger>
        </TabsList>

        <TabsContent value="facility" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Facility Information</CardTitle>
              <CardDescription>
                Basic details about your facility visible on the booking page
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FacilityForm defaultValues={facilityDefaults} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hours" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Operating Hours</CardTitle>
              <CardDescription>Set when your facility is open each day of the week</CardDescription>
            </CardHeader>
            <CardContent>
              <HoursForm defaultValues={hoursDefaults} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="policies" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Booking Policies</CardTitle>
              <CardDescription>
                Configure cancellation rules, buffers, and facility behavior
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PoliciesForm defaultValues={policiesDefaults} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
