"use client";

import { useState, useEffect, useCallback } from "react";
import { requestFcmToken } from "@/lib/firebase";
import { getUserDoc, saveFcmToken, removeFcmToken, updateUserDoc } from "@/lib/firestore";

export type NotificationStatus = "default" | "granted" | "denied" | "unsupported";

export function useNotifications(uid: string | null) {
  const [status, setStatus] = useState<NotificationStatus>("default");
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(false);

  // Leer permiso actual del navegador al montar
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setStatus("unsupported");
      return;
    }
    setStatus(Notification.permission as NotificationStatus);
  }, []);

  useEffect(() => {
    if (!uid) {
      setEnabled(false);
      return;
    }
    getUserDoc(uid)
      .then((doc) => setEnabled(Boolean(doc?.settings?.notificationsEnabled)))
      .catch(() => setEnabled(false));
  }, [uid]);

  const enable = useCallback(async (): Promise<boolean> => {
    if (!uid) return false;
    if (typeof window === "undefined" || !("Notification" in window)) return false;

    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      setStatus(permission as NotificationStatus);

      if (permission !== "granted") return false;

      const token = await requestFcmToken();
      if (!token) return false;

      await saveFcmToken(uid, token);
      await updateUserDoc(uid, { settings: { notificationsEnabled: true, theme: "dark" } });
      setEnabled(true);
      return true;
    } catch (err) {
      console.error("[useNotifications] Error habilitando:", err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [uid]);

  const disable = useCallback(async (): Promise<void> => {
    if (!uid) return;
    setLoading(true);
    try {
      await removeFcmToken(uid);
      await updateUserDoc(uid, { settings: { notificationsEnabled: false, theme: "dark" } });
      setEnabled(false);
    } catch (err) {
      console.error("[useNotifications] Error deshabilitando:", err);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  return { status, loading, enabled, enable, disable };
}
