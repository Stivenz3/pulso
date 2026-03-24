"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, User, ArrowRight, Loader2, Check } from "lucide-react";
import { registerWithEmail } from "@/lib/auth";
import Link from "next/link";

const passwordRequirements = [
  { label: "Mínimo 8 caracteres", test: (p: string) => p.length >= 8 },
  { label: "Al menos una mayúscula", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Al menos un número", test: (p: string) => /\d/.test(p) },
];

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showRequirements, setShowRequirements] = useState(false);

  const isPasswordValid = passwordRequirements.every((r) => r.test(password));

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError("Completa todos los campos");
      return;
    }
    if (!isPasswordValid) {
      setError("La contraseña no cumple los requisitos");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await registerWithEmail(name.trim(), email, password);
      // FirestoreProvider picks up auth state — navigate to app
      router.push("/");
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === "auth/email-already-in-use") {
        setError("Este correo ya tiene una cuenta. Inicia sesión.");
      } else if (code === "auth/weak-password") {
        setError("La contraseña es muy débil.");
      } else if (code === "auth/invalid-email") {
        setError("El correo no es válido.");
      } else {
        setError("Error al crear la cuenta. Intenta de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#131317] flex flex-col items-center justify-center px-6 py-12">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-[#3832f6]/8 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-sm relative z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.1 }}
            className="w-16 h-16 mb-4"
          >
            <Image src="/pulso.png" alt="Pulso" width={64} height={64} className="w-full h-full object-contain" priority />
          </motion.div>
          <h1 className="font-[Space_Grotesk] font-black italic text-2xl text-[#3832f6] tracking-tight">Pulso</h1>
          <h2 className="font-[Space_Grotesk] font-bold text-xl text-white mt-3">Crea tu cuenta</h2>
          <p className="text-[#908fa3] text-sm mt-1 text-center">Empieza tu camino hacia el control total</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          {/* Name */}
          <motion.div
            animate={{ borderColor: focusedField === "name" ? "#3832f6" : "rgba(255,255,255,0.08)" }}
            className="flex items-center gap-3 bg-[#1f1f23] border rounded-2xl px-4 py-4"
          >
            <User size={18} className={focusedField === "name" ? "text-[#3832f6]" : "text-[#908fa3]"} strokeWidth={1.8} />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onFocus={() => setFocusedField("name")}
              onBlur={() => setFocusedField(null)}
              placeholder="Tu nombre"
              autoComplete="name"
              className="flex-1 bg-transparent text-[#e4e1e7] text-sm placeholder:text-[#454557] outline-none font-[Manrope]"
            />
          </motion.div>

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
          <div className="space-y-2">
            <motion.div
              animate={{ borderColor: focusedField === "password" ? "#3832f6" : "rgba(255,255,255,0.08)" }}
              className="flex items-center gap-3 bg-[#1f1f23] border rounded-2xl px-4 py-4"
            >
              <Lock size={18} className={focusedField === "password" ? "text-[#3832f6]" : "text-[#908fa3]"} strokeWidth={1.8} />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setShowRequirements(true); }}
                onFocus={() => { setFocusedField("password"); setShowRequirements(true); }}
                onBlur={() => setFocusedField(null)}
                placeholder="Contraseña segura"
                autoComplete="new-password"
                className="flex-1 bg-transparent text-[#e4e1e7] text-sm placeholder:text-[#454557] outline-none font-[Manrope]"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-[#908fa3]">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </motion.div>

            {showRequirements && password.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="bg-[#1b1b1f] rounded-xl p-3 space-y-1.5 border border-white/5"
              >
                {passwordRequirements.map((req) => {
                  const met = req.test(password);
                  return (
                    <div key={req.label} className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center transition-colors ${met ? "bg-[#22c55e]" : "bg-[#353439]"}`}>
                        {met && <Check size={10} className="text-white" strokeWidth={3} />}
                      </div>
                      <span className={`text-[11px] ${met ? "text-[#22c55e]" : "text-[#908fa3]"}`}>{req.label}</span>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </div>

          {error && (
            <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="text-[#ffb4ab] text-xs text-center">
              {error}
            </motion.p>
          )}

          <motion.button
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={loading}
            className="w-full bg-[#3832f6] text-white py-4 rounded-2xl font-[Space_Grotesk] font-bold text-base flex items-center justify-center gap-2 shadow-[0_8px_32px_rgba(56,50,246,0.35)] disabled:opacity-60 mt-2"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <>Comenzar mi camino <ArrowRight size={18} /></>}
          </motion.button>
        </form>

        <p className="text-[#454557] text-[11px] text-center mt-4 leading-relaxed">
          Al crear tu cuenta aceptas nuestros{" "}
          <span className="text-[#908fa3]">Términos de uso</span> y{" "}
          <span className="text-[#908fa3]">Política de privacidad</span>
        </p>

        <div className="flex items-center gap-4 my-5">
          <div className="flex-1 h-px bg-white/5" />
          <span className="text-[#454557] text-xs">ya tengo cuenta</span>
          <div className="flex-1 h-px bg-white/5" />
        </div>

        <Link href="/login">
          <motion.div
            whileTap={{ scale: 0.97 }}
            className="w-full border border-[#3832f6]/30 text-[#c1c1ff] py-4 rounded-2xl font-[Space_Grotesk] font-bold text-base flex items-center justify-center hover:bg-[#3832f6]/5 transition-colors"
          >
            Iniciar sesión
          </motion.div>
        </Link>
      </motion.div>
    </div>
  );
}
