import { useState, type FormEvent, type ReactNode } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { SERVICE_TYPES, type ServiceType } from "@/lib/types";
import { useCreateLead } from "@/hooks/queries";

export function NewLeadDialog({ orgId }: { orgId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [service, setService] = useState<ServiceType>("HVAC");
  const [value, setValue] = useState("");
  const create = useCreateLead();

  function submit(e: FormEvent) {
    e.preventDefault();
    create.mutate(
      {
        org_id: orgId,
        customer_name: name.trim(),
        address: address.trim(),
        service_type: service,
        value_cents: Math.round(Number(value || "0") * 100),
      },
      {
        onSuccess: () => {
          setOpen(false);
          setName("");
          setAddress("");
          setValue("");
          setService("HVAC");
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" /> New lead
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New lead</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={submit}>
          <Field label="Customer name">
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Field label="Address">
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="optional" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Service">
              <Select value={service} onValueChange={(v) => setService(v as ServiceType)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Value (USD)">
              <Input
                type="number"
                min="0"
                step="1"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="0"
              />
            </Field>
          </div>
          {create.isError && <p className="text-sm text-red-600">{(create.error as Error).message}</p>}
          <div className="mt-2 flex justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Saving..." : "Create lead"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
