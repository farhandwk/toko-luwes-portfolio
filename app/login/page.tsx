import { Suspense } from 'react';
import LoginForm from "@/components/LoginForm";
import { Loader2, KeyRound } from "lucide-react";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-sm space-y-4">
        
        {/* BUNGKUS DENGAN SUSPENSE */}
        <Suspense fallback={
            <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
        }>
            <LoginForm />
        </Suspense>

        {/* CREDIT */}
        <p className="text-center text-xs text-slate-500">
          &copy; {new Date().getFullYear()} POS Toko Luwes
        </p>

        {/* PANDUAN AKUN DEMO */}
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm text-xs text-slate-600 space-y-2">
          <div className="flex items-center gap-1.5 font-bold text-slate-800">
            <KeyRound className="h-3.5 w-3.5 text-blue-600 shrink-0" />
            <span>Akun Demo Aplikasi</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
            <div className="bg-slate-50 p-2 rounded border border-slate-100">
              <p className="font-semibold text-slate-700">Admin</p>
              <p className="text-slate-500 font-mono">User: admin@user.com</p>
              <p className="text-slate-500 font-mono">Pass: password123</p>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}