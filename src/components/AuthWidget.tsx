'use client';

import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import { LogIn, LogOut, User as UserIcon, Eye, EyeOff, X, Loader2 } from 'lucide-react';

interface Profile {
  id: string;
  username: string;
  email: string;
  avatar_url?: string | null;
}

export default function AuthWidget() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [identifier, setIdentifier] = useState(''); // Email o Username en Login
  const [username, setUsername] = useState(''); // Username en Registro
  const [email, setEmail] = useState(''); // Email en Registro
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDialogElement | null>(null);

  const fetchProfile = async (currentUser: User) => {
    const { data } = await supabase
      .from('profiles')
      .select('id, username, email, avatar_url')
      .eq('id', currentUser.id)
      .maybeSingle();

    if (data) {
      setProfile(data);
    } else {
      setProfile({
        id: currentUser.id,
        username:
          currentUser.user_metadata?.username ||
          currentUser.user_metadata?.full_name ||
          currentUser.email?.split('@')[0] ||
          'usuario',
        email: currentUser.email || '',
        avatar_url: currentUser.user_metadata?.avatar_url || null,
      });
    }
  };

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchProfile(currentUser);
      }
      setLoadingSession(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchProfile(currentUser);
        dialogRef.current?.close();
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Fallback de light-dismiss para navegadores que aún no soportan closedby="any"
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleBackdropClick = (event: MouseEvent) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const isDialogContent =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;

      if (!isDialogContent) {
        dialog.close();
      }
    };

    if (!('closedBy' in HTMLDialogElement.prototype)) {
      dialog.addEventListener('click', handleBackdropClick);
      return () => dialog.removeEventListener('click', handleBackdropClick);
    }
  }, []);

  const openModal = (initialMode: 'login' | 'register' = 'login') => {
    setMode(initialMode);
    setErrorMsg(null);
    setSuccessMsg(null);
    dialogRef.current?.showModal();
  };

  const closeModal = () => {
    dialogRef.current?.close();
  };

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setSubmitting(true);
    const redirectUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}${window.location.pathname}`
        : undefined;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
      },
    });
    if (error) {
      setErrorMsg(error.message);
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);

    try {
      if (mode === 'login') {
        let loginEmail = identifier.trim();

        // Si no tiene '@', asumimos que ingresó su username y buscamos su correo mediante RPC seguro
        if (!loginEmail.includes('@')) {
          const { data: resolvedEmail, error: rpcError } = await supabase.rpc(
            'get_email_by_username',
            { p_username: loginEmail }
          );

          if (rpcError || !resolvedEmail) {
            throw new Error('No se encontró ningún usuario con ese username.');
          }
          loginEmail = resolvedEmail;
        }

        const { error } = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password,
        });

        if (error) throw error;
        closeModal();
      } else {
        const cleanUsername = username.trim();
        const cleanEmail = email.trim();

        if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(cleanUsername)) {
          throw new Error(
            'El username debe tener entre 3 y 30 caracteres (solo letras, números, puntos, guiones o guion bajo).'
          );
        }

        // Verificar disponibilidad mediante RPC seguro sin exponer la tabla profiles
        const { data: isAvailable, error: availError } = await supabase.rpc(
          'check_username_available',
          { p_username: cleanUsername }
        );

        if (availError || !isAvailable) {
          throw new Error('Ese nombre de usuario ya está en uso. Elige otro.');
        }

        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              username: cleanUsername,
              full_name: cleanUsername,
            },
          },
        });

        if (error) throw error;

        if (data.session) {
          closeModal();
        } else {
          setSuccessMsg(
            '¡Cuenta creada! Revisa tu correo para confirmar tu cuenta (o inicia sesión si desactivaste confirmación por correo).'
          );
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ocurrió un error al autenticar.';
      setErrorMsg(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (loadingSession) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-mono text-neutral-400">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      </span>
    );
  }

  return (
    <>
      {user ? (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded border border-neutral-200 dark:border-neutral-800 bg-neutral-100/70 dark:bg-neutral-900/60">
            <UserIcon className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-xs font-mono text-neutral-800 dark:text-neutral-200">
              @{profile?.username || user.email?.split('@')[0]}
            </span>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center gap-1.5 text-xs font-mono text-neutral-500 hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer"
            title="Cerrar sesión"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => openModal('login')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 hover:border-neutral-900 dark:hover:border-neutral-200 text-neutral-800 dark:text-neutral-200 text-xs font-mono transition-colors cursor-pointer"
        >
          <LogIn className="w-3.5 h-3.5" />
          <span>Iniciar sesión</span>
        </button>
      )}

      <dialog
        ref={dialogRef}
        closedby="any"
        aria-labelledby="auth-dialog-title"
        className="m-auto w-full max-w-md rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 p-0 shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-xs"
      >
        <div className="p-6 space-y-6">
          <div className="flex items-start justify-between border-b border-neutral-200 dark:border-neutral-800 pb-4">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-widest text-neutral-500">
                Acceso al Portafolio
              </span>
              <h2
                id="auth-dialog-title"
                className="text-2xl font-serif-editorial font-medium mt-0.5"
              >
                {mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
              </h2>
            </div>
            <button
              type="button"
              onClick={closeModal}
              aria-label="Cerrar ventana"
              className="p-1 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Botón de Google OAuth */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-900 text-xs font-mono font-medium transition-colors cursor-pointer disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z"
              />
            </svg>
            <span>Continuar con Google</span>
          </button>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-neutral-200 dark:border-neutral-800 w-full" />
            <span className="bg-white dark:bg-neutral-950 px-3 text-[11px] font-mono uppercase text-neutral-400">
              o con tu cuenta
            </span>
            <div className="border-t border-neutral-200 dark:border-neutral-800 w-full" />
          </div>

          {/* Formulario Correo / Username + Contraseña */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'login' ? (
              <div className="space-y-1.5">
                <label
                  htmlFor="auth-identifier"
                  className="block text-xs font-mono text-neutral-600 dark:text-neutral-400"
                >
                  Correo electrónico o Username
                </label>
                <input
                  id="auth-identifier"
                  name="identifier"
                  type="text"
                  autoComplete="username"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="dylan o correo@ejemplo.com"
                  className="w-full px-3 py-2 text-sm rounded border border-neutral-300 dark:border-neutral-800 bg-transparent focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-200 font-mono"
                />
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <label
                    htmlFor="auth-username"
                    className="block text-xs font-mono text-neutral-600 dark:text-neutral-400"
                  >
                    Username
                  </label>
                  <input
                    id="auth-username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    required
                    minLength={3}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="dylan27"
                    className="w-full px-3 py-2 text-sm rounded border border-neutral-300 dark:border-neutral-800 bg-transparent focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-200 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="auth-email"
                    className="block text-xs font-mono text-neutral-600 dark:text-neutral-400"
                  >
                    Correo electrónico
                  </label>
                  <input
                    id="auth-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="correo@ejemplo.com"
                    className="w-full px-3 py-2 text-sm rounded border border-neutral-300 dark:border-neutral-800 bg-transparent focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-200 font-mono"
                  />
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="auth-password"
                className="block text-xs font-mono text-neutral-600 dark:text-neutral-400"
              >
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="auth-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 pr-10 text-sm rounded border border-neutral-300 dark:border-neutral-800 bg-transparent focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-200 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-pressed={showPassword}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {errorMsg && (
              <p className="text-xs font-mono text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded p-2.5">
                {errorMsg}
              </p>
            )}

            {successMsg && (
              <p className="text-xs font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded p-2.5">
                {successMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 rounded bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-neutral-100 dark:hover:bg-white dark:text-neutral-950 font-mono text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{mode === 'login' ? 'Entrar' : 'Registrarse'}</span>
            </button>
          </form>

          <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 text-center text-xs font-mono text-neutral-500">
            {mode === 'login' ? (
              <>
                ¿No tienes cuenta?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className="text-neutral-900 dark:text-neutral-100 underline underline-offset-4 cursor-pointer"
                >
                  Regístrate aquí
                </button>
              </>
            ) : (
              <>
                ¿Ya tienes cuenta?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className="text-neutral-900 dark:text-neutral-100 underline underline-offset-4 cursor-pointer"
                >
                  Inicia sesión
                </button>
              </>
            )}
          </div>
        </div>
      </dialog>
    </>
  );
}
