"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, Save, Upload, Lock, Dices } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useUploadThing } from "@/lib/uploadthing";
import { authClient, useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Cropper from "react-easy-crop";
import { getCroppedImg } from "@/lib/crop-image";

const PRESET_AVATARS = [
  "https://api.dicebear.com/9.x/avataaars/svg?seed=Felix",
  "https://api.dicebear.com/9.x/avataaars/svg?seed=Aneka",
  "https://api.dicebear.com/9.x/avataaars/svg?seed=Molly",
  "https://api.dicebear.com/9.x/avataaars/svg?seed=Jude",
  "https://api.dicebear.com/9.x/avataaars/svg?seed=Leo",
  "https://api.dicebear.com/9.x/avataaars/svg?seed=Oliver",
  "https://api.dicebear.com/9.x/avataaars/svg?seed=Sophie",
  "https://api.dicebear.com/9.x/avataaars/svg?seed=Amaya",
  "https://api.dicebear.com/9.x/avataaars/svg?seed=Mimi",
  "https://api.dicebear.com/9.x/avataaars/svg?seed=Jack",
  "https://api.dicebear.com/9.x/avataaars/svg?seed=Luna",
  "https://api.dicebear.com/9.x/avataaars/svg?seed=Nova",
];

export function ProfileForm() {
  const { data: session } = useSession();
  const router = useRouter();
  const user = session?.user;

  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isSavingName, setIsSavingName] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Avatar state
  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);
  const [isCropDialogOpen, setIsCropDialogOpen] = useState(false);
  const [pendingAvatarUrl, setPendingAvatarUrl] = useState<string | null>(null);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [previewAvatarUrl, setPreviewAvatarUrl] = useState<string | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isCropping, setIsCropping] = useState(false);

  const { startUpload } = useUploadThing("imageUploader");

  useEffect(() => {
    if (user?.name) setName(user.name);
    if (user?.image) setPreviewAvatarUrl(user.image);
  }, [user?.name, user?.image]);

  const initials = user?.name ? user.name.substring(0, 2).toUpperCase() : "U";

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSavingName(true);
    try {
      // Upload avatar file first if pending
      let finalAvatarUrl = pendingAvatarUrl;
      if (pendingAvatarFile) {
        const res = await startUpload([pendingAvatarFile]);
        finalAvatarUrl = res?.[0]?.ufsUrl ?? res?.[0]?.url ?? null;
        if (!finalAvatarUrl) throw new Error("Failed to upload image");
      }

      const updates: any = {};
      if (name !== user?.name) updates.name = name;
      if (finalAvatarUrl && finalAvatarUrl !== user?.image)
        updates.image = finalAvatarUrl;

      if (Object.keys(updates).length === 0) {
        toast.info("No changes to save");
        return;
      }

      const { error } = await authClient.updateUser(updates);
      if (error) throw new Error(error.message);

      toast.success("Profile updated successfully");
      setPendingAvatarFile(null);
      setPendingAvatarUrl(null);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setIsSavingName(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    setIsSavingPassword(true);
    try {
      const { error } = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });
      if (error) throw new Error(error.message);
      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message || "Failed to change password");
    } finally {
      setIsSavingPassword(false);
    }
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const dataUrl = await readFile(file);
      setImageSrc(dataUrl);
      setIsAvatarDialogOpen(false);
      setIsCropDialogOpen(true);
    }
  };

  const onCropComplete = useCallback((_: any, croppedPixels: any) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleCropImage = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setIsCropping(true);
    try {
      const croppedFile = await getCroppedImg(imageSrc, croppedAreaPixels);
      if (!croppedFile) throw new Error("Failed to crop image");
      setPendingAvatarFile(croppedFile);
      setPendingAvatarUrl(null);
      setPreviewAvatarUrl(URL.createObjectURL(croppedFile));
      setIsCropDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Error cropping image");
    } finally {
      setIsCropping(false);
    }
  };

  const handleSelectPreset = (url: string) => {
    setPendingAvatarUrl(url);
    setPendingAvatarFile(null);
    setPreviewAvatarUrl(url);
    setIsAvatarDialogOpen(false);
  };

  const handleRandomizeAvatar = () => {
    const seed = Math.random().toString(36).substring(7);
    const url = `https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}`;
    setPendingAvatarUrl(url);
    setPendingAvatarFile(null);
    setPreviewAvatarUrl(url);
  };

  const hasProfileChanges =
    name !== user?.name || !!pendingAvatarFile || !!pendingAvatarUrl;

  if (!user) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto w-full">
      {/* Profile Information */}
      <div className="space-y-6 bg-background p-6 rounded-xl border border-border">
        <h2 className="text-lg font-medium text-foreground">
          Profile Information
        </h2>
        <form onSubmit={handleUpdateName} className="space-y-6">
          {/* Clickable avatar */}
          <div className="flex items-center gap-4">
            <div
              className="relative group cursor-pointer rounded-full shrink-0"
              onClick={() => setIsAvatarDialogOpen(true)}
              title="Change avatar"
            >
              <Avatar className="h-16 w-16 border border-border/70 bg-background group-hover:opacity-75 transition-opacity">
                <AvatarImage src={previewAvatarUrl || ""} alt={user.name} />
                <AvatarFallback className="text-xl">{initials}</AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                <Upload className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={user.email}
              disabled
              className="bg-muted/50"
            />
            <p className="text-xs text-muted-foreground">
              Your email address cannot be changed here.
            </p>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSavingName || !hasProfileChanges}>
              {isSavingName ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Profile
            </Button>
          </div>
        </form>
      </div>

      {/* Security */}
      <div className="space-y-6 bg-background p-6 rounded-xl border border-border">
        <div>
          <h2 className="text-lg font-medium text-foreground">Security</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Update your password to keep your account secure.
          </p>
        </div>
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={
                isSavingPassword ||
                !currentPassword ||
                !newPassword ||
                !confirmPassword
              }
            >
              {isSavingPassword ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Lock className="mr-2 h-4 w-4" />
              )}
              Update Password
            </Button>
          </div>
        </form>
      </div>

      {/* Avatar picker dialog */}
      <Dialog open={isAvatarDialogOpen} onOpenChange={setIsAvatarDialogOpen}>
        <DialogContent className="sm:max-w-sm p-0 gap-0 overflow-hidden">
          <Tabs defaultValue="select">
            <div className="px-4 pt-4 pb-0">
              <TabsList
                className="w-full mt-5"
                // className="w-full justify-start gap-1 bg-transparent p-0 border-b rounded-none h-auto"
              >
                <TabsTrigger
                  value="select"
                  // className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 pb-2 text-sm font-medium"
                >
                  Select avatar
                </TabsTrigger>
                <TabsTrigger
                  value="upload"
                  // className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 pb-2 text-sm font-medium"
                >
                  Upload
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="select" className="mt-0 p-4">
              <div className="grid grid-cols-6 gap-2">
                {PRESET_AVATARS.map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    className="aspect-square rounded-full overflow-hidden border-2 border-transparent hover:border-primary focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                    onClick={() => handleSelectPreset(url)}
                  >
                    <img
                      src={url}
                      alt={`Avatar ${i + 1}`}
                      className="w-full h-full object-cover bg-muted"
                    />
                  </button>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t flex justify-between items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRandomizeAvatar}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Dices className="w-4 h-4 mr-1.5" />
                  Random
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPendingAvatarUrl(null);
                    setPendingAvatarFile(null);
                    setPreviewAvatarUrl(null);
                    setIsAvatarDialogOpen(false);
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Remove
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="upload" className="mt-0 p-4">
              <label
                htmlFor="avatar-upload"
                className="flex flex-col items-center justify-center gap-3 py-10 border-2 border-dashed rounded-lg border-border/50 cursor-pointer hover:border-border/80 hover:bg-muted/30 transition-colors"
              >
                <Upload className="w-6 h-6 text-muted-foreground" />
                <div className="text-center">
                  <p className="text-sm font-medium">Click to upload</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    JPG, PNG, GIF — max 8MB
                  </p>
                </div>
              </label>
              <Input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onFileChange}
              />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Crop dialog */}
      <Dialog open={isCropDialogOpen} onOpenChange={setIsCropDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Crop image</DialogTitle>
          </DialogHeader>
          <div className="relative w-full h-75">
            {imageSrc && (
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            )}
          </div>
          <div className="pt-2">
            <Label className="text-xs text-muted-foreground">Zoom</Label>
            <Slider
              value={[zoom]}
              min={1}
              max={3}
              step={0.1}
              onValueChange={(val) => setZoom(val[0])}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCropDialogOpen(false)}
              disabled={isCropping}
            >
              Cancel
            </Button>
            <Button onClick={handleCropImage} disabled={isCropping}>
              {isCropping && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result as string));
    reader.readAsDataURL(file);
  });
}
