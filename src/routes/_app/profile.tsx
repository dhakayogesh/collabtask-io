import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Droplet, MapPin, Phone, Save, UserRound } from "lucide-react";
import { toast } from "sonner";
import { TopBar } from "@/components/top-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getApiErrorMessage, getApiFieldErrors } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_app/profile")({
  component: ProfilePage,
});

const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
const noBloodGroup = "NONE";
const indianPhonePattern = /^(?:\+91\s?)?[6-9]\d{4}\s?\d{5}$/;

const safeTrim = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const optionalProfileValue = (value: unknown) => {
  const trimmed = safeTrim(value);
  return trimmed === "" ? null : trimmed;
};

type ProfileForm = {
  name: string;
  phone: string;
  address: string;
  bloodGroup: string;
};

function ProfilePage() {
  const { user, loading, updateProfile } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ProfileForm>({
    name: "",
    phone: "",
    address: "",
    bloodGroup: noBloodGroup,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileForm, string>>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name ?? "",
      phone: user.phone ?? "",
      address: user.address ?? "",
      bloodGroup: user.bloodGroup ?? "",
    });
  }, [user]);

  const initials = useMemo(() => {
    const source = user?.name || user?.email || "U";
    return source
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [user]);

  const setField = (field: keyof ProfileForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const validateForm = () => {
    const nextErrors: Partial<Record<keyof ProfileForm, string>> = {};

    const safeName = safeTrim(form.name);
    const safePhone = safeTrim(form.phone);

    if (!safeName) {
      nextErrors.name = "Name is required";
    } else if (safeName.length < 2) {
      nextErrors.name = "Name must be at least 2 characters";
    }

    if (safePhone && !indianPhonePattern.test(safePhone.replace(/\s+/g, " "))) {
      nextErrors.phone = "Enter a valid Indian phone number";
    }

    if (form.bloodGroup && !bloodGroups.includes(form.bloodGroup as (typeof bloodGroups)[number])) {
      nextErrors.bloodGroup = "Choose a valid blood group";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    if (!validateForm()) return;

    setSaving(true);
    try {
      await updateProfile({
        name: safeTrim(form.name),
        phone: optionalProfileValue(form.phone),
        address: optionalProfileValue(form.address),
        bloodGroup: optionalProfileValue(form.bloodGroup),
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["team"] }),
        queryClient.invalidateQueries({ queryKey: ["team-members"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["topbar-search"] }),
        queryClient.invalidateQueries({ queryKey: ["profiles"] }),
      ]);
      toast.success("Profile updated");
    } catch (error) {
      const fieldErrors = getApiFieldErrors(error);
      setErrors((current) => ({ ...current, ...fieldErrors }));
      toast.error(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <TopBar title="Profile" crumb="Team" />
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Profile</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your workspace identity and contact details.</p>
        </div>

        {loading || !user ? (
          <div className="grid lg:grid-cols-[260px_1fr] gap-5">
            <div className="ring-1 ring-border rounded-xl bg-card/60 shadow-elev hairline p-5">
              <div className="size-16 rounded-full bg-white/[0.06] animate-pulse" />
              <div className="mt-4 h-4 w-36 rounded bg-white/[0.06] animate-pulse" />
              <div className="mt-2 h-3 w-44 rounded bg-white/[0.06] animate-pulse" />
            </div>
            <div className="ring-1 ring-border rounded-xl bg-card/60 shadow-elev hairline p-5 space-y-5">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="space-y-2">
                  <div className="h-3 w-24 rounded bg-white/[0.06] animate-pulse" />
                  <div className="h-10 rounded-md bg-white/[0.06] animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[260px_1fr] gap-5">
            <aside className="ring-1 ring-border rounded-xl bg-card/60 shadow-elev hairline p-5 h-fit">
              <div className="size-16 rounded-full bg-gradient-to-br from-brand/45 to-accent/45 grid place-items-center text-lg font-semibold uppercase ring-1 ring-white/10">
                {initials}
              </div>
              <div className="mt-4 min-w-0">
                <p className="text-base font-semibold truncate">{user.name || user.email}</p>
                <p className="text-xs text-muted-foreground truncate mt-1">{user.email}</p>
              </div>
              <div className="mt-5 flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                <span className="size-2 rounded-full bg-emerald-400" />
                {user.role}
              </div>
            </aside>

            <form onSubmit={onSubmit} className="ring-1 ring-border rounded-xl bg-card/60 shadow-elev hairline p-5 md:p-6 space-y-5">
              <FieldShell label="Name" error={errors.name} icon={<UserRound className="size-4" />}>
                <Input
                  value={form.name}
                  onChange={(event) => setField("name", event.target.value)}
                  placeholder="Your name"
                  autoComplete="name"
                />
              </FieldShell>

              <FieldShell label="Phone number" error={errors.phone} icon={<Phone className="size-4" />}>
                <Input
                  value={form.phone}
                  onChange={(event) => setField("phone", event.target.value)}
                  placeholder="+91 98765 43210"
                  autoComplete="tel"
                />
              </FieldShell>

              <FieldShell label="Address" error={errors.address} icon={<MapPin className="size-4" />}>
                <Textarea
                  value={form.address}
                  onChange={(event) => setField("address", event.target.value)}
                  placeholder="Street, city, state"
                  className="min-h-24 resize-none"
                  autoComplete="street-address"
                />
              </FieldShell>

              <FieldShell label="Blood group" error={errors.bloodGroup} icon={<Droplet className="size-4" />}>
                <Select
                  value={form.bloodGroup || noBloodGroup}
                  onValueChange={(value) => setField("bloodGroup", value === noBloodGroup ? "" : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select blood group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={noBloodGroup}>Not specified</SelectItem>
                    {bloodGroups.map((group) => (
                      <SelectItem key={group} value={group}>
                        {group}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldShell>

              <div className="pt-2 flex justify-end">
                <Button type="submit" disabled={saving} className="bg-brand text-brand-foreground hover:bg-brand/90 shadow-elev">
                  <Save className="size-4 mr-2" />
                  {saving ? "Saving..." : "Save profile"}
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </>
  );
}

function FieldShell({
  label,
  error,
  icon,
  children,
}: {
  label: string;
  error?: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
