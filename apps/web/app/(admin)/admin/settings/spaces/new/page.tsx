import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { SpaceForm } from "@/components/admin/space-form";

export default function NewSpacePage() {
  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/settings/spaces">← Spaces</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New Space</h1>
          <p className="text-slate-500 text-sm">Add a new bookable space to your facility</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Space Details</CardTitle>
          <CardDescription>
            Configure pricing, scheduling rules, and display settings for this space
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SpaceForm />
        </CardContent>
      </Card>
    </div>
  );
}
