import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { useRegister } from "@/hooks/useAuth";
import Icon from "@/components/ui/Icon";
import Spinner from "@/components/ui/Spinner";
import ThemeToggle from "@/components/ui/ThemeToggle";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const registerUser = useRegister();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await registerUser.mutateAsync(values);
      navigate("/dashboard");
    } catch {
      // error surfaced via registerUser.error below
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
          <h1 className="tb-page-heading text-2xl font-semibold text-slate-900 dark:text-slate-100">Create your account</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Start organizing your work in minutes.</p>
        </div>

        <div className="tb-auth-panel rounded-2xl p-6 sm:p-8">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="tb-label">Name</label>
              <input autoComplete="name" {...register("name")} className="tb-input" />
              {errors.name && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.name.message}</p>}
            </div>
            <div>
              <label className="tb-label">Email</label>
              <input type="email" autoComplete="email" {...register("email")} className="tb-input" />
              {errors.email && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.email.message}</p>}
            </div>
            <div>
              <label className="tb-label">Password</label>
              <input type="password" autoComplete="new-password" {...register("password")} className="tb-input" />
              {errors.password && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.password.message}</p>
              )}
            </div>
            {registerUser.isError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-400">
                Could not create account. Try a different email.
              </p>
            )}
            <button type="submit" disabled={registerUser.isPending} className="tb-btn-primary w-full">
              {registerUser.isPending && <Spinner size={16} />}
              {registerUser.isPending ? "Creating account..." : "Create account"}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-slate-600 dark:text-slate-400">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
