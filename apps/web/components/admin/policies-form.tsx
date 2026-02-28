"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Switch } from "@/components/ui/switch";
import { z } from "zod";
import {
  CancellationPolicyInput,
  updateFacilityPolicies,
} from "@/lib/actions/facility";

// Local schema using z.number() (not coerce) since fields are React-controlled
const PoliciesFormSchema = z.object({
  fullRefundHours: z.number().int().nonnegative(),
  creditOnlyHours: z.number().int().nonnegative(),
  noRefundHours: z.number().int().nonnegative(),
  bookingBufferMin: z.number().int().nonnegative(),
  requireWaiver: z.boolean(),
  allowWalkIns: z.boolean(),
  unmannedMode: z.boolean(),
});
type PoliciesFormValues = z.infer<typeof PoliciesFormSchema>;

interface PoliciesFormProps {
  defaultValues: CancellationPolicyInput;
}

export function PoliciesForm({ defaultValues }: PoliciesFormProps) {
  const form = useForm<PoliciesFormValues>({
    resolver: zodResolver(PoliciesFormSchema),
    defaultValues,
  });

  async function onSubmit(values: PoliciesFormValues) {
    try {
      await updateFacilityPolicies(values);
      toast.success("Policies saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Cancellation Windows */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-1">Cancellation Policy</h3>
          <p className="text-xs text-slate-500 mb-4">
            Define refund windows based on how far in advance a customer cancels.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="fullRefundHours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Refund (hours before)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                    />
                  </FormControl>
                  <FormDescription>e.g. 48 = 2 days before</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="creditOnlyHours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Credit Only (hours before)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                    />
                  </FormControl>
                  <FormDescription>Below full-refund threshold</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="noRefundHours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>No Refund (hours before)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                    />
                  </FormControl>
                  <FormDescription>Within this window = no refund</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Booking Settings */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-1">Booking Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="bookingBufferMin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Booking Buffer (minutes)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step={5}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                    />
                  </FormControl>
                  <FormDescription>Gap between back-to-back bookings</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-700">Options</h3>
          <FormField
            control={form.control}
            name="requireWaiver"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <FormLabel className="text-base">Require Waiver</FormLabel>
                  <FormDescription>
                    Customers must accept a waiver before booking
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
          <FormField
            control={form.control}
            name="allowWalkIns"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <FormLabel className="text-base">Allow Walk-ins</FormLabel>
                  <FormDescription>
                    Accept same-day walk-in bookings without advance reservation
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
          <FormField
            control={form.control}
            name="unmannedMode"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <FormLabel className="text-base">Unmanned Mode</FormLabel>
                  <FormDescription>
                    Facility operates without on-site staff — enables access code delivery
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
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="bg-emerald-500 hover:bg-emerald-600"
          >
            {form.formState.isSubmitting ? "Saving..." : "Save Policies"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
