"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  OperatingHoursSchema,
  OperatingHoursInput,
  updateOperatingHours,
} from "@/lib/actions/facility";

const DAYS = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
] as const;

const DEFAULT_HOURS: OperatingHoursInput = {
  monday: { open: "06:00", close: "22:00", closed: false },
  tuesday: { open: "06:00", close: "22:00", closed: false },
  wednesday: { open: "06:00", close: "22:00", closed: false },
  thursday: { open: "06:00", close: "22:00", closed: false },
  friday: { open: "06:00", close: "22:00", closed: false },
  saturday: { open: "08:00", close: "20:00", closed: false },
  sunday: { open: "10:00", close: "18:00", closed: true },
};

interface HoursFormProps {
  defaultValues?: OperatingHoursInput | null;
}

export function HoursForm({ defaultValues }: HoursFormProps) {
  const form = useForm<OperatingHoursInput>({
    resolver: zodResolver(OperatingHoursSchema),
    defaultValues: defaultValues ?? DEFAULT_HOURS,
  });

  const watched = form.watch();

  async function onSubmit(values: OperatingHoursInput) {
    try {
      await updateOperatingHours(values);
      toast.success("Operating hours saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600 w-32">Day</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600 w-24">Open</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Opening Time</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Closing Time</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {DAYS.map(({ key, label }) => {
              const isClosed = watched[key]?.closed ?? false;
              return (
                <tr key={key} className={isClosed ? "bg-slate-50 opacity-60" : "bg-white"}>
                  <td className="px-4 py-3 font-medium text-slate-700">{label}</td>
                  <td className="px-4 py-3">
                    <Switch
                      checked={!isClosed}
                      onCheckedChange={(val) =>
                        form.setValue(`${key}.closed`, !val, { shouldDirty: true })
                      }
                      className="data-[state=checked]:bg-emerald-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Input
                      type="time"
                      disabled={isClosed}
                      className="w-36"
                      {...form.register(`${key}.open`)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Input
                      type="time"
                      disabled={isClosed}
                      className="w-36"
                      {...form.register(`${key}.close`)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          Times are in your facility&apos;s configured timezone.
        </p>
        <Button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="bg-emerald-500 hover:bg-emerald-600"
        >
          {form.formState.isSubmitting ? "Saving..." : "Save Hours"}
        </Button>
      </div>
    </form>
  );
}
