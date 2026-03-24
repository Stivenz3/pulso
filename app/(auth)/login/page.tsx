"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import { loginWithEmail } from "@/lib/auth";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Completa todos los campos");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await loginWithEmail(email, password);
      // FirestoreProvider will pick up the auth state change automatically
      router.push("/");
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === "auth/user-not-found" || code === "auth/wrong-password" || code === "auth/invalid-credential") {
        setError("Correo o contraseña incorrectos");
      } else if (code === "auth/too-many-requests") {
        setError("Demasiados intentos. Espera un momento.");
      } else {
        setError("Error al iniciar sesión. Intenta de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#131317] flex flex-col items-center justify-center px-6">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-[#3832f6]/8 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-sm relative z-10"
      >
        {/* Logo + title */}
        <div className="flex flex-col items-center mb-10">
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.1 }}
            className="w-20 h-20 mb-5"
          >
            <Image src="/pulso.png" alt="Pulso" width={80} height={80} className="w-full h-full object-contain" priority />
          </motion.div>
          <h1 className="font-[Space_Grotesk] font-black italic text-3xl text-[#3832f6] tracking-tight">
            Pulso
          </h1>
          <p className="text-[#908fa3] text-sm mt-2 text-center">
            Retoma el control. Cada día cuenta.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {/* Email */}
          <motion.div
            animate={{ borderColor: focusedField === "email" ? "#3832f6" : "rgba(255,255,255,0.08)" }}
            className="flex items-center gap-3 bg-[#1f1f23] border rounded-2xl px-4 py-4"
          >
            <Mail size={18} className={focusedField === "email" ? "text-[#3832f6]" : "text-[#908fa3]"} strokeWidth={1.8} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocusedField("email")}
              onBlur={() => setFocusedField(null)}
              placeholder="tu@correo.com"
              autoComplete="email"
              className="flex-1 bg-transparent text-[#e4e1e7] text-sm placeholder:text-[#454557] outline-none font-[Manrope]"
            />
          </motion.div>

          {/* Password */}
          <motion.div
            animate={{ borderColor: focusedField === "password" ? "#3832f6" : "rgba(255,255,255,0.08)" }}
            className="flex items-center gap-3 bg-[#1f1f23] border rounded-2xl px-4 py-4"
          >
            <Lock size={18} className={focusedField === "password" ? "text-[#3832f6]" : "text-[#908fa3]"} strokeWidth={1.8} />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocusedField("password")}
              onBlur={() => setFocusedField(null)}
              placeholder="Contraseña"
              autoComplete="current-password"
              className="flex-1 bg-transparent text-[#e4e1e7] text-sm placeholder:text-[#454557] outline-none font-[Manrope]"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-[#908fa3]">
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </motion.div>

          {/* Error */}
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[#ffb4ab] text-xs text-center"
            >
              {error}
            </motion.p>
          )}

          <div className="flex justify-end">
            <button type="button" className="text-[#3832f6] text-xs font-bold uppercase tracking-wider">
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={loading}
            className="w-full bg-[#3832f6] text-white py-4 rounded-2xl font-[Space_Grotesk] font-bold text-base flex items-center justify-center gap-2 shadow-[0_8px_32px_rgba(56,50,246,0.35)] disabled:opacity-60"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <>Entrar a Pulso <ArrowRight size={18} /></>}
          </motion.button>
        </form>

        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-white/5" />
          <span className="text-[#454557] text-xs">o</span>
          <div className="flex-1 h-px bg-white/5" />
        </div>

        <p className="text-center text-sm text-[#908fa3]">
          ¿No tienes cuenta?{" "}
          <Link href="/register" className="text-[#c1c1ff] font-bold hover:text-white transition-colors">
            Crear cuenta
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
