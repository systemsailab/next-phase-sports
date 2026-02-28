import { getSpaces } from "@/lib/actions/spaces";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SpaceActions } from "./space-actions";

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default async function SpacesPage() {
  const spaces = await getSpaces();

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Spaces</h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage the bookable spaces in your facility
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/settings">← Settings</Link>
          </Button>
          <Button asChild className="bg-emerald-500 hover:bg-emerald-600" size="sm">
            <Link href="/admin/settings/spaces/new">+ New Space</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Spaces ({spaces.length})</CardTitle>
          <CardDescription>
            Spaces are shown to customers in the order listed below (sort order)
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {spaces.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-4xl mb-4">🏟️</p>
              <p className="text-slate-500 font-medium">No spaces yet</p>
              <p className="text-slate-400 text-sm mt-1 mb-6">
                Add your first bookable space to get started
              </p>
              <Button asChild className="bg-emerald-500 hover:bg-emerald-600">
                <Link href="/admin/settings/spaces/new">Create Space</Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Group</TableHead>
                  <TableHead>Hourly Rate</TableHead>
                  <TableHead>Min / Max</TableHead>
                  <TableHead>Bookings</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {spaces.map((space) => (
                  <TableRow key={space.id}>
                    <TableCell className="text-slate-400 text-sm">{space.sortOrder}</TableCell>
                    <TableCell className="font-medium text-slate-900">{space.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {space.type.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {space.groupName || "—"}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {formatCents(space.hourlyRate)}
                      {space.memberHourlyRate && (
                        <span className="text-emerald-600 text-xs ml-1">
                          ({formatCents(space.memberHourlyRate)} mbr)
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {space.minBookingMinutes}–{space.maxBookingMinutes} min
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {space._count.bookings}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          space.isActive
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }
                      >
                        {space.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <SpaceActions spaceId={space.id} isActive={space.isActive} bookingCount={space._count.bookings} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
