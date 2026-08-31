interface AlertProps {
  tone: "success" | "error" | "info";
  children: React.ReactNode;
}

const ICON: Record<AlertProps["tone"], string> = {
  success: "✓",
  error: "!",
  info: "i",
};

// Single place that decides how success/error/info messages look, so every
// page gives the same visual feedback for the same kind of event instead of
// each screen inventing its own banner.
export function Alert({ tone, children }: AlertProps) {
  return (
    <div className={`alert alert-${tone}`} role={tone === "error" ? "alert" : "status"}>
      <span className="alert-icon" aria-hidden="true">
        {ICON[tone]}
      </span>
      <span>{children}</span>
    </div>
  );
}
