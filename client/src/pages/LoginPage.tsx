import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { useLogin } from "@/hooks/useAuth";
import Icon from "@/components/ui/Icon";
import Spinner from "@/components/ui/Spinner";
import ThemeToggle from "@/components/ui/ThemeToggle";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await login.mutateAsync(values);
      navigate("/dashboard");
    } catch {
      // error surfaced via login.error below
    }
  });

  return (
    <div className="tb-auth-shell relative flex min-h-screen items-center justify-center px-4 py-10">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm animate-slide-up">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="tb-brand-mark mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl">
            <Icon name="layout" size={23} strokeWidth={2.25} />
          </span>
          <h1 className="tb-page-heading text-2xl font-semibold text-slate-900 dark:text-slate-100">Log in to TaskBoard</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Welcome back — let's get to work.</p>
        </div>

        <div className="tb-auth-panel rounded-2xl p-6 sm:p-8">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="tb-label">Email</label>
              <input type="email" autoComplete="email" {...register("email")} className="tb-input" />
              {errors.email && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.email.message}</p>}
            </div>
            <div>
              <label className="tb-label">Password</label>
              <input type="password" autoComplete="current-password" {...register("password")} className="tb-input" />
              {errors.password && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.password.message}</p>
              )}
            </div>
            {login.isError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-400">
                Invalid email or password.
              </p>
            )}
            <button type="submit" disabled={login.isPending} className="tb-btn-primary w-full">
              {login.isPending && <Spinner size={16} />}
              {login.isPending ? "Logging in..." : "Log in"}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-slate-600 dark:text-slate-400">
          Don&apos;t have an account?{" "}
          <Link to="/register" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
