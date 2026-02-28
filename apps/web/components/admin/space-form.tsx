"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SPACE_TYPES, type SpaceInput } from "@/lib/schemas/spaces";
import { createSpace, updateSpace } from "@/lib/actions/spaces";

// Local form schema: uses z.number() so react-hook-form infers types correctly
// (SpaceSchema uses z.coerce.number() which causes zodResolver type inference issues)
const SpaceFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum([
    "TURF_FIELD", "GRASS_FIELD", "COURT", "BATTING_CAGE",
    "PITCHING_TUNNEL", "WEIGHT_ROOM", "TRAINING_ROOM", "CLASSROOM",
    "PARTY_ROOM", "POOL", "TRACK", "RINK", "OTHER",
  ]),
  description: z.string().optional(),
  capacity: z.number().int().positive().optional().nullable(),
  squareFootage: z.number().int().positive().optional().nullable(),
  hourlyRate: z.number().positive("Hourly rate is required"),
  halfHourRate: z.number().positive().optional().nullable(),
  memberHourlyRate: z.number().positive().optional().nullable(),
  minBookingMinutes: z.number().int().positive(),
  maxBookingMinutes: z.number().int().positive(),
  bookingIncrements: z.number().int().positive(),
  bufferMinutes: z.number().int().nonnegative().optional().nullable(),
  groupName: z.string().optional(),
  sortOrder: z.number().int().nonnegative(),
  isActive: z.boolean(),
});
type SpaceFormValues = z.infer<typeof SpaceFormSchema>;

interface SpaceFormProps {
  spaceId?: string;
  defaultValues?: Partial<SpaceFormValues>;
}

const FORM_DEFAULTS: SpaceFormValues = {
  name: "",
  type: "TURF_FIELD",
  description: "",
  capacity: null,
  squareFootage: null,
  hourlyRate: 0,
  halfHourRate: null,
  memberHourlyRate: null,
  minBookingMinutes: 60,
  maxBookingMinutes: 180,
  bookingIncrements: 30,
  bufferMinutes: null,
  groupName: "",
  sortOrder: 0,
  isActive: true,
};

export function SpaceForm({ spaceId, defaultValues }: SpaceFormProps) {
  const router = useRouter();
  const isEditing = !!spaceId;

  const form = useForm<SpaceFormValues>({
    resolver: zodResolver(SpaceFormSchema),
    defaultValues: { ...FORM_DEFAULTS, ...defaultValues },
  });

  async function onSubmit(values: SpaceFormValues) {
    try {
      if (isEditing) {
        await updateSpace(spaceId, values);
        toast.success("Space updated");
      } else {
        await createSpace(values);
        toast.success("Space created");
        router.push("/admin/settings/spaces");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save space");
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Basic Info */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Basic Info</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Space Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Turf Field 1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SPACE_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="mt-4">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe this space for customers..."
                      className="resize-none"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
            <FormField
              control={form.control}
              name="capacity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Capacity (optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      placeholder="20"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(e.target.value === "" ? null : parseInt(e.target.value, 10))
                      }
                    />
                  </FormControl>
                  <FormDescription>Max people</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="squareFootage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sq. Footage (optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      placeholder="5000"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(e.target.value === "" ? null : parseInt(e.target.value, 10))
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="groupName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Group Name (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Turf Fields" {...field} />
                  </FormControl>
                  <FormDescription>Groups spaces in display</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Pricing */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Pricing (USD)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="hourlyRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hourly Rate *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                        $
                      </span>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        placeholder="75.00"
                        className="pl-7"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="halfHourRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Half-Hour Rate</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                        $
                      </span>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        placeholder="45.00"
                        className="pl-7"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(e.target.value === "" ? null : parseFloat(e.target.value))
                        }
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="memberHourlyRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Member Rate</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                        $
                      </span>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        placeholder="55.00"
                        className="pl-7"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(e.target.value === "" ? null : parseFloat(e.target.value))
                        }
                      />
                    </div>
                  </FormControl>
                  <FormDescription>For active members</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Scheduling */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Scheduling</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <FormField
              control={form.control}
              name="minBookingMinutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Min Booking (min)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={15}
                      step={15}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="maxBookingMinutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Booking (min)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={15}
                      step={15}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bookingIncrements"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Increments (min)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={15}
                      step={15}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                    />
                  </FormControl>
                  <FormDescription>Time slot granularity</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bufferMinutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Buffer (min)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step={5}
                      placeholder="0"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(e.target.value === "" ? null : parseInt(e.target.value, 10))
                      }
                    />
                  </FormControl>
                  <FormDescription>Gap between bookings</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Admin */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="sortOrder"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sort Order</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                  />
                </FormControl>
                <FormDescription>Lower = appears first</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <FormLabel className="text-base">Active</FormLabel>
                <FormDescription>
                  Inactive spaces are hidden from the booking calendar
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="data-[state=checked]:bg-emerald-500"
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex items-center gap-3 justify-end border-t pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/admin/settings/spaces")}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="bg-emerald-500 hover:bg-emerald-600"
          >
            {form.formState.isSubmitting
              ? "Saving..."
              : isEditing
              ? "Update Space"
              : "Create Space"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
