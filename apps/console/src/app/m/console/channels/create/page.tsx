"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, LoaderCircle, Plus, X } from "lucide-react";
import { AppHeader } from "@/components/app-shell/AppHeader";
import { useAuth } from "@/components/auth/AuthProvider";
import { createChannel } from "@/lib/api";
import { readImageFile } from "@/lib/imageUpload";
import styles from "@/components/forms/CreationForm.module.css";
import { webAppHref } from "@/lib/webAppUrl";

// Same design as /channels/create — back goes to /m/console/channels (mobile console context).
export default function MobileConsoleCreateCommunityPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const submissionInFlight = useRef(false);
  const uploadVersion = useRef(0);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [logo, setLogo] = useState("");
  const [imageError, setImageError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [imageLoading, setImageLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Back goes to the mobile console communities tab — not the public /channels page.
  const backHref = "/m/console/channels";

  useEffect(() => () => { uploadVersion.current += 1; }, []);

  async function handleLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const version = ++uploadVersion.current;
    setImageError("");
    setImageLoading(false);
    setImageLoading(true);
    try {
      const result = await readImageFile(file);
      if (version === uploadVersion.current) setLogo(result);
    } catch (cause) {
      if (version === uploadVersion.current) {
        setImageError(cause instanceof Error ? cause.message : "The image couldn't be uploaded. Try another file.");
      }
    } finally {
      if (version === uploadVersion.current) setImageLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submissionInFlight.current) return;
    if (!user) {
      setSubmitError("Sign in before creating a community.");
      return;
    }
    if (!name.trim()) {
      setSubmitError("Enter a community name.");
      return;
    }
    submissionInFlight.current = true;
    setSaving(true);
    setSubmitError("");
    try {
      const community = await createChannel({
        name: name.trim(),
        description: description.trim(),
        owner_id: user.userId,
        owner_name: user.name || user.email,
        avatar_url: logo || undefined,
      });
      window.dispatchEvent(new Event("hackways_channels_updated"));
      router.push(`/m/console/channels`);
      // Suppress unused variable lint — community.id available if needed later.
      void community;
    } catch (cause) {
      setSubmitError(cause instanceof Error ? cause.message : "Your community couldn't be created. Please try again.");
      submissionInFlight.current = false;
      setSaving(false);
    }
  }

  return (
    <div className={styles.page}>
      <AppHeader eventNavigation />
      <main className={styles.main}>
        <Link className={styles.back} href={backHref}><ArrowLeft size={15} />Communities</Link>
        <header className={styles.heading}>
          <h1>Create a community</h1>
          <p>A home for your people and the events you host.</p>
        </header>

        <form onSubmit={handleSubmit} aria-label="Create a community" className={styles.form}>
          <fieldset disabled={saving || isLoading} className={styles.fields}>
            <legend className="sr-only">Community details</legend>
            <div className={styles.logoRow}>
              <button type="button" className={styles.logo} disabled={imageLoading} onClick={() => fileInput.current?.click()} aria-label={logo ? "Change community logo" : "Upload community logo"}>
                {imageLoading ? <LoaderCircle size={22} className={styles.spinner} /> : logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logo} alt="Community logo preview" />
                ) : <Plus size={24} strokeWidth={1.5} />}
              </button>
              <div className={styles.logoDetails}>
                <button type="button" className={styles.uploadLink} disabled={imageLoading} onClick={() => fileInput.current?.click()}>{logo ? "Change logo" : "Add a logo"}<span>Optional</span></button>
                <p>PNG, JPG, or WebP. Up to 2 MB.</p>
                {logo && <button type="button" className={styles.remove} onClick={() => { uploadVersion.current += 1; setLogo(""); setImageError(""); setImageLoading(false); }}><X size={12} />Remove</button>}
              </div>
              <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" tabIndex={-1} aria-label="Community logo file" onChange={handleLogo} />
            </div>
            {imageError && <p className={styles.error} role="alert">{imageError}</p>}

            <div className={styles.field}>
              <label htmlFor="community-name">Community name</label>
              <input id="community-name" name="name" autoComplete="organization" required maxLength={80}
                value={name} onChange={(event) => { setName(event.target.value); setSubmitError(""); }}
                placeholder="Community name" />
            </div>
            <div className={styles.field}>
              <label htmlFor="community-description">Description<span>Optional</span></label>
              <textarea id="community-description" name="description" rows={3} maxLength={500}
                value={description} onChange={(event) => setDescription(event.target.value)}
                placeholder="A little about who you are and what brings you together." />
            </div>
          </fieldset>

          {!isLoading && !user && <p className={styles.signIn}><Link href={webAppHref("/login?redirect=%2Fm%2Fconsole%2Fchannels%2Fcreate")}>Sign in</Link> to create your community.</p>}
          {submitError && <p className={styles.error} role="alert">{submitError}</p>}
          <div className={styles.actions}>
            <Link href={backHref} className={styles.cancel}>Cancel</Link>
            <button className={styles.submit} type="submit" disabled={saving || imageLoading || isLoading || !user || !name.trim()}>
              {saving ? <><LoaderCircle size={16} className={styles.spinner} />Creating...</> : <>Create community<ArrowRight size={16} /></>}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
