import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { IconLabel } from "@/components/IconLabel";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export function PushSettings() {
  const { t } = useTranslation();
  const supported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    typeof Notification === "undefined" ? "default" : Notification.permission,
  );
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me")
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled && typeof data.user?.notifyEnabled === "boolean") {
          setEnabled(data.user.notifyEnabled);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  async function enable() {
    setBusy(true);
    setMessage(null);
    try {
      const vapid = await fetch("/api/push/vapid").then((response) =>
        response.json(),
      );
      if (!vapid.publicKey) {
        throw new Error(t("push.notConfigured"));
      }
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);
      if (permissionResult !== "granted") {
        throw new Error(t("push.blocked"));
      }
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid.publicKey),
      });
      const payload = subscription.toJSON();
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: payload.endpoint,
          keys: payload.keys,
          platform: "web",
        }),
      });
      if (!response.ok) {
        throw new Error(t("push.saveFailed"));
      }
      await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notifyEnabled: true }),
      });
      setEnabled(true);
      setMessage(t("push.enabled"));
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : t("push.enableFailed"),
      );
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setMessage(null);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      await subscription?.unsubscribe();
      await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription?.endpoint }),
      });
      await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notifyEnabled: false }),
      });
      setEnabled(false);
      setMessage(t("push.disabled"));
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : t("push.disableFailed"),
      );
    } finally {
      setBusy(false);
    }
  }

  if (!supported) {
    return (
      <p className="text-sm text-[var(--muted)]">{t("push.unsupported")}</p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--muted)]">
        {t("push.permission", { permission })}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={enable}
          className="inline-flex cursor-pointer items-center rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <IconLabel icon={Bell} iconClassName="h-4 w-4">
            {busy
              ? t("push.working")
              : enabled
                ? t("push.reenable")
                : t("push.turnOn")}
          </IconLabel>
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={disable}
          className="inline-flex cursor-pointer items-center rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          <IconLabel icon={BellOff} iconClassName="h-4 w-4">
            {t("push.turnOff")}
          </IconLabel>
        </button>
      </div>
      {message ? <p className="text-sm text-[var(--ink)]">{message}</p> : null}
    </div>
  );
}
