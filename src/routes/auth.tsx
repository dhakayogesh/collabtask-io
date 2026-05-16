import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useAuth } from "@/lib/auth-context";
import { getApiErrorMessage, getApiFieldErrors } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

const signupSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(8, "At least 8 characters").max(72),
  role: z.enum(["MEMBER", "ADMIN"]),
  adminPasscode: z.string().max(128).optional(),
}).superRefine((value, ctx) => {
  if (value.role === "ADMIN" && !value.adminPasscode?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Admin passcode is required",
      path: ["adminPasscode"],
    });
  }
});
const loginSchema = z.object({
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(1, "Password required").max(72),
});

function AuthPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background relative overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />
      <div className="absolute -top-40 -left-40 size-[600px] rounded-full bg-brand/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 right-1/4 size-[500px] rounded-full bg-accent/10 blur-3xl pointer-events-none" />

      {/* Left: form */}
      <div className="relative flex items-center justify-center p-6 md:p-8">
        <div className="w-full max-w-sm">
          <Link to="/" className="inline-flex items-center gap-2 mb-10">
            <div className="size-7 rounded-md bg-gradient-to-br from-brand to-emerald-700 grid place-items-center shadow-elev">
              <div className="size-2 bg-background rounded-[2px] rotate-45" />
            </div>
            <span className="font-semibold tracking-tight">WeTask</span>
          </Link>

          <div className="rounded-xl ring-1 ring-border bg-card/60 glass p-6 shadow-elev">
            <h1 className="text-xl font-semibold tracking-tight mb-1">Welcome back</h1>
            <p className="text-sm text-muted-foreground mb-5">
              Sign in to your workspace, or create a new one.
            </p>

            <Tabs defaultValue="login">
              <TabsList className="grid grid-cols-2 mb-5 bg-white/[0.04]">
                <TabsTrigger value="login">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Sign up</TabsTrigger>
              </TabsList>
              <TabsContent value="login"><LoginForm /></TabsContent>
              <TabsContent value="signup"><SignupForm /></TabsContent>
            </Tabs>
          </div>

          <p className="text-[11px] text-muted-foreground text-center mt-6 font-mono">
            By continuing you agree to our terms.
          </p>
        </div>
      </div>

      {/* Right: visual */}
      <div className="relative hidden lg:flex items-center justify-center border-l border-border p-12">
        <div className="max-w-md">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full ring-1 ring-border bg-card/60 glass mb-6 text-[11px] font-mono">
            <span className="size-1.5 rounded-full bg-brand animate-pulse-dot" />
            <span className="text-muted-foreground uppercase tracking-widest">Live</span>
          </div>
          <h2 className="text-4xl font-semibold tracking-tight leading-tight mb-4">
            Quiet software for teams that ship.
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            WeTask replaces noisy task trackers with a clean kanban, role-based access,
            and a real-time activity stream — so you always know what's happening.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-3">
            {["Plan", "Assign", "Ship"].map((s, i) => (
              <div key={s} className="p-4 rounded-lg ring-1 ring-border bg-card/60 glass hairline">
                <div className="text-[10px] font-mono text-brand uppercase tracking-widest">0{i + 1}</div>
                <div className="text-sm font-semibold mt-1.5">{s}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { login } = useAuth();
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const nextErrors = Object.fromEntries(
        parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
      );
      setErrors(nextErrors);
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await login(parsed.data);
      toast.success("Welcome back");
      navigate({ to: "/dashboard" });
    } catch (error) {
      setErrors(getApiFieldErrors(error));
      toast.error(getApiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="li-email">Email</Label>
        <Input id="li-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="li-password">Password</Label>
        <Input id="li-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
      </div>
      <Button type="submit" className="w-full bg-brand text-brand-foreground hover:bg-brand/90 shadow-elev" disabled={busy}>
        {busy && <Loader2 className="size-4 animate-spin mr-2" />}
        Sign in
      </Button>
    </form>
  );
}

function SignupForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"MEMBER" | "ADMIN">("MEMBER");
  const [adminPasscode, setAdminPasscode] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { signup } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = signupSchema.safeParse({
      name,
      email,
      password,
      role,
      adminPasscode: role === "ADMIN" ? adminPasscode : undefined,
    });
    if (!parsed.success) {
      const nextErrors = Object.fromEntries(
        parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
      );
      setErrors(nextErrors);
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await signup(parsed.data);
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      queryClient.invalidateQueries({ queryKey: ["team"] });
      toast.success("Account created");
      navigate({ to: "/dashboard" });
    } catch (error) {
      setErrors(getApiFieldErrors(error));
      toast.error(getApiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="su-name">Name</Label>
        <Input id="su-name" value={name} onChange={(e) => setName(e.target.value)} required />
        {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="su-email">Email</Label>
        <Input id="su-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="su-password">Password</Label>
        <Input id="su-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <p className="text-xs text-muted-foreground">Minimum 8 characters.</p>
        {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="su-role">Role</Label>
        <Select value={role} onValueChange={(value) => {
          setRole(value as "MEMBER" | "ADMIN");
          setErrors(({ role: _role, adminPasscode: _adminPasscode, ...current }) => current);
        }}>
          <SelectTrigger id="su-role" className="bg-background/40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="MEMBER">Member</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
          </SelectContent>
        </Select>
        {errors.role && <p className="text-xs text-destructive">{errors.role}</p>}
      </div>
      {role === "ADMIN" && (
        <div className="space-y-2">
          <Label htmlFor="su-admin-passcode">Admin Passcode</Label>
          <Input
            id="su-admin-passcode"
            type="password"
            value={adminPasscode}
            onChange={(e) => setAdminPasscode(e.target.value)}
            required
          />
          {errors.adminPasscode && <p className="text-xs text-destructive">{errors.adminPasscode}</p>}
        </div>
      )}
      <Button type="submit" className="w-full bg-brand text-brand-foreground hover:bg-brand/90 shadow-elev" disabled={busy}>
        {busy && <Loader2 className="size-4 animate-spin mr-2" />}
        Create account
      </Button>
      <p className="text-xs text-muted-foreground text-center">
        First user to sign up becomes the workspace admin.
      </p>
    </form>
  );
}
