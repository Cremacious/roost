"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Eye, EyeOff, Lock, MapPin, RefreshCw, Thermometer } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { THEMES, type ThemeKey } from "@/lib/constants/themes";
import { useTheme } from "@/components/providers/ThemeProvider";
import { useSession } from "@/lib/auth/client";
import { useHousehold } from "@/lib/hooks/useHousehold";
import { useUserPreferences } from "@/lib/hooks/useUserPreferences";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import MemberSheet, { type SheetMember } from "@/components/settings/MemberSheet";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import UpgradePrompt from "@/components/shared/UpgradePrompt";
import { PageContainer } from "@/components/layout/PageContainer";

// ---- Constants --------------------------------------------------------------

const AVATAR_COLORS = [
  "#EF4444", "#F97316", "#F59E0B", "#22C55E",
  "#06B6D4", "#3B82F6", "#8B5CF6", "#EC4899",
  "#14B8A6", "#84CC16", "#6366F1", "#F43F5E",
];

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern (New York)" },
  { value: "America/Chicago", label: "Central (Chicago)" },
  { value: "America/Denver", label: "Mountain (Denver)" },
  { value: "America/Los_Angeles", label: "Pacific (Los Angeles)" },
  { value: "America/Anchorage", label: "Alaska (Anchorage)" },
  { value: "America/Honolulu", label: "Hawaii (Honolulu)" },
  { value: "America/Phoenix", label: "Arizona (Phoenix)" },
  { value: "America/Puerto_Rico", label: "Puerto Rico" },
  { value: "Europe/London", label: "London (GMT)" },
  { value: "Europe/Paris", label: "Paris (CET)" },
  { value: "Europe/Berlin", label: "Berlin (CET)" },
  { value: "Europe/Madrid", label: "Madrid (CET)" },
  { value: "Europe/Rome", label: "Rome (CET)" },
  { value: "Europe/Amsterdam", label: "Amsterdam (CET)" },
  { value: "Europe/Zurich", label: "Zurich (CET)" },
  { value: "Europe/Stockholm", label: "Stockholm (CET)" },
  { value: "Europe/Warsaw", label: "Warsaw (CET)" },
  { value: "Europe/Athens", label: "Athens (EET)" },
  { value: "Europe/Istanbul", label: "Istanbul (TRT)" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },
  { value: "Asia/Kolkata", label: "India (IST)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Shanghai", label: "China (CST)" },
  { value: "Asia/Seoul", label: "Seoul (KST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
  { value: "Australia/Melbourne", label: "Melbourne (AEST)" },
  { value: "Pacific/Auckland", label: "Auckland (NZST)" },
];

const NAV_SECTIONS = [
  { id: "section-profile", label: "Profile" },
  { id: "section-appearance", label: "Appearance" },
  { id: "section-preferences", label: "Preferences" },
  { id: "section-household", label: "Household" },
  { id: "section-members", label: "Members", adminOnly: true },
  { id: "section-notifications", label: "Notifications" },
  { id: "section-billing", label: "Billing" },
  { id: "section-danger", label: "Danger Zone", adminOnly: true },
];

// ---- Shared helpers ---------------------------------------------------------

function initials(name: string): string {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

type Strength = "weak" | "fair" | "good" | "strong";

function getStrength(pw: string): Strength {
  if (pw.length < 8) return "weak";
  const hasNum = /[0-9]/.test(pw);
  const hasSym = /[^a-zA-Z0-9]/.test(pw);
  const hasUpper = /[A-Z]/.test(pw);
  if (hasUpper && hasNum && hasSym) return "strong";
  if (hasNum || hasSym) return "good";
  return "fair";
}

const STRENGTH_CONFIG: Record<Strength, { segments: number; label: string; color: string }> = {
  weak:   { segments: 1, label: "Weak",   color: "#EF4444" },
  fair:   { segments: 2, label: "Fair",   color: "#F97316" },
  good:   { segments: 3, label: "Good",   color: "#F59E0B" },
  strong: { segments: 4, label: "Strong", color: "#22C55E" },
};

const inputClass = "flex h-11 w-full rounded-xl border bg-transparent px-3 text-sm focus:outline-none";
const inputStyle = {
  border: "1.5px solid var(--roost-border)",
  borderBottom: "3px solid var(--roost-border-bottom)",
  color: "var(--roost-text-primary)",
  fontWeight: 600,
};

// ---- Sub-components ---------------------------------------------------------

function SettingsSection({
  id,
  title,
  subtitle,
  children,
}: {
  id: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 space-y-4">
      <div>
        <h2 className="text-[17px]" style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
          {title}
        </h2>
        {subtitle && (
          <p className="mt-0.5 text-[13px]" style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}>
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

function SlabCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`overflow-hidden rounded-2xl ${className}`}
      style={{
        backgroundColor: "var(--roost-surface)",
        border: "1.5px solid var(--roost-border)",
        borderBottom: "4px solid var(--roost-border-bottom)",
      }}
    >
      {children}
    </div>
  );
}

function SlabRow({ children, topBorder = true }: { children: React.ReactNode; topBorder?: boolean }) {
  return (
    <div
      className="flex min-h-14 items-center gap-3 px-4"
      style={{ borderTop: topBorder ? "1px solid var(--roost-border)" : undefined }}
    >
      {children}
    </div>
  );
}

function ThemeCard({ themeKey, isSelected, isLocked, onSelect, onLocked }: {
  themeKey: ThemeKey;
  isSelected: boolean;
  isLocked?: boolean;
  onSelect: () => void;
  onLocked?: () => void;
}) {
  const t = THEMES[themeKey];
  return (
    <motion.button
      type="button"
      onClick={isLocked ? onLocked : onSelect}
      whileTap={{ y: 1 }}
      className="relative flex flex-col gap-2 rounded-2xl p-3 text-left"
      style={{
        backgroundColor: "var(--roost-surface)",
        border: isSelected ? "2px solid #EF4444" : "1.5px solid var(--roost-border)",
        borderBottom: isSelected ? "4px solid #C93B3B" : `4px solid ${t.borderBottom}`,
        opacity: isLocked ? 0.6 : 1,
      }}
    >
      {isSelected && !isLocked && (
        <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full"
          style={{ backgroundColor: "#EF4444" }}>
          <Check className="size-3 text-white" strokeWidth={3} />
        </span>
      )}
      {isLocked && (
        <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full"
          style={{ backgroundColor: "var(--roost-border)" }}>
          <Lock className="size-3" style={{ color: "var(--roost-text-muted)" }} />
        </span>
      )}
      <div className="flex h-12 w-full flex-col gap-1 overflow-hidden rounded-xl p-1.5" style={{ backgroundColor: t.bg }}>
        <div className="h-2 w-full rounded-md" style={{ backgroundColor: t.topbarBg, borderBottom: `1px solid ${t.topbarBorder}` }} />
        <div className="h-4 w-3/4 rounded-md" style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, borderBottom: `2px solid ${t.borderBottom}` }} />
      </div>
      <span className="text-xs" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>{t.name}</span>
    </motion.button>
  );
}

// ---- Page -------------------------------------------------------------------

export default function SettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();
  const { data: sessionData } = useSession();
  const { household, role, isPremium } = useHousehold();
  const { temperatureUnit, latitude, longitude, updatePreferences } = useUserPreferences();

  const isAdmin = role === "admin";
  const householdId = household?.id ?? "";
  const themeKeys = Object.keys(THEMES) as ThemeKey[];

  const [upgradeCode, setUpgradeCode] = useState<string | null>(null);

  // ---- Profile state --------------------------------------------------------
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profileTimezone, setProfileTimezone] = useState("America/New_York");
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);

  // Password change
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  // ---- Household state ------------------------------------------------------
  const [householdName, setHouseholdName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [codeRegenerating, setCodeRegenerating] = useState(false);
  const [regenConfirmOpen, setRegenConfirmOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferTarget, setTransferTarget] = useState<string | null>(null);
  const [transferConfirmOpen, setTransferConfirmOpen] = useState(false);

  // ---- Members state --------------------------------------------------------
  const [selectedMember, setSelectedMember] = useState<SheetMember | null>(null);

  // ---- Notifications state --------------------------------------------------
  const [choreReminders, setChoreReminders] = useState(false);

  // ---- Danger zone state ----------------------------------------------------
  const [deleteDataOpen, setDeleteDataOpen] = useState(false);
  const [deleteDataConfirm, setDeleteDataConfirm] = useState("");
  const [deleteDataStep2, setDeleteDataStep2] = useState(false);
  const [deletingData, setDeletingData] = useState(false);
  const [deleteHouseOpen, setDeleteHouseOpen] = useState(false);
  const [deleteHouseConfirm, setDeleteHouseConfirm] = useState("");
  const [deleteHouseStep2, setDeleteHouseStep2] = useState(false);
  const [deletingHouse, setDeletingHouse] = useState(false);

  // ---- Desktop nav ----------------------------------------------------------
  const [activeSection, setActiveSection] = useState("section-profile");
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const sections = NAV_SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        }
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 }
    );
    sections.forEach((el) => observerRef.current?.observe(el));
    return () => observerRef.current?.disconnect();
  }, [isAdmin]);

  // ---- Fetch profile --------------------------------------------------------
  const { data: profileData } = useQuery<{ user: { name: string; email: string; avatar_color: string | null; timezone: string } }>({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const r = await fetch("/api/user/profile");
      if (!r.ok) throw new Error("Failed to load profile");
      return r.json();
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!profileData?.user) return;
    setProfileName(profileData.user.name);
    setProfileEmail(profileData.user.email ?? "");
    setProfileTimezone(profileData.user.timezone);
    setSelectedColor(profileData.user.avatar_color);
  }, [profileData]);

  // ---- Fetch preferences for chore reminders --------------------------------
  const { data: prefsData } = useQuery<{ chore_reminders_enabled: boolean }>({
    queryKey: ["user-preferences"],
    queryFn: async () => {
      const r = await fetch("/api/user/preferences");
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    if (prefsData?.chore_reminders_enabled !== undefined) {
      setChoreReminders(prefsData.chore_reminders_enabled);
    }
  }, [prefsData]);

  // ---- Sync household state -------------------------------------------------
  useEffect(() => {
    if (household) {
      setHouseholdName(household.name);
      setInviteCode(household.code);
    }
  }, [household]);

  // ---- Fetch members --------------------------------------------------------
  const { data: membersData, refetch: refetchMembers } = useQuery<{
    members: SheetMember[];
  }>({
    queryKey: ["household-members"],
    queryFn: async () => {
      const r = await fetch("/api/household/members");
      if (!r.ok) throw new Error("Failed to load members");
      return r.json();
    },
    staleTime: 10_000,
  });

  const members = membersData?.members ?? [];

  // ---- Location (also used in preferences section) --------------------------
  const [locationUpdating, setLocationUpdating] = useState(false);

  function handleUpdateLocation() {
    if (!navigator.geolocation) {
      toast.error("Location not available", { description: "Your browser does not support geolocation." });
      return;
    }
    setLocationUpdating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await updatePreferences({ latitude: position.coords.latitude, longitude: position.coords.longitude });
          toast.success("Location updated");
        } catch {
          toast.error("Could not save location", { description: "Something went wrong. Try again." });
        } finally {
          setLocationUpdating(false);
        }
      },
      (error) => {
        console.log("Location denied:", error.message);
        setLocationUpdating(false);
        toast.error("Location access was denied", { description: "You can enable it in your browser settings." });
      },
      { timeout: 10_000 }
    );
  }

  // ---- Profile save ---------------------------------------------------------
  async function saveProfileField(field: string, value: unknown) {
    setProfileSaving(true);
    try {
      const r = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed to save");
      }
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      toast.success("Saved");
    } catch (err) {
      toast.error("Could not save", { description: (err as Error).message });
    } finally {
      setProfileSaving(false);
    }
  }

  // ---- Password change ------------------------------------------------------
  const pwStrength = newPw.length > 0 ? getStrength(newPw) : null;
  const pwsMatch = newPw === confirmPw;
  const pwValid = !!pwStrength && pwStrength !== "weak" && pwsMatch && !!currentPw;

  async function handlePasswordChange() {
    if (!pwValid) return;
    setPwSaving(true);
    try {
      const r = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed");
      }
      toast.success("Password changed");
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } catch (err) {
      toast.error("Could not change password", { description: (err as Error).message });
    } finally {
      setPwSaving(false);
    }
  }

  // ---- Household name save --------------------------------------------------
  async function saveHouseholdName() {
    try {
      const r = await fetch(`/api/household/${householdId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: householdName }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed");
      }
      queryClient.invalidateQueries({ queryKey: ["household"] });
      queryClient.invalidateQueries({ queryKey: ["household-members"] });
      toast.success("Household name saved");
    } catch (err) {
      toast.error("Could not save household name", { description: (err as Error).message });
    }
  }

  // ---- Regenerate code ------------------------------------------------------
  async function regenerateCode() {
    setCodeRegenerating(true);
    try {
      const r = await fetch(`/api/household/${householdId}/regenerate-code`, { method: "POST" });
      if (!r.ok) throw new Error("Failed");
      const d = await r.json();
      setInviteCode(d.code);
      queryClient.invalidateQueries({ queryKey: ["household-members"] });
      toast.success("New invite code generated");
    } catch {
      toast.error("Could not regenerate code", { description: "Something went wrong. Try again." });
    } finally {
      setCodeRegenerating(false);
      setRegenConfirmOpen(false);
    }
  }

  // ---- Transfer admin -------------------------------------------------------
  async function handleTransfer() {
    if (!transferTarget) return;
    try {
      const r = await fetch(`/api/household/${householdId}/transfer-admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newAdminUserId: transferTarget }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed");
      }
      toast.success("Admin transferred");
      queryClient.invalidateQueries({ queryKey: ["household"] });
      queryClient.invalidateQueries({ queryKey: ["household-members"] });
      setTransferConfirmOpen(false);
      setTransferOpen(false);
    } catch (err) {
      toast.error("Could not transfer admin", { description: (err as Error).message });
    }
  }

  // ---- Temp unit ------------------------------------------------------------
  async function handleTempUnitChange(unit: "fahrenheit" | "celsius") {
    try {
      await updatePreferences({ temperature_unit: unit });
      toast.success("Preference saved");
    } catch {
      toast.error("Could not save preference", { description: "Something went wrong. Try again." });
    }
  }

  // ---- Chore reminders toggle -----------------------------------------------
  async function toggleChoreReminders(val: boolean) {
    setChoreReminders(val);
    try {
      await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chore_reminders_enabled: val }),
      });
      queryClient.invalidateQueries({ queryKey: ["user-preferences"] });
    } catch {
      setChoreReminders(!val);
      toast.error("Could not save preference", { description: "Something went wrong. Try again." });
    }
  }

  // ---- Delete all data ------------------------------------------------------
  async function handleDeleteData() {
    setDeletingData(true);
    try {
      const r = await fetch(`/api/household/${householdId}/delete-data`, { method: "POST" });
      if (!r.ok) throw new Error("Failed");
      toast.success("All household data deleted");
      queryClient.invalidateQueries();
      setDeleteDataOpen(false);
      setDeleteDataStep2(false);
      setDeleteDataConfirm("");
    } catch {
      toast.error("Could not delete data", { description: "Something went wrong. Try again." });
    } finally {
      setDeletingData(false);
    }
  }

  // ---- Delete household -----------------------------------------------------
  async function handleDeleteHousehold() {
    setDeletingHouse(true);
    try {
      const r = await fetch(`/api/household/${householdId}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Failed");
      toast.success("Household deleted");
      router.push("/onboarding");
    } catch {
      toast.error("Could not delete household", { description: "Something went wrong. Try again." });
      setDeletingHouse(false);
    }
  }

  const userName = sessionData?.user?.name ?? "";

  // ---- Render ----------------------------------------------------------------

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="py-4 pb-24 md:py-6"
      style={{ backgroundColor: "var(--roost-bg)" }}
    >
      <PageContainer className="flex gap-8">
      {/* Desktop left nav */}
      <nav className="hidden w-44 shrink-0 lg:block">
        <div className="sticky top-20 space-y-1">
          {NAV_SECTIONS.filter((s) => !s.adminOnly || isAdmin).map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="flex h-9 w-full items-center rounded-xl px-3 text-sm text-left"
              style={{
                backgroundColor: activeSection === s.id ? "var(--roost-surface)" : "transparent",
                border: activeSection === s.id ? "1.5px solid var(--roost-border)" : "1.5px solid transparent",
                color: activeSection === s.id ? "var(--roost-text-primary)" : "var(--roost-text-muted)",
                fontWeight: activeSection === s.id ? 700 : 600,
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Main content */}
      <div className="min-w-0 flex-1 space-y-10">
        <h1 className="text-2xl md:text-3xl" style={{ color: "var(--roost-text-primary)", fontWeight: 900 }}>
          Settings
        </h1>

        {/* ---- SECTION 1: PROFILE ----------------------------------------- */}
        <SettingsSection id="section-profile" title="Profile" subtitle="Your personal account details.">
          <SlabCard>
            {/* Avatar + color picker */}
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-4">
                <div
                  className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-xl text-white"
                  style={{
                    backgroundColor: selectedColor ?? "var(--roost-text-primary)",
                    border: "1.5px solid var(--roost-border)",
                    borderBottom: "3px solid var(--roost-border-bottom)",
                    fontWeight: 800,
                  }}
                >
                  {initials(userName)}
                </div>
                <div>
                  <p className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>Avatar color</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {AVATAR_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={async () => {
                          setSelectedColor(color);
                          await saveProfileField("avatar_color", color);
                        }}
                        className="h-7 w-7 rounded-full transition-transform hover:scale-110"
                        style={{
                          backgroundColor: color,
                          border: selectedColor === color ? "2.5px solid var(--roost-text-primary)" : "2px solid transparent",
                          outline: selectedColor === color ? `2px solid ${color}` : undefined,
                          outlineOffset: "1px",
                        }}
                        aria-label={color}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Name */}
            <div className="px-4 pb-1 pt-2 space-y-1.5" style={{ borderTop: "1px solid var(--roost-border)" }}>
              <label className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}>
                Display name
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className={inputClass}
                  style={inputStyle}
                  placeholder="Your name"
                />
                {profileName !== (profileData?.user?.name ?? "") && (
                  <motion.button
                    type="button"
                    whileTap={{ y: 1 }}
                    disabled={profileSaving}
                    onClick={() => saveProfileField("name", profileName)}
                    className="h-11 shrink-0 rounded-xl px-4 text-sm text-white"
                    style={{
                      backgroundColor: "var(--roost-text-primary)",
                      border: "1.5px solid var(--roost-border)",
                      borderBottom: "3px solid rgba(0,0,0,0.2)",
                      fontWeight: 700,
                    }}
                  >
                    Save
                  </motion.button>
                )}
              </div>
            </div>

            {/* Email */}
            <div className="px-4 pb-1 pt-3 space-y-1.5" style={{ borderTop: "1px solid var(--roost-border)" }}>
              <label className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}>
                Email address
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  className={inputClass}
                  style={inputStyle}
                  placeholder="you@example.com"
                />
                {profileEmail !== (profileData?.user?.email ?? "") && (
                  <motion.button
                    type="button"
                    whileTap={{ y: 1 }}
                    disabled={profileSaving}
                    onClick={() => saveProfileField("email", profileEmail)}
                    className="h-11 shrink-0 rounded-xl px-4 text-sm text-white"
                    style={{
                      backgroundColor: "var(--roost-text-primary)",
                      border: "1.5px solid var(--roost-border)",
                      borderBottom: "3px solid rgba(0,0,0,0.2)",
                      fontWeight: 700,
                    }}
                  >
                    Save
                  </motion.button>
                )}
              </div>
            </div>

            {/* Timezone */}
            <div className="px-4 pb-3 pt-3 space-y-1.5" style={{ borderTop: "1px solid var(--roost-border)" }}>
              <label className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}>
                Timezone
              </label>
              <select
                value={profileTimezone}
                onChange={(e) => {
                  setProfileTimezone(e.target.value);
                  saveProfileField("timezone", e.target.value);
                }}
                className={`${inputClass} cursor-pointer`}
                style={inputStyle}
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>{tz.label}</option>
                ))}
              </select>
            </div>
          </SlabCard>

          {/* Password change */}
          <SlabCard>
            <div className="p-4">
              <p className="text-sm mb-3" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>
                Change password
              </p>
              <div className="space-y-2.5">
                {/* Current */}
                <div className="relative">
                  <input
                    type={showCurrent ? "text" : "password"}
                    value={currentPw}
                    onChange={(e) => setCurrentPw(e.target.value)}
                    placeholder="Current password"
                    className={`${inputClass} pr-11`}
                    style={inputStyle}
                  />
                  <button type="button" onClick={() => setShowCurrent((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--roost-text-muted)" }} tabIndex={-1}>
                    {showCurrent ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {/* New */}
                <div>
                  <div className="relative">
                    <input
                      type={showNew ? "text" : "password"}
                      value={newPw}
                      onChange={(e) => setNewPw(e.target.value)}
                      placeholder="New password"
                      className={`${inputClass} pr-11`}
                      style={inputStyle}
                    />
                    <button type="button" onClick={() => setShowNew((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--roost-text-muted)" }} tabIndex={-1}>
                      {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  {pwStrength && (() => {
                    const cfg = STRENGTH_CONFIG[pwStrength];
                    return (
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex flex-1 gap-1">
                          {[0, 1, 2, 3].map((i) => (
                            <div key={i} className="h-1.5 flex-1 rounded-full"
                              style={{ backgroundColor: i < cfg.segments ? cfg.color : "var(--roost-border)" }} />
                          ))}
                        </div>
                        <span className="text-xs" style={{ color: cfg.color, fontWeight: 700 }}>{cfg.label}</span>
                      </div>
                    );
                  })()}
                </div>
                {/* Confirm */}
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                    placeholder="Confirm new password"
                    className={`${inputClass} pr-11`}
                    style={inputStyle}
                  />
                  <button type="button" onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--roost-text-muted)" }} tabIndex={-1}>
                    {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                <motion.button
                  type="button"
                  whileTap={{ y: 1 }}
                  disabled={!pwValid || pwSaving}
                  onClick={handlePasswordChange}
                  className="flex h-11 w-full items-center justify-center rounded-xl text-sm text-white disabled:opacity-50"
                  style={{
                    backgroundColor: "var(--roost-text-primary)",
                    border: "1.5px solid var(--roost-border)",
                    borderBottom: "3px solid rgba(0,0,0,0.2)",
                    fontWeight: 800,
                  }}
                >
                  Change password
                </motion.button>
              </div>
            </div>
          </SlabCard>
        </SettingsSection>

        {/* ---- SECTION 2: APPEARANCE --------------------------------------- */}
        <SettingsSection id="section-appearance" title="Appearance" subtitle="Your theme is only visible to you.">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {themeKeys.map((key) => {
              const locked = !isPremium && key !== "default";
              return (
                <ThemeCard
                  key={key}
                  themeKey={key}
                  isSelected={theme === key}
                  isLocked={locked}
                  onSelect={() => setTheme(key)}
                  onLocked={() => setUpgradeCode("THEMES_PREMIUM")}
                />
              );
            })}
          </div>
        </SettingsSection>

        {/* ---- SECTION 3: PREFERENCES ------------------------------------- */}
        <SettingsSection id="section-preferences" title="Preferences">
          <SlabCard>
            {/* Temperature unit */}
            <div className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Thermometer className="size-4 shrink-0" style={{ color: "var(--roost-text-muted)" }} />
                <div>
                  <p className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>Temperature</p>
                  <p className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                    Preferred unit for weather display.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {(["fahrenheit", "celsius"] as const).map((unit) => {
                  const active = temperatureUnit === unit;
                  return (
                    <motion.button key={unit} type="button" whileTap={{ y: 1 }} onClick={() => handleTempUnitChange(unit)}
                      className="flex h-10 flex-1 items-center justify-center rounded-xl text-sm"
                      style={{
                        backgroundColor: active ? "var(--roost-text-primary)" : "var(--roost-bg)",
                        border: "1.5px solid var(--roost-border)",
                        borderBottom: "3px solid var(--roost-border-bottom)",
                        color: active ? "var(--roost-surface)" : "var(--roost-text-secondary)",
                        fontWeight: 700,
                      }}>
                      {unit === "fahrenheit" ? "°F Fahrenheit" : "°C Celsius"}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Weather location */}
            <div className="flex items-center gap-3 p-4" style={{ borderTop: "1px solid var(--roost-border)" }}>
              <MapPin className="size-4 shrink-0" style={{ color: "var(--roost-text-muted)" }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>Weather Location</p>
                {latitude !== null && longitude !== null ? (
                  <>
                    <p className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>Using your current location</p>
                    <p className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                      {latitude.toFixed(2)}, {longitude.toFixed(2)}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>Location not set</p>
                    <p className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>Allow location access for accurate weather.</p>
                  </>
                )}
              </div>
              <motion.button type="button" whileTap={{ y: 1 }} onClick={handleUpdateLocation} disabled={locationUpdating}
                className="shrink-0 h-9 rounded-xl px-3 text-sm"
                style={{
                  backgroundColor: "var(--roost-bg)",
                  border: "1.5px solid var(--roost-border)",
                  borderBottom: "3px solid var(--roost-border-bottom)",
                  color: "var(--roost-text-secondary)",
                  fontWeight: 700,
                  opacity: locationUpdating ? 0.6 : 1,
                }}>
                {locationUpdating ? "Updating..." : "Update"}
              </motion.button>
            </div>

            {/* Language */}
            <div className="p-4 space-y-2" style={{ borderTop: "1px solid var(--roost-border)" }}>
              <p className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>Language</p>
              <div className="flex gap-2">
                {["English", "Español"].map((lang) => {
                  const active = lang === "English";
                  return (
                    <motion.button key={lang} type="button" whileTap={{ y: 1 }}
                      onClick={() => { if (lang === "Español") toast.info("Spanish translation coming soon."); }}
                      className="flex h-10 flex-1 items-center justify-center rounded-xl text-sm"
                      style={{
                        backgroundColor: active ? "var(--roost-text-primary)" : "var(--roost-bg)",
                        border: "1.5px solid var(--roost-border)",
                        borderBottom: "3px solid var(--roost-border-bottom)",
                        color: active ? "var(--roost-surface)" : "var(--roost-text-secondary)",
                        fontWeight: 700,
                      }}>
                      {lang}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </SlabCard>
        </SettingsSection>

        {/* ---- SECTION 4: HOUSEHOLD --------------------------------------- */}
        <SettingsSection id="section-household" title="Household" subtitle="Manage your household settings.">
          <SlabCard>
            {/* Household name */}
            <div className="p-4 space-y-1.5">
              <label className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}>Household name</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={householdName}
                  onChange={(e) => setHouseholdName(e.target.value)}
                  disabled={!isAdmin}
                  className={inputClass}
                  style={{ ...inputStyle, opacity: isAdmin ? 1 : 0.7 }}
                  placeholder="Your household name"
                />
                {isAdmin && householdName !== household?.name && householdName.trim() && (
                  <motion.button type="button" whileTap={{ y: 1 }} onClick={saveHouseholdName}
                    className="h-11 shrink-0 rounded-xl px-4 text-sm text-white"
                    style={{
                      backgroundColor: "var(--roost-text-primary)",
                      border: "1.5px solid var(--roost-border)",
                      borderBottom: "3px solid rgba(0,0,0,0.2)",
                      fontWeight: 700,
                    }}>
                    Save
                  </motion.button>
                )}
              </div>
            </div>

            {/* Invite code */}
            <div className="p-4 space-y-2" style={{ borderTop: "1px solid var(--roost-border)" }}>
              <p className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>Invite code</p>
              <p className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                Share this code so housemates can join.
              </p>
              <div className="flex items-center gap-2">
                <div
                  className="flex-1 rounded-xl px-4 py-3 font-mono text-xl tracking-widest"
                  style={{
                    backgroundColor: "var(--roost-bg)",
                    border: "1.5px solid var(--roost-border)",
                    borderBottom: "3px solid var(--roost-border-bottom)",
                    color: "var(--roost-text-primary)",
                    fontWeight: 800,
                    letterSpacing: "0.2em",
                  }}
                >
                  {inviteCode}
                </div>
                <motion.button
                  type="button"
                  whileTap={{ y: 1 }}
                  onClick={() => {
                    navigator.clipboard.writeText(inviteCode);
                    toast.success("Code copied to clipboard");
                  }}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                  style={{
                    backgroundColor: "var(--roost-bg)",
                    border: "1.5px solid var(--roost-border)",
                    borderBottom: "3px solid var(--roost-border-bottom)",
                  }}
                >
                  <Copy className="size-4" style={{ color: "var(--roost-text-muted)" }} />
                </motion.button>
              </div>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setRegenConfirmOpen(true)}
                  className="text-sm"
                  style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}
                >
                  Generate new code
                </button>
              )}
            </div>

            {/* Subscription */}
            <div className="flex items-center justify-between p-4" style={{ borderTop: "1px solid var(--roost-border)" }}>
              <div>
                <p className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>Subscription</p>
                <p className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                  {isPremium ? "Premium plan active" : "Free plan"}
                </p>
              </div>
              {isPremium ? (
                <span className="rounded-xl px-3 py-1 text-xs text-white" style={{ backgroundColor: "#22C55E", fontWeight: 700 }}>
                  Premium
                </span>
              ) : (
                <motion.button type="button" whileTap={{ y: 1 }}
                  onClick={() => router.push("/settings/billing")}
                  className="h-9 rounded-xl px-3 text-sm text-white"
                  style={{
                    backgroundColor: "var(--roost-text-primary)",
                    border: "1.5px solid var(--roost-border)",
                    borderBottom: "3px solid rgba(0,0,0,0.2)",
                    fontWeight: 700,
                  }}>
                  Upgrade
                </motion.button>
              )}
            </div>

            {/* Transfer admin */}
            {isAdmin && (
              <div className="p-4" style={{ borderTop: "1px solid var(--roost-border)" }}>
                <p className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>Transfer admin</p>
                <p className="text-xs mt-0.5 mb-3" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                  Give admin control to another member. You will become a regular member.
                </p>
                <button
                  type="button"
                  onClick={() => setTransferOpen(true)}
                  className="text-sm"
                  style={{ color: "var(--roost-text-muted)", fontWeight: 700, textDecoration: "underline" }}
                >
                  Transfer admin
                </button>
              </div>
            )}
          </SlabCard>
        </SettingsSection>

        {/* ---- SECTION 5: MEMBERS (admin only) ----------------------------- */}
        {isAdmin && (
          <SettingsSection
            id="section-members"
            title="Members"
            subtitle="Manage who is in your household."
          >
            {members.some((m) => m.role === "child") && (
              <p className="mb-3 text-[13px]" style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}>
                Set up allowances for children in their member settings. Allowances are evaluated every Sunday night.
              </p>
            )}
            <SlabCard>
              {members.map((m, i) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedMember(m)}
                  className="flex w-full min-h-14 items-center gap-3 px-4 text-left"
                  style={{ borderTop: i > 0 ? "1px solid var(--roost-border)" : undefined }}
                >
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs text-white"
                    style={{ backgroundColor: m.avatarColor ?? "#6366f1", fontWeight: 700 }}
                  >
                    {initials(m.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>
                      {m.name}
                    </p>
                    <p className="text-xs capitalize" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                      {m.role}
                    </p>
                  </div>
                  <span
                    className="shrink-0 rounded-lg px-2 py-0.5 text-xs capitalize"
                    style={{
                      backgroundColor: m.role === "admin" ? "var(--roost-text-primary)" : "var(--roost-border)",
                      color: m.role === "admin" ? "var(--roost-surface)" : "var(--roost-text-secondary)",
                      fontWeight: 700,
                    }}
                  >
                    {m.role}
                  </span>
                </button>
              ))}
            </SlabCard>
          </SettingsSection>
        )}

        {/* ---- SECTION 6: NOTIFICATIONS ----------------------------------- */}
        <SettingsSection id="section-notifications" title="Notifications">
          <SlabCard>
            <SlabRow topBorder={false}>
              <div className="flex-1">
                <p className="text-sm" style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}>Push notifications</p>
                <p className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                  Available in the iOS and Android app. Coming soon.
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                  Download the app to enable push notifications.
                </p>
              </div>
              <Switch checked={false} disabled />
            </SlabRow>
            <SlabRow>
              <div className="flex-1">
                <p className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>Chore reminder emails</p>
                <p className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                  Get an email when chores are overdue.
                </p>
              </div>
              <Switch
                checked={choreReminders}
                onCheckedChange={toggleChoreReminders}
              />
            </SlabRow>
          </SlabCard>
        </SettingsSection>

        {/* ---- SECTION 7: BILLING ----------------------------------------- */}
        <SettingsSection id="section-billing" title="Billing">
          <SlabCard>
            <div className="p-4">
              {isPremium ? (
                <div className="flex items-center gap-3">
                  <span
                    className="rounded-xl px-3 py-1 text-sm text-white"
                    style={{ backgroundColor: "#22C55E", fontWeight: 700 }}
                  >
                    Premium
                  </span>
                  <p className="text-sm" style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}>
                    Premium plan active
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>Free plan</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                      Upgrade to Premium for $3/month to unlock bill splitting, receipt scanning, and more.
                    </p>
                  </div>
                  <motion.button type="button" whileTap={{ y: 1 }}
                    onClick={() => router.push("/settings/billing")}
                    className="flex h-11 w-full items-center justify-center rounded-xl text-sm text-white"
                    style={{
                      backgroundColor: "var(--roost-text-primary)",
                      border: "1.5px solid var(--roost-border)",
                      borderBottom: "3px solid rgba(0,0,0,0.2)",
                      fontWeight: 800,
                    }}>
                    Upgrade to Premium
                  </motion.button>
                </div>
              )}
              {isPremium && (
                <motion.button type="button" whileTap={{ y: 1 }}
                  onClick={() => toast.info("Billing management coming soon.")}
                  className="mt-3 flex h-11 w-full items-center justify-center rounded-xl text-sm"
                  style={{
                    backgroundColor: "var(--roost-bg)",
                    border: "1.5px solid var(--roost-border)",
                    borderBottom: "3px solid var(--roost-border-bottom)",
                    color: "var(--roost-text-secondary)",
                    fontWeight: 700,
                  }}>
                  Manage billing
                </motion.button>
              )}
            </div>
          </SlabCard>
        </SettingsSection>

        {/* ---- SECTION 8: DANGER ZONE (admin only) ------------------------ */}
        {isAdmin && (
          <SettingsSection id="section-danger" title="Danger Zone">
            <div
              className="overflow-hidden rounded-2xl"
              style={{
                border: "1.5px solid #EF444430",
                borderBottom: "4px solid #EF444460",
                backgroundColor: "var(--roost-surface)",
              }}
            >
              {/* Delete all data */}
              <div className="p-4">
                <p className="text-sm" style={{ color: "#EF4444", fontWeight: 700 }}>Delete all household data</p>
                <p className="text-xs mt-0.5 mb-3" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                  Permanently deletes all chores, grocery lists, expenses, notes, and calendar events. Members stay in the household.
                </p>
                <button
                  type="button"
                  onClick={() => { setDeleteDataOpen(true); setDeleteDataStep2(false); setDeleteDataConfirm(""); }}
                  className="h-10 rounded-xl px-4 text-sm"
                  style={{ border: "1.5px solid #EF444430", borderBottom: "3px solid #EF444445", color: "#EF4444", fontWeight: 700 }}
                >
                  Delete all data
                </button>
              </div>

              {/* Delete household */}
              <div className="p-4" style={{ borderTop: "1px solid #EF444420" }}>
                <p className="text-sm" style={{ color: "#EF4444", fontWeight: 700 }}>Delete household</p>
                <p className="text-xs mt-0.5 mb-3" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                  Permanently deletes the household and removes all members. This cannot be undone.
                </p>
                <button
                  type="button"
                  onClick={() => { setDeleteHouseOpen(true); setDeleteHouseStep2(false); setDeleteHouseConfirm(""); }}
                  className="h-10 rounded-xl px-4 text-sm"
                  style={{ border: "1.5px solid #EF444430", borderBottom: "3px solid #EF444445", color: "#EF4444", fontWeight: 700 }}
                >
                  Delete household
                </button>
              </div>
            </div>
          </SettingsSection>
        )}
      </div>

      {/* ---- Modals -------------------------------------------------------- */}

      {/* Regenerate code confirm */}
      <AlertDialog open={regenConfirmOpen} onOpenChange={setRegenConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
              Generate new invite code?
            </AlertDialogTitle>
            <AlertDialogDescription style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}>
              The old code will stop working immediately. Anyone with the old code will not be able to join.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <button type="button" onClick={() => setRegenConfirmOpen(false)}
              className="flex h-11 flex-1 items-center justify-center rounded-xl text-sm"
              style={{ border: "1.5px solid var(--roost-border)", borderBottom: "3px solid var(--roost-border-bottom)", color: "var(--roost-text-primary)", fontWeight: 700 }}>
              Cancel
            </button>
            <motion.button type="button" whileTap={{ y: 1 }}
              onClick={regenerateCode} disabled={codeRegenerating}
              className="flex h-11 flex-1 items-center justify-center rounded-xl text-sm text-white disabled:opacity-60"
              style={{
                backgroundColor: "var(--roost-text-primary)",
                border: "1.5px solid var(--roost-border)",
                borderBottom: "3px solid rgba(0,0,0,0.2)",
                fontWeight: 800,
              }}>
              {codeRegenerating ? <RefreshCw className="size-4 animate-spin" /> : "Generate"}
            </motion.button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Transfer admin - member picker */}
      <AlertDialog open={transferOpen} onOpenChange={setTransferOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
              Transfer admin
            </AlertDialogTitle>
            <AlertDialogDescription style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}>
              Select a member to become the new admin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 my-2">
            {members.filter((m) => m.role !== "child" && m.userId !== sessionData?.user?.id).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setTransferTarget(m.userId)}
                className="flex w-full items-center gap-3 rounded-xl p-3"
                style={{
                  backgroundColor: transferTarget === m.userId ? "var(--roost-bg)" : "transparent",
                  border: transferTarget === m.userId ? "2px solid var(--roost-text-primary)" : "1.5px solid var(--roost-border)",
                  borderBottom: transferTarget === m.userId ? "3px solid var(--roost-border-bottom)" : "3px solid var(--roost-border-bottom)",
                }}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs text-white"
                  style={{ backgroundColor: m.avatarColor ?? "#6366f1", fontWeight: 700 }}>
                  {initials(m.name)}
                </div>
                <p className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>
                  {m.name}
                </p>
              </button>
            ))}
          </div>
          <AlertDialogFooter className="gap-2">
            <button type="button" onClick={() => { setTransferOpen(false); setTransferTarget(null); }}
              className="flex h-11 flex-1 items-center justify-center rounded-xl text-sm"
              style={{ border: "1.5px solid var(--roost-border)", borderBottom: "3px solid var(--roost-border-bottom)", color: "var(--roost-text-primary)", fontWeight: 700 }}>
              Cancel
            </button>
            <motion.button type="button" whileTap={{ y: 1 }}
              onClick={() => { if (transferTarget) { setTransferOpen(false); setTransferConfirmOpen(true); } }}
              disabled={!transferTarget}
              className="flex h-11 flex-1 items-center justify-center rounded-xl text-sm text-white disabled:opacity-50"
              style={{
                backgroundColor: "var(--roost-text-primary)",
                border: "1.5px solid var(--roost-border)",
                borderBottom: "3px solid rgba(0,0,0,0.2)",
                fontWeight: 800,
              }}>
              Next
            </motion.button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Transfer admin confirm */}
      <AlertDialog open={transferConfirmOpen} onOpenChange={setTransferConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
              Transfer admin to {members.find((m) => m.userId === transferTarget)?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}>
              They will become the new admin and control the subscription. You will become a member.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <button type="button" onClick={() => setTransferConfirmOpen(false)}
              className="flex h-11 flex-1 items-center justify-center rounded-xl text-sm"
              style={{ border: "1.5px solid var(--roost-border)", borderBottom: "3px solid var(--roost-border-bottom)", color: "var(--roost-text-primary)", fontWeight: 700 }}>
              Cancel
            </button>
            <motion.button type="button" whileTap={{ y: 1 }} onClick={handleTransfer}
              className="flex h-11 flex-1 items-center justify-center rounded-xl text-sm text-white"
              style={{
                backgroundColor: "var(--roost-text-primary)",
                border: "1.5px solid var(--roost-border)",
                borderBottom: "3px solid rgba(0,0,0,0.2)",
                fontWeight: 800,
              }}>
              Transfer
            </motion.button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete data - step 1 */}
      <AlertDialog open={deleteDataOpen && !deleteDataStep2} onOpenChange={(v) => { if (!v) { setDeleteDataOpen(false); setDeleteDataConfirm(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: "#EF4444", fontWeight: 800 }}>Delete all data?</AlertDialogTitle>
            <AlertDialogDescription style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}>
              This will permanently delete everything in your household. This cannot be undone. Type DELETE to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <input
            type="text"
            value={deleteDataConfirm}
            onChange={(e) => setDeleteDataConfirm(e.target.value)}
            placeholder="Type DELETE"
            className={inputClass}
            style={{ ...inputStyle, marginTop: "8px" }}
          />
          <AlertDialogFooter className="gap-2 mt-2">
            <button type="button" onClick={() => { setDeleteDataOpen(false); setDeleteDataConfirm(""); }}
              className="flex h-11 flex-1 items-center justify-center rounded-xl text-sm"
              style={{ border: "1.5px solid var(--roost-border)", borderBottom: "3px solid var(--roost-border-bottom)", color: "var(--roost-text-primary)", fontWeight: 700 }}>
              Cancel
            </button>
            <motion.button type="button" whileTap={{ y: 1 }}
              disabled={deleteDataConfirm !== "DELETE"}
              onClick={() => setDeleteDataStep2(true)}
              className="flex h-11 flex-1 items-center justify-center rounded-xl text-sm text-white disabled:opacity-50"
              style={{ backgroundColor: "#EF4444", border: "1.5px solid #C93B3B", borderBottom: "3px solid #A63030", fontWeight: 800 }}>
              Delete everything
            </motion.button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete data - step 2 */}
      <AlertDialog open={deleteDataStep2} onOpenChange={(v) => !v && setDeleteDataStep2(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: "#EF4444", fontWeight: 800 }}>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}>
              Last chance. Everything goes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 mt-2">
            <button type="button" onClick={() => { setDeleteDataStep2(false); setDeleteDataOpen(false); setDeleteDataConfirm(""); }}
              className="flex h-11 flex-1 items-center justify-center rounded-xl text-sm"
              style={{ border: "1.5px solid var(--roost-border)", borderBottom: "3px solid var(--roost-border-bottom)", color: "var(--roost-text-primary)", fontWeight: 700 }}>
              Cancel
            </button>
            <motion.button type="button" whileTap={{ y: 1 }}
              disabled={deletingData}
              onClick={handleDeleteData}
              className="flex h-11 flex-1 items-center justify-center rounded-xl text-sm text-white disabled:opacity-60"
              style={{ backgroundColor: "#EF4444", border: "1.5px solid #C93B3B", borderBottom: "3px solid #A63030", fontWeight: 800 }}>
              Yes, delete everything
            </motion.button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete household - step 1 */}
      <AlertDialog open={deleteHouseOpen && !deleteHouseStep2} onOpenChange={(v) => { if (!v) { setDeleteHouseOpen(false); setDeleteHouseConfirm(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: "#EF4444", fontWeight: 800 }}>Delete household?</AlertDialogTitle>
            <AlertDialogDescription style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}>
              This will permanently delete the household and remove all members. This cannot be undone. Type DELETE to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <input
            type="text"
            value={deleteHouseConfirm}
            onChange={(e) => setDeleteHouseConfirm(e.target.value)}
            placeholder="Type DELETE"
            className={inputClass}
            style={{ ...inputStyle, marginTop: "8px" }}
          />
          <AlertDialogFooter className="gap-2 mt-2">
            <button type="button" onClick={() => { setDeleteHouseOpen(false); setDeleteHouseConfirm(""); }}
              className="flex h-11 flex-1 items-center justify-center rounded-xl text-sm"
              style={{ border: "1.5px solid var(--roost-border)", borderBottom: "3px solid var(--roost-border-bottom)", color: "var(--roost-text-primary)", fontWeight: 700 }}>
              Cancel
            </button>
            <motion.button type="button" whileTap={{ y: 1 }}
              disabled={deleteHouseConfirm !== "DELETE"}
              onClick={() => setDeleteHouseStep2(true)}
              className="flex h-11 flex-1 items-center justify-center rounded-xl text-sm text-white disabled:opacity-50"
              style={{ backgroundColor: "#EF4444", border: "1.5px solid #C93B3B", borderBottom: "3px solid #A63030", fontWeight: 800 }}>
              Delete everything
            </motion.button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete household - step 2 */}
      <AlertDialog open={deleteHouseStep2} onOpenChange={(v) => !v && setDeleteHouseStep2(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: "#EF4444", fontWeight: 800 }}>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}>
              Last chance. The household and all its data will be gone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 mt-2">
            <button type="button" onClick={() => { setDeleteHouseStep2(false); setDeleteHouseOpen(false); setDeleteHouseConfirm(""); }}
              className="flex h-11 flex-1 items-center justify-center rounded-xl text-sm"
              style={{ border: "1.5px solid var(--roost-border)", borderBottom: "3px solid var(--roost-border-bottom)", color: "var(--roost-text-primary)", fontWeight: 700 }}>
              Cancel
            </button>
            <motion.button type="button" whileTap={{ y: 1 }}
              disabled={deletingHouse}
              onClick={handleDeleteHousehold}
              className="flex h-11 flex-1 items-center justify-center rounded-xl text-sm text-white disabled:opacity-60"
              style={{ backgroundColor: "#EF4444", border: "1.5px solid #C93B3B", borderBottom: "3px solid #A63030", fontWeight: 800 }}>
              Yes, delete household
            </motion.button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Member sheet */}
      <MemberSheet
        member={selectedMember}
        householdId={householdId}
        onClose={() => setSelectedMember(null)}
        onRefetch={refetchMembers}
      />

      {/* Upgrade prompt */}
      <Sheet open={!!upgradeCode} onOpenChange={(v) => !v && setUpgradeCode(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-8 pt-2" style={{ backgroundColor: "var(--roost-surface)" }}>
          <div className="mx-auto mb-4 h-1 w-10 rounded-full" style={{ backgroundColor: "#EF4444" }} />
          {upgradeCode && <UpgradePrompt code={upgradeCode} onDismiss={() => setUpgradeCode(null)} />}
        </SheetContent>
      </Sheet>
      </PageContainer>
    </motion.div>
  );
}
